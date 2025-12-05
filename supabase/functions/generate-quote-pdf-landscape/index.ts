import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuotePdfRequest {
  tripId: string;
  htmlContent: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tripId, htmlContent }: QuotePdfRequest = await req.json();

    if (!tripId || !htmlContent) {
      throw new Error('tripId and htmlContent are required');
    }

    console.log(`🎨 Generating landscape PDF for trip ${tripId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use Chrome PDF generation via existing generate-pdf-chrome function
    const { data: pdfData, error: pdfError } = await supabase.functions.invoke(
      'generate-pdf-chrome',
      {
        body: {
          html: htmlContent,
          options: {
            format: 'A4',
            landscape: true,
            printBackground: true,
            preferCSSPageSize: false,
            margin: {
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
            },
          },
        },
      }
    );

    if (pdfError) {
      console.error('❌ Error generating PDF:', pdfError);
      throw pdfError;
    }

    if (!pdfData?.pdfData) {
      throw new Error('No PDF data received from Chrome PDF generator');
    }

    // Convert base64 to Uint8Array
    const pdfBytes = Uint8Array.from(atob(pdfData.pdfData), c => c.charCodeAt(0));

    // Upload to Supabase Storage
    const fileName = `quote-${tripId}-${Date.now()}.pdf`;
    const storagePath = `quotes/${tripId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('quote-exports')
      .upload(storagePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('❌ Error uploading PDF:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('quote-exports')
      .getPublicUrl(storagePath);

    console.log('✅ PDF generated and uploaded successfully');

    return new Response(
      JSON.stringify({
        success: true,
        pdfUrl: urlData.publicUrl,
        fileName,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Error in generate-quote-pdf-landscape:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
