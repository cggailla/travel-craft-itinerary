// supabase/functions/pdf-coordinator/index.ts
// Coordinator: receives html + tripId, extracts once, persists JSON, creates DB job and section rows,
// enqueues one message per section to Supabase Queues (pgmq_public).

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import * as React from "npm:react@18.2.0"; // keep react available if needed in future

import { extractFromHtml } from "../generate-booklet-pdf/extract.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const QUEUE_NAME = Deno.env.get("PDF_QUEUE_NAME") || "queue_job_pdf";
const BUCKET = Deno.env.get("PDF_BUCKET") || "travel-booklets";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("[coordinator] Missing Supabase env.");
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SectionTask = {
  section_key: string; // 'cover'|'step'|'thank_you'|'general_info'|'emergency'|'notes'
  section_index: number;
  step_index?: number;
};

function buildSectionPlan(data: any): SectionTask[] {
  const plan: SectionTask[] = [];
  let idx = 0;
  plan.push({ section_key: "cover", section_index: idx++ });

  const steps: any[] = Array.isArray(data?.itinerary) ? data.itinerary : [];
  for (let i = 0; i < steps.length; i++) {
    plan.push({ section_key: "step", section_index: idx++, step_index: i });
  }

  // Maintain current document order: Itinerary, Thank You, General Info, Emergency, Notes
  plan.push({ section_key: "thank_you", section_index: idx++ });
  plan.push({ section_key: "general_info", section_index: idx++ });
  plan.push({ section_key: "emergency", section_index: idx++ });
  plan.push({ section_key: "notes", section_index: idx++ });

  return plan;
}

async function persistDataJson(jobId: string, data: any) {
  const jsonBytes = new TextEncoder().encode(JSON.stringify(data));
  const path = `booklets/jobs/${jobId}/data.json`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, new Blob([jsonBytes], { type: "application/json" }), {
      upsert: true,
      contentType: "application/json",
    });
  if (error) throw error;
  return path;
}

async function enqueue(task: any) {
  // Using pgmq_public wrapper exposed by Supabase
  const { data, error } = await supabase
    .schema("pgmq_public")
    .rpc("send", {
      queue_name: QUEUE_NAME,
      message: task,
      sleep_seconds: 0,
    });
  if (error) throw error;
  return data;
}

serve(async (req) => {
  const start = performance.now();
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { html, tripId } = body || {};
    if (!html || !tripId) {
      console.warn("[coordinator] Missing html or tripId");
      return new Response(
        JSON.stringify({ success: false, error: "Missing html or tripId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[coordinator] Start for tripId=${tripId}`);

    // Extract once
    console.log("[coordinator] Extracting data from HTML...");
    const data = extractFromHtml(String(html));
    console.log("[coordinator] Extract done. sections=computing...");

    // Build section plan
    const plan = buildSectionPlan(data);
    console.log(`[coordinator] Plan size=${plan.length}`);

    // Create DB job
    const { data: jobRow, error: jobErr } = await supabase
      .from("pdf_jobs")
      .insert({ trip_id: tripId, status: "pending", total_sections: plan.length, completed_sections: 0, mode: "chunked" })
      .select("id")
      .single();
    if (jobErr) throw jobErr;
    const jobId: string = jobRow.id;
    console.log(`[coordinator] Job created id=${jobId}`);

    // Persist JSON to storage
    const dataPath = await persistDataJson(jobId, data);
    console.log(`[coordinator] data.json stored at ${dataPath}`);

    // Update job with data_path
    await supabase.from("pdf_jobs").update({ data_path: dataPath, status: "running" }).eq("id", jobId);

    // Create section rows
    const sectionRows = plan.map((t) => ({
      job_id: jobId,
      section_index: t.section_index,
      section_key: t.section_key,
      step_index: t.step_index ?? null,
      status: "pending",
    }));
    const { error: secErr } = await supabase.from("pdf_job_sections").insert(sectionRows);
    if (secErr) throw secErr;
    console.log(`[coordinator] Inserted ${sectionRows.length} section rows`);

    // Enqueue tasks
    let sent = 0;
    for (const t of plan) {
      const message = {
        task_type: "section",
        job_id: jobId,
        trip_id: tripId,
        data_path: dataPath,
        section_key: t.section_key,
        section_index: t.section_index,
        step_index: t.step_index ?? null,
        attempts: 0,
        created_at: new Date().toISOString(),
      };
      try {
        await enqueue(message);
        sent++;
      } catch (e) {
        console.error("[coordinator] enqueue failed", e);
        // do not fail entire request; worker can be re-invoked and job remains
      }
    }
    console.log(`[coordinator] Enqueued ${sent}/${plan.length} tasks in ${QUEUE_NAME}`);

    // Optional: trigger the worker once to start processing without waiting for Cron
    try {
      const workerUrl = `${SUPABASE_URL}/functions/v1/pdf-queue-worker`;
      console.log(`[coordinator] Triggering worker at ${workerUrl}`);
      const res = await fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'kickoff', job_id: jobId }),
      });
      console.log(`[coordinator] Worker trigger status=${res.status}`);
    } catch (kickErr) {
      console.warn('[coordinator] Worker trigger failed (will rely on Cron):', (kickErr as any)?.message || kickErr);
    }

    const elapsed = ((performance.now() - start) / 1000).toFixed(2);
    return new Response(
      JSON.stringify({ success: true, job_id: jobId, total_sections: plan.length, enqueued: sent, elapsed_s: Number(elapsed) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[coordinator] Error:", err?.message || err);
    return new Response(JSON.stringify({ success: false, error: err?.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
