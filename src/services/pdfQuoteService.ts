import { supabase } from "@/integrations/supabase/client";

export async function generateQuotePdf(tripId: string): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    console.log("Generating PDF for trip:", tripId);
    
    // 1. Get the HTML content
    const element = document.getElementById('quote-content');
    if (!element) {
      throw new Error("Quote content not found");
    }

    // 2. Clone and clean (optional, but good practice to remove scripts/interactive elements if needed)
    // For now, we just take the outerHTML. The Edge Function parser should handle the extraction.
    // We might want to ensure all input values are captured in attributes if they aren't already.
    // Since we are using EditableText which renders as text or input, we need to make sure
    // the current *values* are what we send.
    
    // However, the Edge Function expects "structured HTML" with data-pdf-* attributes.
    // The React components should already be rendering these attributes based on the state.
    // So taking outerHTML should be sufficient IF the components are correctly tagged.
    
    const htmlContent = element.outerHTML;

    // 3. Call Edge Function
    const { data, error } = await supabase.functions.invoke('generate-quote-pdf', {
      body: {
        tripId,
        html: htmlContent
      }
    });

    if (error) {
      console.error("Edge Function Error (Invoke):", error);
      throw error;
    }

    console.log("Edge Function Response Data:", data);

    if (!data.success) {
      throw new Error(data.error || "Unknown error during PDF generation");
    }

    // The Edge Function returns { success: true, url: "..." }
    // We map it to our return type
    return { success: true, url: data.url };

  } catch (error: any) {
    console.error("PDF Generation Failed (Service):", error);
    return { success: false, error: error.message };
  }
}
