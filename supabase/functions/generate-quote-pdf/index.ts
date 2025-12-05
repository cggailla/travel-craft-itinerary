// supabase/functions/generate-quote-pdf/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import * as React from "npm:react@18.2.0";
import ReactPDF from "npm:@react-pdf/renderer@3.4.3";

// Import local modules
import { extractFromHtml } from "./extract.ts";
import QuoteDocument from "./QuoteDocument.tsx";

// Polyfill for process (needed by some react-pdf dependencies)
if (!globalThis.process) {
  // @ts-ignore
  globalThis.process = { env: {}, cwd: () => "" };
}

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
// 🚀 Serve Function
// ===================================================
serve(async (req) => {
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

    console.log(`🧾 Starting Quote PDF generation for trip: ${tripId}`);

    // 1. Extract Data from HTML
    console.log("🔍 Extracting data from HTML...");
    const quoteData = extractFromHtml(html);
    console.log("✅ Data extracted:", JSON.stringify(quoteData, null, 2));

    // 2. Render PDF to Stream
    console.log("🎨 Rendering PDF...");
    const stream = await ReactPDF.renderToStream(
      React.createElement(QuoteDocument, { data: quoteData })
    );

    // 3. Convert Stream to Uint8Array (Buffer)
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const pdfBuffer = new Uint8Array(
      chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    );
    let offset = 0;
    for (const chunk of chunks) {
      pdfBuffer.set(chunk, offset);
      offset += chunk.length;
    }
    console.log(`📦 PDF Generated. Size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);

    // 4. Upload to Supabase Storage
    const fileName = `quotes/${tripId}_${Date.now()}.pdf`;
    console.log(`cloud_upload Uploading to ${fileName}...`);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("travel-booklets") // Using the same bucket for now
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("❌ Upload Error:", uploadError);
      throw uploadError;
    }

    // 5. Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from("travel-booklets")
      .getPublicUrl(fileName);

    console.log("✅ PDF URL:", publicUrl);

    // 6. Return Success
    return new Response(
      JSON.stringify({ success: true, pdf_url: publicUrl }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("❌ Fatal Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
