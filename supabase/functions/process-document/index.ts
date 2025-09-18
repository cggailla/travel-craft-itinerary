import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface TravelDocumentData {
  segment_type: 'flight' | 'hotel' | 'activity' | 'car' | 'other'
  title: string
  start_date: string | null
  end_date?: string | null
  provider?: string
  reference_number?: string
  address?: string
  description?: string
  confidence: number
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Process document function called');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { document_id } = await req.json();
    console.log('Processing document:', document_id);

    // Get document and job info
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', document_id)
      .single();

    if (docError || !document) {
      throw new Error(`Document not found: ${docError?.message}`);
    }

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

    console.log('Job status updated to processing');

    // First, try to get OCR text if available
    let ocrText = job.ocr_text || '';
    let ocrConfidence = job.ocr_confidence || 0.0;
    let useHybridApproach = false;

    // Check if we should run OCR first
    if (!ocrText && document.file_type === 'application/pdf') {
      console.log('Running OCR extraction first for PDF');
      try {
        const ocrResponse = await fetch(`${supabaseUrl}/functions/v1/extract-text`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ document_id })
        });

        if (ocrResponse.ok) {
          const ocrResult = await ocrResponse.json();
          ocrText = ocrResult.ocr_text || '';
          ocrConfidence = ocrResult.ocr_confidence || 0.0;
          console.log('OCR completed with confidence:', ocrConfidence);
        }
      } catch (ocrError) {
        console.error('OCR failed, falling back to vision only:', ocrError);
      }
    }

    // Determine processing strategy
    if (ocrText && ocrConfidence > 0.5) {
      useHybridApproach = true;
      console.log('Using hybrid OCR + Vision approach');
    } else {
      console.log('Using vision-only approach');
    }

    // Download file from storage for vision processing
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('travel-documents')
      .download(document.storage_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`);
    }

    console.log('File downloaded for processing');

    // Convert file to base64 for OpenAI
    const fileBuffer = await fileData.arrayBuffer();
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
    const dataUrl = `data:${document.file_type};base64,${base64Data}`;

    console.log('File converted to base64, calling OpenAI API');

    // Prepare OpenAI prompt based on available data
    let systemPrompt = `Analyze this travel document and extract the following information in JSON format:
{
  "segment_type": "flight" | "hotel" | "activity" | "car" | "other",
  "title": "Brief title of the travel segment",
  "start_date": "ISO date string (YYYY-MM-DDTHH:mm:ss.sssZ) or null",
  "end_date": "ISO date string (YYYY-MM-DDTHH:mm:ss.sssZ) or null", 
  "provider": "Company/provider name or null",
  "reference_number": "Booking reference/confirmation number or null",
  "address": "Location/address or null",
  "description": "Additional details or null",
  "confidence": 0.0 to 1.0
}

Important:
- Only return valid JSON, no explanatory text
- Use ISO 8601 format for dates with timezone
- Set confidence based on how clear the information is
- If information is unclear, use null values`;

    if (useHybridApproach) {
      systemPrompt += `

ADDITIONAL CONTEXT - OCR Text Extracted:
${ocrText}

Please use both the OCR text above AND the visual image to cross-validate and extract the most accurate information. The OCR confidence is ${ocrConfidence}. Use the image to verify and correct any OCR errors.`;
    }

    // Call OpenAI Vision API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: systemPrompt
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
        max_tokens: 1000
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', openaiResponse.status, errorText);
      
      // Fallback: try to use OCR data only if available
      if (ocrText && ocrConfidence > 0.3) {
        console.log('OpenAI failed, attempting OCR-only fallback');
        return await processWithOCROnly(supabase, document_id, job.id, ocrText, ocrConfidence);
      }
      
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const extractedContent = openaiData.choices[0].message.content;

    console.log('OpenAI response received');

    // Parse the JSON response
    let extractedData: TravelDocumentData;
    try {
      extractedData = JSON.parse(extractedContent);
      
      // Boost confidence if we used hybrid approach
      if (useHybridApproach && extractedData.confidence < 0.9) {
        extractedData.confidence = Math.min(0.95, extractedData.confidence + 0.1);
      }
      
    } catch (parseError) {
      console.error('Failed to parse OpenAI JSON response:', extractedContent);
      
      // Fallback: try to use OCR data only if available
      if (ocrText && ocrConfidence > 0.3) {
        console.log('JSON parsing failed, attempting OCR-only fallback');
        return await processWithOCROnly(supabase, document_id, job.id, ocrText, ocrConfidence);
      }
      
      throw new Error('Invalid JSON response from OpenAI');
    }

    // Update processing job with results
    const { error: updateError } = await supabase
      .from('document_processing_jobs')
      .update({
        status: 'completed',
        ai_extracted_data: extractedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    if (updateError) {
      console.error('Failed to update job:', updateError);
      throw new Error(`Failed to update job: ${updateError.message}`);
    }

    console.log('Job updated with AI results');

    // Create travel segment
    const { data: segment, error: segmentError } = await supabase
      .from('travel_segments')
      .insert({
        document_id: document_id,
        user_id: document.user_id,
        segment_type: extractedData.segment_type,
        title: extractedData.title,
        start_date: extractedData.start_date,
        end_date: extractedData.end_date,
        provider: extractedData.provider,
        reference_number: extractedData.reference_number,
        address: extractedData.address,
        description: extractedData.description,
        confidence: extractedData.confidence,
        raw_data: extractedData,
        validated: false
      })
      .select()
      .single();

    if (segmentError) {
      console.error('Failed to create travel segment:', segmentError);
      throw new Error(`Failed to create travel segment: ${segmentError.message}`);
    }

    console.log('Travel segment created successfully');

    return new Response(JSON.stringify({
      success: true,
      document_id,
      job_id: job.id,
      segment_id: segment.id,
      extracted_data: extractedData,
      processing_method: useHybridApproach ? 'hybrid' : 'vision_only'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Process document function error:', error);
    
    // Try to update job status to failed
    try {
      const requestBody = await req.clone().json();
      const { document_id } = requestBody;
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

// Fallback function for OCR-only processing
async function processWithOCROnly(supabase: any, documentId: string, jobId: string, ocrText: string, ocrConfidence: number) {
  console.log('Processing with OCR-only fallback');
  
  // Basic parsing logic for OCR text
  const extractedData: TravelDocumentData = {
    segment_type: 'other',
    title: 'Document processed via OCR',
    start_date: null,
    end_date: null,
    provider: null,
    reference_number: null,
    address: null,
    description: ocrText.substring(0, 500) + (ocrText.length > 500 ? '...' : ''),
    confidence: Math.max(0.3, ocrConfidence - 0.2)
  };

  // Simple pattern matching for common travel document types
  const text = ocrText.toLowerCase();
  if (text.includes('flight') || text.includes('airline') || text.includes('departure')) {
    extractedData.segment_type = 'flight';
    extractedData.title = 'Flight - OCR Processed';
  } else if (text.includes('hotel') || text.includes('accommodation') || text.includes('check-in')) {
    extractedData.segment_type = 'hotel';
    extractedData.title = 'Hotel - OCR Processed';
  }

  // Update job and create segment
  await supabase
    .from('document_processing_jobs')
    .update({
      status: 'completed',
      ai_extracted_data: extractedData,
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);

  const { data: segment } = await supabase
    .from('travel_segments')
    .insert({
      document_id: documentId,
      segment_type: extractedData.segment_type,
      title: extractedData.title,
      description: extractedData.description,
      confidence: extractedData.confidence,
      raw_data: extractedData,
      validated: false
    })
    .select()
    .single();

  return new Response(JSON.stringify({
    success: true,
    document_id: documentId,
    job_id: jobId,
    segment_id: segment?.id,
    extracted_data: extractedData,
    processing_method: 'ocr_only_fallback'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}