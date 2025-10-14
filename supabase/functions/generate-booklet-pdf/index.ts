import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import * as React from "npm:react@18.2.0";
import ReactPDF from "npm:@react-pdf/renderer@3.4.3";

// === Modules internes ===
import { extractFromHtml } from "./extract.ts";
import BookletDocument from "./BookletDocument.tsx";

// ===============================================
// ⚙️ Configuration Supabase & Sécurité
// ===============================================
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase environment variables");
  throw new Error("Missing SUPABASE_URL or SERVICE_ROLE_KEY");
}

// Client Supabase (rôle service = bypass RLS)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ===============================================
// ⚙️ CORS
// ===============================================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
};

// ===============================================
// 🚀 Fonction principale
// ===============================================
serve(async (req) => {
  // 1️⃣ CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    // 2️⃣ Lecture du body
    const { html, tripId } = await req.json().catch(() => ({}));

    if (!html || !tripId) {
      console.warn("❌ Missing html or tripId in request body");
      return new Response(
        JSON.stringify({ success: false, error: "Missing html or tripId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🧾 Starting PDF generation for trip: ${tripId}`);

    // 3️⃣ Extraction du HTML
    console.log("🔍 Extracting data from HTML...");
    let data;
    try {
      data = extractFromHtml(html);
    } catch (e) {
      console.error("❌ HTML extraction failed:", e);
      return new Response(
        JSON.stringify({ success: false, error: "HTML extraction failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4️⃣ Génération du PDF via fichier temporaire (Deno compatible)
    console.log("🖨️ Generating PDF with ReactPDF...");
    const doc = React.createElement(BookletDocument, { data });
    const tmpFile = `/tmp/booklet-${crypto.randomUUID()}.pdf`;

    await ReactPDF.renderToFile(doc, tmpFile);
    const pdfBytes = await Deno.readFile(tmpFile);
    console.log("✅ PDF rendered successfully");

    // 5️⃣ Upload dans Supabase Storage
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

    // 6️⃣ Récupération de l’URL publique
    const { data: publicUrlData } = supabase.storage
      .from("travel-booklets")
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData?.publicUrl;
    if (!publicUrl) throw new Error("Failed to get public URL from storage");

    console.log("✅ PDF available at:", publicUrl);

    // 7️⃣ Réponse finale
    return new Response(
      JSON.stringify({ success: true, pdf_url: publicUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("💥 Error in generate-booklet-pdf:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
