// supabase/functions/pdf-queue-worker/index.ts
// Worker: reads messages from queue_job_pdf, renders section partials, uploads, updates DB, and triggers merge.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import * as React from "npm:react@18.2.0";

import { renderSectionToBytes } from "../generate-booklet-pdf/PartialRenderer.tsx";
import { mergePdfBytes, addPageNumbers } from "../generate-booklet-pdf/merge.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const QUEUE_NAME = Deno.env.get("PDF_QUEUE_NAME") || "queue_job_pdf";
const BUCKET = Deno.env.get("PDF_BUCKET") || "travel-booklets";
const BATCH_N = Number(Deno.env.get("PDF_QUEUE_READ_N") || 2);
const VISIBILITY_SECONDS = Number(Deno.env.get("PDF_QUEUE_VT_SECONDS") || 180);

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("[worker] Missing Supabase env.");
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

interface QueueMessage {
  msg_id: bigint;
  read_ct: number;
  vt: string;
  enqueued_at: string;
  message: any;
}

async function deleteMessage(msgId: bigint) {
  // pgmq_public.delete signature expects (message_id, queue_name)
  // Also ensure we pass a JSON-serializable value (number or string), not BigInt
  const mid = typeof msgId === 'bigint' ? Number(msgId) : (msgId as any);
  const { error } = await supabase.schema("pgmq_public").rpc("delete", {
    queue_name: QUEUE_NAME,
    message_id: mid,
  });
  if (error) console.error(`[worker] delete failed for msg ${msgId}`, error);
  else console.log(`[worker] deleted msg ${msgId}`);
}

async function readMessages(): Promise<QueueMessage[]> {
  const { data, error } = await supabase
    .schema("pgmq_public")
    .rpc("read", { queue_name: QUEUE_NAME, sleep_seconds: VISIBILITY_SECONDS, n: BATCH_N });
  if (error) {
    console.error(`[worker] read error:`, error);
    return [];
  }
  return (data || []) as QueueMessage[];
}

async function getJsonFromStorage(path: string): Promise<any> {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error) throw error;
  const text = await data.text();
  return JSON.parse(text);
}

async function uploadBytes(path: string, bytes: Uint8Array, contentType: string) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, new Blob([bytes], { type: contentType }), { upsert: true, contentType });
  if (error) throw error;
}

async function getPublicUrl(path: string): Promise<string | null> {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}

async function allSectionsCompleted(jobId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("pdf_job_sections")
    .select("status")
    .eq("job_id", jobId);
  if (error) throw error;
  return (data || []).every((r: any) => r.status === "done");
}

async function processSection(msg: QueueMessage) {
  const m = msg.message || {};
  const { job_id, trip_id, data_path, section_key, section_index, step_index } = m;
  console.log(`[worker] section start job=${job_id} key=${section_key} idx=${section_index} step=${step_index}`);

  // Idempotency: if section row says done and partial exists, just delete message.
  const { data: secRows, error: secErr } = await supabase
    .from("pdf_job_sections")
    .select("status, partial_path")
    .eq("job_id", job_id)
    .eq("section_index", section_index)
    .limit(1)
    .maybeSingle();
  if (secErr) throw secErr;
  if (secRows?.status === "done" && secRows?.partial_path) {
    console.log(`[worker] section already done at ${secRows.partial_path}`);
    await deleteMessage(msg.msg_id);
    return;
  }

  // Load normalized data
  const data = await getJsonFromStorage(data_path);
  console.log(`[worker] data.json loaded (${data_path})`);

  // Render
  const bytes = await renderSectionToBytes(data, section_key, step_index);
  console.log(`[worker] rendered section bytes=${bytes.length}B`);

  // Upload partial
  const partialPath = `booklets/jobs/${job_id}/partials/${String(section_index).padStart(4, '0')}-${section_key}${typeof step_index === 'number' ? `-${step_index}` : ''}.pdf`;
  await uploadBytes(partialPath, bytes, "application/pdf");
  const publicUrl = await getPublicUrl(partialPath);
  console.log(`[worker] uploaded partial to ${partialPath} url=${publicUrl}`);

  // Update DB
  await supabase
    .from("pdf_job_sections")
    .update({ status: "done", partial_path: partialPath, partial_url: publicUrl || null })
    .eq("job_id", job_id)
    .eq("section_index", section_index);

  // Update job completed count based on DB
  const { count, error: countErr } = await supabase
    .from("pdf_job_sections")
    .select("id", { count: "exact", head: true })
    .eq("job_id", job_id)
    .eq("status", "done");
  if (countErr) {
    console.warn("[worker] unable to count done sections", countErr);
  } else {
    await supabase.from("pdf_jobs").update({ completed_sections: count ?? 0 }).eq("id", job_id);
  }

  // If all done, enqueue merge
  const finished = await allSectionsCompleted(job_id);
  if (finished) {
    console.log(`[worker] all sections done; enqueue merge`);
    const { error: sendErr } = await supabase
      .schema("pgmq_public")
      .rpc("send", { queue_name: QUEUE_NAME, message: { task_type: "merge", job_id, trip_id }, sleep_seconds: 0 });
    if (sendErr) console.error("[worker] failed to enqueue merge", sendErr);
  }

  // Delete message after success
  await deleteMessage(msg.msg_id);
}

