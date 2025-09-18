import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Mistral OCR extraction utility
const extractWithMistralOCR = async (fileData: Uint8Array, fileType: string): Promise<{ text: string; confidence: number }> => {
  try {
    const mistralApiKey = Deno.env.get('MISTRAL_API_KEY');
    if (!mistralApiKey) {
      throw new Error('MISTRAL_API_KEY not configured');
    }

    // Convert file data to base64
    const base64Data = btoa(String.fromCharCode(...fileData));
    const dataUrl = `data:${fileType};base64,${base64Data}`;

    console.log('Calling Mistral OCR API with model: mistral-ocr-latest');

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mistralApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-ocr-latest',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all text from this document and return it in structured markdown format. Preserve tables, lists, headings, and other formatting elements. Return only the markdown content, no explanations.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl
                }
              }
            ]
          }
        ],
        max_tokens: 4000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mistral OCR API error:', response.status, errorText);
      throw new Error(`Mistral OCR API error: ${response.status}`);
    }

    const result = await response.json();
    const extractedText = result.choices[0].message.content || '';
    
    // Calculate confidence based on response quality
    const confidence = extractedText.length > 50 ? 0.9 : (extractedText.length > 10 ? 0.7 : 0.3);
    
    console.log(`Mistral OCR extraction completed, text length: ${extractedText.length}, confidence: ${confidence}`);
    
    return {
      text: extractedText,
      confidence: confidence
    };
  } catch (error) {
    console.error('Mistral OCR extraction error:', error);
    return { text: '', confidence: 0.0 };
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Extract text function called');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { document_id } = await req.json();
    console.log('Processing document for OCR:', document_id);

    // Get document info
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', document_id)
      .single();

    if (docError || !document) {
      throw new Error(`Document not found: ${docError?.message}`);
    }

    // Get processing job
    const { data: job, error: jobError } = await supabase
      .from('document_processing_jobs')
      .select('*')
      .eq('document_id', document_id)
      .single();

    if (jobError || !job) {
      throw new Error(`Processing job not found: ${jobError?.message}`);
    }

    // Update job status to processing
    await supabase
      .from('document_processing_jobs')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    console.log('Mistral OCR job status updated to processing');

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('travel-documents')
      .download(document.storage_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`);
    }

    console.log('File downloaded for Mistral OCR processing');

    let extractedText = '';
    let confidence = 0.0;

    // Process all file types (PDF and images) with Mistral OCR
    const fileType = document.file_type.toLowerCase();
    
    if (fileType === 'application/pdf' || fileType.startsWith('image/')) {
      console.log(`Processing ${fileType} with Mistral OCR`);
      const fileBuffer = new Uint8Array(await fileData.arrayBuffer());
      const result = await extractWithMistralOCR(fileBuffer, document.file_type);
      extractedText = result.text;
      confidence = result.confidence;
    } else {
      console.log('Unsupported file type for OCR:', fileType);
      extractedText = 'Unsupported file type for OCR processing.';
      confidence = 0.1;
    }

    // Mistral OCR already returns structured markdown, no conversion needed
    const markdownText = extractedText;

    console.log('Mistral OCR extraction completed, confidence:', confidence);

    // Update processing job with OCR results
    const { error: updateError } = await supabase
      .from('document_processing_jobs')
      .update({
        ocr_text: markdownText || extractedText,
        ocr_confidence: confidence,
        status: extractedText ? 'completed' : 'failed',
        updated_at: new Date().toISOString(),
        ...(extractedText ? {} : { error_message: 'No text could be extracted via Mistral OCR' })
      })
      .eq('id', job.id);

    if (updateError) {
      console.error('Failed to update job with OCR results:', updateError);
      throw new Error(`Failed to update job: ${updateError.message}`);
    }

    console.log('Mistral OCR results saved successfully');

    return new Response(JSON.stringify({
      success: true,
      document_id,
      job_id: job.id,
      ocr_text: markdownText || extractedText,
      ocr_confidence: confidence,
      file_type: fileType,
      extracted_length: extractedText.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Extract text function error:', error);
    
    // Try to update job status to failed
    try {
      const { document_id } = await req.json();
      if (document_id) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase
          .from('document_processing_jobs')
          .update({ 
            status: 'failed',
            error_message: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('document_id', document_id);
      }
    } catch (updateError) {
      console.error('Failed to update job status:', updateError);
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});