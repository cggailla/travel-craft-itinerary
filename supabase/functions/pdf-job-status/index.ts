// supabase/functions/pdf-job-status/index.ts
// Returns job + sections status and, when completed, final url.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error("Missing Supabase env");
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  try {
    const url = new URL(req.url);
    console.log(`[job-status] method=${req.method} url=${url.toString()}`);
    let jobId = url.searchParams.get("jobId");
    if (!jobId && req.method === 'POST') {
      let raw = '';
      try { raw = await req.text(); } catch (_) {}
      console.log(`[job-status] raw body length=${raw?.length ?? 0}`);
      if (raw) {
        try {
          const obj = JSON.parse(raw);
          jobId = obj?.jobId || obj?.job_id || null;
        } catch (e) {
          console.warn('[job-status] failed to parse JSON body');
        }
      }
    }
    if (!jobId) {
      return new Response(JSON.stringify({ success: false, error: "Missing jobId" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    console.log(`[job-status] jobId=${jobId}`);
    const { data: job, error: jobErr } = await supabase.from("pdf_jobs").select("*").eq("id", jobId).single();
    if (jobErr) throw jobErr;

    const { data: sections, error: secErr } = await supabase
      .from("pdf_job_sections")
      .select("section_index, section_key, step_index, status, attempts, partial_url, partial_path")
      .eq("job_id", jobId)
      .order("section_index", { ascending: true });
    if (secErr) throw secErr;

    return new Response(JSON.stringify({ success: true, job, sections }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[job-status] error", e?.message || e);
    return new Response(JSON.stringify({ success: false, error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
