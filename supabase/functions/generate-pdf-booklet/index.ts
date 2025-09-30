import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tripId } = await req.json();

    if (!tripId) {
      throw new Error("Trip ID is required");
    }

    console.log(`Generating PDF for trip ${tripId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // Set viewport for A4 format
    await page.setViewport({
      width: 794,  // A4 width in pixels at 96 DPI
      height: 1123, // A4 height in pixels at 96 DPI
    });

    // Navigate to the preview page
    const previewUrl = `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/preview-pdf/${tripId}`;
    console.log(`Loading preview page: ${previewUrl}`);

    await page.goto(previewUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    // Wait for images to load
    await page.waitForFunction(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.every(img => img.complete);
    }, { timeout: 30000 });

    // Additional wait to ensure all React rendering is complete
    await page.waitForTimeout(2000);

    console.log("Generating PDF...");

    // Generate PDF
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
    });

    await browser.close();

    // Upload to Supabase Storage
    const fileName = `booklet-${tripId}-${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('booklet-exports')
      .upload(fileName, pdf, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw uploadError;
    }

    console.log(`PDF uploaded: ${fileName}`);

    // Generate signed URL (valid for 1 hour)
    const { data: urlData, error: urlError } = await supabase.storage
      .from('booklet-exports')
      .createSignedUrl(fileName, 3600);

    if (urlError) {
      console.error("URL generation error:", urlError);
      throw urlError;
    }

    console.log(`PDF generated successfully for trip ${tripId}`);

    return new Response(
      JSON.stringify({
        success: true,
        url: urlData.signedUrl,
        fileName,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error generating PDF:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to generate PDF",
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