async function listPartialPaths(jobId: string): Promise<string[]> {
  // Prefer DB ordering
  const { data, error } = await supabase
    .from("pdf_job_sections")
    .select("section_index, partial_path")
    .eq("job_id", jobId)
    .order("section_index", { ascending: true });
  if (error) throw error;
  const paths = (data || []).map((r: any) => r.partial_path).filter(Boolean);
  return paths;
}

async function downloadBytes(path: string): Promise<Uint8Array> {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error) throw error;
  const arrayBuf = await data.arrayBuffer();
  return new Uint8Array(arrayBuf);
}

async function processMerge(msg: QueueMessage) {
  const { job_id, trip_id } = msg.message || {};
  console.log(`[worker] merge start job=${job_id} trip=${trip_id}`);

  // Idempotency: if final exists and job completed, skip
  const finalPath = `booklets/${trip_id}.pdf`;
  const { data: job } = await supabase.from("pdf_jobs").select("status, final_pdf_url").eq("id", job_id).single();
  if (job?.status === "completed" && job?.final_pdf_url) {
    console.log(`[worker] final already available at ${job.final_pdf_url}`);
    await deleteMessage(msg.msg_id);
    return;
  }

  // Gather partials
  const paths = await listPartialPaths(job_id);
  if (!paths.length) throw new Error("No partials found to merge");
  console.log(`[worker] merging ${paths.length} partials`);
  const buffers: Uint8Array[] = [];
  for (const p of paths) {
    const b = await downloadBytes(p);
    buffers.push(b);
  }

  // Merge and add page numbers
  const merged = await mergePdfBytes(buffers);
  const numbered = await addPageNumbers(merged, {});
  console.log(`[worker] merged bytes=${numbered.length}B`);

  // Upload final
  await uploadBytes(finalPath, numbered, "application/pdf");
  const finalUrl = await getPublicUrl(finalPath);
  console.log(`[worker] uploaded final ${finalPath} url=${finalUrl}`);

  // Update job
  await supabase
    .from("pdf_jobs")
    .update({ status: "completed", final_pdf_url: finalUrl || null })
    .eq("id", job_id);

  // Delete message after success
  await deleteMessage(msg.msg_id);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });

  try {
    const start = Date.now();
    const timeBudgetMs = 50_000; // process up to ~50s
    let total = 0;

    while (Date.now() - start < timeBudgetMs) {
      const batch = await readMessages();
      if (!batch.length) {
        console.log(`[worker] no messages in ${QUEUE_NAME}`);
        break;
      }
      console.log(`[worker] processing ${batch.length} messages`);
      for (const msg of batch) {
        try {
          const payload = (msg as any).message || {};
          const type = payload.task_type;
          if (type === "section") await processSection(msg);
          else if (type === "merge") await processMerge(msg);
          else {
            console.warn("[worker] unknown task_type, deleting", type);
            await deleteMessage(msg.msg_id);
          }
          total++;
        } catch (e) {
          console.error("[worker] failed processing msg", (msg as any).msg_id, (e as any)?.message || e);
          // Do not delete: message will become visible after visibility timeout
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: total }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[worker] error:", err?.message || err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
