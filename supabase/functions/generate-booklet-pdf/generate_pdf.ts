// ✅ Version Deno-compatible du générateur PDF

import * as React from "npm:react@18.2.0";
import ReactPDF from "npm:@react-pdf/renderer@3.4.3";
import BookletDocument from "./BookletDocument.tsx";

/**
 * Génère un PDF directement en mémoire (Uint8Array)
 * @param data Données du carnet de voyage
 * @returns Uint8Array représentant le PDF
 */
export async function generatePdfBuffer(data: any): Promise<Uint8Array> {
  console.log("📄 Génération du PDF en mémoire...");

  // Crée le composant React PDF
  const doc = React.createElement(BookletDocument, { data });

  try {
    // ✅ API moderne : renderToBuffer (supportée par ReactPDF 3.x)
    const buffer = await ReactPDF.renderToBuffer(doc);
    console.log("✅ PDF rendu en mémoire (ReactPDF.renderToBuffer)");
    return buffer;
  } catch (err) {
    console.error("❌ Erreur de génération PDF:", err);
    throw new Error(`PDF rendering failed: ${err.message || err}`);
  }
}

/**
 * Variante pour sauvegarder le PDF sur Supabase Storage
 * (renvoie l’URL publique après upload)
 */
export async function uploadPdfToStorage(
  supabase: any,
  tripId: string,
  data: any
) {
  console.log("📦 Upload du PDF vers Supabase Storage...");

  const pdfBuffer = await generatePdfBuffer(data);
  const fileName = `booklets/${tripId}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("travel-booklets")
    .upload(fileName, new Blob([pdfBuffer], { type: "application/pdf" }), {
      upsert: true,
      contentType: "application/pdf",
    });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage
    .from("travel-booklets")
    .getPublicUrl(fileName);

  return publicUrlData?.publicUrl;
}
