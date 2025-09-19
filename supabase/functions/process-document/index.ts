import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface TravelDocumentData {
  segment_type: 'flight' | 'hotel' | 'activity' | 'car' | 'train' | 'boat' | 'pass' | 'transfer' | 'other'
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

    // Prepare OpenAI system and user messages (separate for better compliance)
    const systemPrompt = `You are a travel document analyzer. Extract all travel segments from OCR-processed documents.

CRITICAL RULES:
- Multiple segments per document are common (hotels, flights, activities)
- Each hotel reservation = separate segment
- Each flight leg = separate segment  
- Keep descriptions ≤140 chars, titles brief, addresses as IATA/city codes when possible
- Extract maximum 30 segments to avoid truncation

Return ONLY this JSON object format:
{
  "travel_segments": [
    {
      "segment_type": "flight|hotel|activity|car|other",
      "title": "Brief title",
      "start_date": "ISO date or null",
      "end_date": "ISO date or null", 
      "provider": "Provider name or null",
      "reference_number": "Reference or null",
      "address": "Location or null",
      "description": "Brief details or null",
      "confidence": 0.0
    }
  ]
}

NO other keys, NO explanations, ONLY the JSON object above.`;

    const userPrompt = `Analyze this travel document and extract all travel segments:\n\n${ocrText}`;

    // Call OpenAI Text Completion API with gpt-4o
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 4000,
        temperature: 0.1,
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

    console.log(`OpenAI text completion response received from gpt-4o`);
    console.log(`Raw OpenAI response: ${JSON.stringify(openaiData)}`);
    console.log(`Extracted content length: ${extractedContent?.length || 0}`);
    console.log(`Extracted content preview: ${extractedContent?.substring(0, 200) || 'NULL/EMPTY'}`);

    // Check if content is empty
    if (!extractedContent || extractedContent.trim().length === 0) {
      console.error('OpenAI returned empty content');
      throw new Error('OpenAI returned empty response content');
    }

    // Parse JSON with robust error handling and repair functionality
    let extractedSegments: TravelDocumentData[];
    
    function parseJsonSafely(content: string): TravelDocumentData[] {
      console.log(`OpenAI response length: ${content.length} chars`);
      
      // Strip code fences if present
      let jsonContent = content;
      const jsonMatch = jsonContent.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1];
        console.log('Stripped code fences from response');
      }
      
      // Try direct parsing first
      try {
        const parsedData = JSON.parse(jsonContent);
        
        // Extract segments from expected format {"travel_segments": [...]}
        if (parsedData.travel_segments && Array.isArray(parsedData.travel_segments)) {
          console.log(`Found ${parsedData.travel_segments.length} segments in travel_segments array`);
          return parsedData.travel_segments;
        }
        
        // Fallback for unexpected formats
        if (Array.isArray(parsedData)) {
          console.log(`Found ${parsedData.length} segments in direct array format`);
          return parsedData;
        }
        
        if (typeof parsedData === 'object' && parsedData.segment_type) {
          console.log('Found single segment object, wrapping in array');
          return [parsedData];
        }
        
        throw new Error('No travel_segments array found in parsed response');
        
      } catch (parseError) {
        console.log('Direct JSON parsing failed, attempting repair...', parseError.message.substring(0, 100));
        
        // JSON repair for truncated responses
        try {
          // Find travel_segments array start
          const segmentsMatch = jsonContent.match(/"travel_segments"\s*:\s*\[/);
          if (!segmentsMatch) {
            throw new Error('No travel_segments array found in content');
          }
          
          const segmentsStart = segmentsMatch.index! + segmentsMatch[0].length;
          let arrayContent = jsonContent.substring(segmentsStart);
          
          // Find complete objects by balancing braces
          const objects: any[] = [];
          let depth = 0;
          let objectStart = -1;
          let inString = false;
          let escapeNext = false;
          
          for (let i = 0; i < arrayContent.length; i++) {
            const char = arrayContent[i];
            
            if (escapeNext) {
              escapeNext = false;
              continue;
            }
            
            if (char === '\\') {
              escapeNext = true;
              continue;
            }
            
            if (char === '"' && !escapeNext) {
              inString = !inString;
              continue;
            }
            
            if (inString) continue;
            
            if (char === '{') {
              if (depth === 0) objectStart = i;
              depth++;
            } else if (char === '}') {
              depth--;
              if (depth === 0 && objectStart >= 0) {
                // Complete object found
                const objStr = arrayContent.substring(objectStart, i + 1);
                try {
                  const obj = JSON.parse(objStr);
                  objects.push(obj);
                } catch {
                  // Skip malformed object
                }
                objectStart = -1;
              }
            }
            
            // Stop if we hit array end or run out of complete objects
            if (char === ']' && depth === 0) break;
          }
          
          if (objects.length > 0) {
            console.log(`JSON repair successful: recovered ${objects.length} complete segments`);
            return objects;
          }
          
          throw new Error('JSON repair failed: no complete objects found');
          
        } catch (repairError) {
          console.error('JSON repair failed:', repairError.message);
          
          // Log diagnostic info
          const lastChars = jsonContent.slice(-200);
          console.error(`Response ending (last 200 chars): ${lastChars}`);
          
          throw new Error(`JSON_PARSE_FAILED: ${parseError.message} | Repair failed: ${repairError.message} | Length: ${content.length}`);
        }
      }
    }
    
    try {
      extractedSegments = parseJsonSafely(extractedContent);
      
      // Validate and enhance segments
      extractedSegments = extractedSegments.map(segment => {
        // Apply defaults for missing fields
        segment.confidence = segment.confidence || 0.0;
        segment.segment_type = segment.segment_type || 'other';
        segment.title = segment.title || 'Untitled Segment';
        
        // Boost confidence based on OCR quality
        if (ocrConfidence > 0.7 && segment.confidence < 0.9) {
          segment.confidence = Math.min(0.95, segment.confidence + 0.1);
        }
        
        return segment;
      });
      
      if (extractedSegments.length === 0) {
        throw new Error('No valid segments extracted from document');
      }
      
      console.log(`Successfully extracted ${extractedSegments.length} travel segments`);
      
    } catch (parseError) {
      console.error('OpenAI response parsing failed completely:', parseError.message);
      throw new Error(`JSON parsing failed: ${parseError.message}`);
    }

    // Update processing job with results
    const { error: updateError } = await supabase
      .from('document_processing_jobs')
      .update({
        status: 'completed',
        ai_extracted_data: extractedSegments,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    if (updateError) {
      console.error('Failed to update job:', updateError);
      throw new Error(`Failed to update job: ${updateError.message}`);
    }

    console.log('Job updated with AI results');

    // Create all travel segments with trip_id from document
    const segmentInserts = extractedSegments.map(segment => ({
      document_id: document_id,
      user_id: document.user_id,
      trip_id: document.trip_id, // Assign trip_id directly
      segment_type: segment.segment_type,
      title: segment.title,
      start_date: segment.start_date,
      end_date: segment.end_date,
      provider: segment.provider,
      reference_number: segment.reference_number,
      address: segment.address,
      description: segment.description,
      confidence: segment.confidence,
      raw_data: segment,
      validated: false
    }));

    const { data: createdSegments, error: segmentError } = await supabase
      .from('travel_segments')
      .insert(segmentInserts)
      .select();

    // Update trip status to processing when segments are created
    if (document.trip_id) {
      await supabase
        .from('trips')
        .update({ 
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', document.trip_id);
    }

    if (segmentError || !createdSegments) {
      console.error('Failed to create travel segments:', segmentError);
      throw new Error(`Failed to create travel segments: ${segmentError?.message}`);
    }

    console.log(`${createdSegments.length} travel segments created successfully`);

    return new Response(JSON.stringify({
      success: true,
      document_id,
      job_id: job.id,
      segments_created: createdSegments.length,
      segment_ids: createdSegments.map(s => s.id),
      extracted_segments: extractedSegments,
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
