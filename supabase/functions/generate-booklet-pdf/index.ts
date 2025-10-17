import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import * as React from "npm:react@18.2.0";
import ReactPDF from "npm:@react-pdf/renderer@3.4.3";

import { extractFromHtml } from "./extract.ts";
import BookletDocument from "./BookletDocument.tsx";

// ===============================================
// ⚙️ Configuration Supabase
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
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
};

// ===================================================
// 🧠 Préchargement des images (base64)
// ===================================================
async function fetchAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = await res.arrayBuffer();
    // Deno-compatible base64 conversion
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(
        null,
        bytes.subarray(i, i + chunkSize) as any
      );
    }
    return `data:image/jpeg;base64,${btoa(binary)}`;
  } catch (err) {
    console.error(`💥 Image fetch error: ${url}`, err);
    return null;
  }
}


async function resolveImages(obj: any) {
  if (!obj) return;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) await resolveImages(obj[i]);
  } else if (typeof obj === "object") {
    for (const key of Object.keys(obj)) {
      if (key === "images" && Array.isArray(obj[key])) {
        const resolved = await Promise.all(
          obj[key].map(async (src: string) => {
            if (src.startsWith("https://jjlhsikgczigvtdzfroa.supabase.co/"))
              return (await fetchAsBase64(src)) || src;
            return src;
          })
        );
        obj[key] = resolved;
      } else {
        await resolveImages(obj[key]);
      }
    }
  }
}

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

    console.log(`🧾 Starting PDF generation for trip: ${tripId}`);

    // === Analyse du HTML pour <img> et <date> ===
    try {
      const htmlStr = String(html);
      const lower = htmlStr.toLowerCase();

      // Images
      const imgOccurrences: string[] = [];
      let idx = 0;
      while ((idx = lower.indexOf("<img", idx)) !== -1) {
        imgOccurrences.push(htmlStr.slice(idx, idx + 200));
        idx += 4;
      }

      // Dates
      const hasStartDateAttr = lower.includes("data-pdf-cover-start-date");
      const hasEndDateAttr = lower.includes("data-pdf-cover-end-date");

      console.log(`🔎 Found ${imgOccurrences.length} <img> tags in HTML`);
      console.log(
        `📅 HTML contains start-date attribute: ${hasStartDateAttr}, end-date: ${hasEndDateAttr}`
      );

      if (hasStartDateAttr) {
        const match = htmlStr.match(/data-pdf-cover-start-date[^>]+/i);
        if (match) console.log("🧩 start-date snippet:", match[0].slice(0, 200));
      }
      if (hasEndDateAttr) {
        const match = htmlStr.match(/data-pdf-cover-end-date[^>]+/i);
        if (match) console.log("🧩 end-date snippet:", match[0].slice(0, 200));
      }
    } catch (domErr) {
      console.warn("⚠️ Could not inspect HTML:", domErr);
    }

    // === Extraction du HTML ===
    console.log("🔍 Extracting data from HTML...");
    let data;
    try {
      data = extractFromHtml(html);
      console.log(
        "✅ extractFromHtml returned:",
        JSON.stringify(data?.cover || {}, null, 2)
      );
    } catch (e) {
      console.error("❌ HTML extraction failed:", e);
      return new Response(
        JSON.stringify({ success: false, error: "HTML extraction failed" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // === Diagnostic cover dates ===
    console.log("📅 Cover date diagnostics:");
    console.log("   startDate:", data?.cover?.startDate);
    console.log("   endDate:", data?.cover?.endDate);
    console.log("   start:", data?.cover?.start);
    console.log("   end:", data?.cover?.end);
    console.log("   keys in cover:", Object.keys(data?.cover || {}));

    // === Image logging ===
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

    // === Base64 conversion ===
    console.log("🧩 Converting Supabase images to base64...");
    await resolveImages(data);
    console.log("✅ Image conversion complete");

    // === PDF rendering ===
    console.log("🖨️ Rendering PDF with ReactPDF...");
    console.log("📦 Cover object before rendering:", JSON.stringify(data.cover, null, 2));

    const doc = React.createElement(BookletDocument, { data });
    const tmpFile = `/tmp/booklet-${crypto.randomUUID()}.pdf`;

    await ReactPDF.renderToFile(doc, tmpFile);
    const pdfBytes = await Deno.readFile(tmpFile);
    console.log("✅ PDF rendered successfully");

    // === Upload dans Supabase ===
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

    const { data: publicUrlData } = supabase.storage
      .from("travel-booklets")
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData?.publicUrl;
    if (!publicUrl) throw new Error("Failed to get public URL from storage");

    console.log("✅ PDF available at:", publicUrl);

    return new Response(
      JSON.stringify({ success: true, pdf_url: publicUrl }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("💥 Error in generate-booklet-pdf:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
