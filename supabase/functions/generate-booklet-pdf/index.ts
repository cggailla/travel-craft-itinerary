// supabase/functions/generate-booklet-pdf/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import * as React from "npm:react@18.2.0";
import ReactPDF from "npm:@react-pdf/renderer@3.4.3";

// Ensure these paths are correct relative to your index.ts file
// (e.g., if in '_common', use '../_common/extract.ts')
import { extractFromHtml } from "./extract.ts";
import BookletDocument from "./BookletTemplate.tsx";

// ===============================================
// ⚙️ Supabase Configuration
// ===============================================
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase environment variables");
  throw new Error("Missing SUPABASE_URL or SERVICE_ROLE_KEY");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ===================================================
// 📊 Metrics Helper
// ===================================================
/**
 * Logs memory and execution time at a specific stage.
 * @param stage - The name of the stage (e.g., "After HTML Extract").
 * @param startTime - The timestamp from performance.now() at the start.
 */
function logMetrics(stage: string, startTime: number) {
  try {
    // Deno.memoryUsage() provides detailed memory stats
    const mem = Deno.memoryUsage();
    const timeSeconds = (performance.now() - startTime) / 1000;
    
    // RSS (Resident Set Size) is the key metric: total memory allocated by the OS
    console.log(
      `[Metrics] Stage: ${stage} | Time: ${timeSeconds.toFixed(2)}s | Mem (RSS): ${(
        mem.rss /
        1024 /
        1024
      ).toFixed(2)} MB | Mem (Heap): ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    );
  } catch (e) {
    console.warn(`[Metrics] Failed to get metrics at stage ${stage}: ${e.message}`);
  }
}

// ===================================================
// 🚀 Serve Function
// ===================================================
serve(async (req) => {
  // 1. Start monitoring
  const startTime = performance.now();
  logMetrics("Init", startTime);

  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const { html, tripId } = await req.json().catch(() => ({}));
    if (!html || !tripId) {
      console.warn("❌ Missing html or tripId in request body");
      return new Response(
        JSON.stringify({ success: false, error: "Missing html or tripId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`🧾 Starting PDF generation for trip: ${tripId}`);

    // === HTML Inspection (Debug) ===
    try {
      const htmlStr = String(html);
      console.log(
        `🔎 Found ${
          (htmlStr.match(/<img/g) || []).length
        } <img> tags in HTML`
      );
    } catch (domErr) {
      console.warn("⚠️ Could not inspect HTML:", domErr);
    }

    // === HTML Extraction ===
    console.log("🔍 Extracting data from HTML...");
    let data;
    data = extractFromHtml(html);
    // 2. Metric after parsing
    logMetrics("After HTML Extract", startTime);

    // === Diagnostics (Debug) ===
    try {
      const totalCoverImages = data?.cover?.images?.length || 0;
      const stepImageCount = (data?.itinerary || []).reduce(
        (acc: number, s: any) => acc + (s?.images?.length || 0),
        0
      );
      console.log(
        `🖼️ [Diagnostics] Cover images: ${totalCoverImages}, Step images: ${stepImageCount}`
      );
    } catch (err) {
      console.warn("⚠️ Could not log image stats:", err);
    }
    
    // === [REMOVED] Base64 Conversion ===
    // The `resolveImages` call has been entirely removed.

    // === PDF Rendering ===
    console.log("🖨️ Rendering PDF with ReactPDF (using direct URLs)...");

    const doc = React.createElement(BookletDocument, { data });
    const tmpFile = `/tmp/booklet-${crypto.randomUUID()}.pdf`;

    // This is the heaviest step: rendering and fetching images via network
    await ReactPDF.renderToFile(doc, tmpFile);
    const pdfBytes = await Deno.readFile(tmpFile);
    await Deno.remove(tmpFile); // Cleanup temp file

    // 3. Metric after render (most critical)
    const fileSizeMB = (pdfBytes.length / 1024 / 1024).toFixed(2);
    console.log(`[Metrics] Final PDF Size: ${fileSizeMB} MB`);
    logMetrics("After PDF Render", startTime);

    // === Supabase Upload ===
    console.log("📦 Uploading to Supabase Storage...");
    const fileName = `booklets/${tripId}.pdf`;
    const fileBlob = new Blob([pdfBytes], { type: "application/pdf" });

    const { error: uploadError } = await supabase.storage
      .from("travel-booklets")
      .upload(fileName, fileBlob, {
        upsert: true,
        contentType: "application/pdf",
      });

    if (uploadError) {
      console.error("❌ Upload failed:", uploadError);
      throw new Error(uploadError.message);
    }

    // 4. Metric after upload
    logMetrics("After Upload", startTime);

    const { data: publicUrlData } = supabase.storage
      .from("travel-booklets")
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData?.publicUrl;
    if (!publicUrl) throw new Error("Failed to get public URL from storage");

    console.log("✅ PDF available at:", publicUrl);

    // Update trip with PDF URL and generation timestamp
    const { error: updateError } = await supabase
      .from("trips")
      .update({
        last_pdf_url: publicUrl,
        last_pdf_generated_at: new Date().toISOString(),
      })
      .eq("id", tripId);

    if (updateError) {
      console.error("⚠️ Failed to update trip with PDF info:", updateError);
      // Non-blocking error, continue anyway
    } else {
      console.log("✅ Trip updated with PDF info");
    }

    // 5. Final metric
    logMetrics("Complete", startTime);

    return new Response(
      JSON.stringify({ success: true, pdf_url: publicUrl }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("💥 Error in generate-booklet-pdf:", err);
    logMetrics("Error", startTime); // Log metrics on failure
    return new Response(
      JSON.stringify({ success: false, error: err.message || String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

