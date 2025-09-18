import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// PDF parsing utility
const parsePDF = async (pdfData: Uint8Array): Promise<{ text: string; confidence: number }> => {
  try {
    // Use PDF.js for parsing PDFs in Deno
    const response = await fetch('https://esm.sh/pdf-parse@1.1.1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: Array.from(pdfData) })
    });
    
    if (!response.ok) {
      throw new Error('PDF parsing failed');
    }
    
    const result = await response.json();
    return {
      text: result.text || '',
      confidence: result.text ? 0.8 : 0.3
    };
  } catch (error) {
    console.error('PDF parsing error:', error);
    return { text: '', confidence: 0.0 };
  }
};

// Convert text to structured markdown
const convertToMarkdown = (text: string, fileType: string): string => {
  if (!text.trim()) return '';
  
  let markdown = '';
  
  // Add basic structure based on content patterns
  const lines = text.split('\n').filter(line => line.trim());
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Detect headers (short lines in caps or with keywords)
    if (line.length < 50 && (
      line === line.toUpperCase() ||
      /^(FLIGHT|HOTEL|BOOKING|CONFIRMATION|ITINERARY|PASSENGER)/i.test(line)
    )) {
      markdown += `## ${line}\n\n`;
    }
    // Detect key-value pairs
    else if (/^[A-Z\s]+:\s*.+/i.test(line)) {
      markdown += `**${line}**\n\n`;
    }
    // Regular content
    else {
      markdown += `${line}\n\n`;
    }
  }
  
  return markdown;
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

    console.log('OCR job status updated to processing');

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('travel-documents')
      .download(document.storage_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`);
    }

    console.log('File downloaded for OCR processing');

    let extractedText = '';
    let confidence = 0.0;

    // Process based on file type
    const fileType = document.file_type.toLowerCase();
    
    if (fileType === 'application/pdf') {
      console.log('Processing PDF with OCR');
      const pdfData = new Uint8Array(await fileData.arrayBuffer());
      const result = await parsePDF(pdfData);
      extractedText = result.text;
      confidence = result.confidence;
    } else if (fileType.startsWith('image/')) {
      console.log('Processing image with OCR - fallback to basic text extraction');
      // For images, we'll rely more on OpenAI Vision API
      // This is a placeholder for potential Tesseract integration
      extractedText = 'OCR processing available for PDF files. Image processing via OpenAI Vision.';
      confidence = 0.2;
    } else {
      console.log('Unsupported file type for OCR:', fileType);
      extractedText = 'Unsupported file type for OCR processing.';
      confidence = 0.1;
    }

    // Convert to markdown if we have text
    const markdownText = extractedText ? convertToMarkdown(extractedText, fileType) : '';

    console.log('OCR extraction completed, confidence:', confidence);

    // Update processing job with OCR results
    const { error: updateError } = await supabase
      .from('document_processing_jobs')
      .update({
        ocr_text: markdownText || extractedText,
        ocr_confidence: confidence,
        status: extractedText ? 'completed' : 'failed',
        updated_at: new Date().toISOString(),
        ...(extractedText ? {} : { error_message: 'No text could be extracted via OCR' })
      })
      .eq('id', job.id);

    if (updateError) {
      console.error('Failed to update job with OCR results:', updateError);
      throw new Error(`Failed to update job: ${updateError.message}`);
    }

    console.log('OCR results saved successfully');

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