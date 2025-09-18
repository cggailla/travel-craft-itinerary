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

  // Parse body ONCE and keep it for the entire handler (including catch)
  let bodyJson: { document_id?: string } = {};
  try {
    console.log('Process document function called');
    bodyJson = await req.json().catch(() => ({}));
    const document_id = bodyJson?.document_id;
    if (!document_id) throw new Error('Missing document_id');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
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

    // Get Mistral OCR text first (required step)
    let ocrText = job.ocr_text || '';
    let ocrConfidence = job.ocr_confidence || 0.0;

    // Always run Mistral OCR extraction first if not available
    if (!ocrText) {
      console.log('Running Mistral OCR extraction first');
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
          console.log('Mistral OCR completed with confidence:', ocrConfidence);
        } else {
          throw new Error('Mistral OCR extraction failed');
        }
      } catch (ocrError) {
        console.error('Mistral OCR failed:', ocrError);
        throw new Error('Cannot proceed without OCR text extraction');
      }
    }

    if (!ocrText) {
      throw new Error('No OCR text available for processing');
    }

    console.log('Using Mistral OCR markdown text for OpenAI processing');

    // Prepare OpenAI text completion prompt using Mistral OCR markdown
    const systemPrompt = `You are analyzing structured markdown text extracted from a travel document using OCR. Extract the following information in JSON format:

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
- Set confidence based on how clear the information is in the markdown
- If information is unclear, use null values
- The markdown text is already structured with tables and formatting preserved

TRAVEL DOCUMENT MARKDOWN CONTENT:
${ocrText}`;

    // Call OpenAI Text Completion API (not Vision)
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
            content: systemPrompt
          }
        ],
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI Text Completion API error:', openaiResponse.status, errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const extractedContent = openaiData.choices[0].message.content;

    console.log('OpenAI text completion response received');

    // Parse the JSON response (with fallback for code fences)
    let extractedData: TravelDocumentData;
    try {
      let jsonContent = extractedContent;
      // Strip code fences if present
      const jsonMatch = jsonContent.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1];
      }
      extractedData = JSON.parse(jsonContent);
      
      // Boost confidence since we're using high-quality Mistral OCR markdown
      if (ocrConfidence > 0.7 && extractedData.confidence < 0.9) {
        extractedData.confidence = Math.min(0.95, extractedData.confidence + 0.1);
      }
      
    } catch (parseError) {
      console.error('Failed to parse OpenAI JSON response:', extractedContent);
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

    // Create travel segment (inherits trip_id from document)
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
      processing_method: 'mistral_ocr_openai_completion'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Process document function error:', error);
    
    // Try to update job status to failed
    try {
      const document_id = bodyJson?.document_id;
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
