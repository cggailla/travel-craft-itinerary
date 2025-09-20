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

    /******************************************************************
     * 🔄 CHANGEMENT #1 : on supprime l’étape Mistral OCR et on lit
     * directement le fichier depuis Supabase Storage pour l’envoyer
     * à l’API OpenAI (Responses API) via input_file (data URL base64).
     ******************************************************************/

    // Récupération du binaire du document depuis le Storage
    // On essaie des champs courants sans modifier ton schéma ailleurs.
    // --- DOWNLOAD from Supabase Storage (robuste & verbosé) ---
    const storageBucket: string =
      document.storage_bucket || document.bucket || 'travel-documents';
    
    let rawPath: string =
      document.storage_path ||
      document.path ||
      document.file_path ||
      document.relative_path ||
      document.object_path ||
      document.key ||
      '';
    
    if (!rawPath) {
      throw new Error('No storage path field found on document (expected one of storage_path/path/file_path/relative_path/object_path/key).');
    }
    
    // Normalise: retire les "/" de début et "public/" si présent
    let storagePath = String(rawPath)
      .replace(/^public\//, '')
      .replace(/^\/+/, '');
    
    console.log('Downloading from storage (pre-download):', { bucket: storageBucket, rawPath, storagePath });
    
    const bucketClient = supabase.storage.from(storageBucket);
    
    // 1) Essai direct .download()
    let fileBlob: Blob | null = null;
    let downloadErr: any = null;
    
    try {
      const downloadRes = await bucketClient.download(storagePath);
      if (downloadRes.error) {
        downloadErr = downloadRes.error;
      } else {
        fileBlob = downloadRes.data!;
      }
    } catch (e) {
      downloadErr = e;
    }
    
    if (!fileBlob) {
      console.warn('Direct download failed, will try signed URL fallback. Error was:', downloadErr ?? '(no error object)');
    
      // 2) Fallback: Signed URL courte + fetch HTTP
      try {
        const { data: signed, error: signErr } = await bucketClient.createSignedUrl(storagePath, 60);
        if (signErr || !signed?.signedUrl) {
          throw new Error(`Signed URL creation failed: ${signErr?.message || 'unknown error'}`);
        }
        const httpRes = await fetch(signed.signedUrl);
        if (!httpRes.ok) {
          throw new Error(`Signed URL fetch failed with status ${httpRes.status}`);
        }
        fileBlob = await httpRes.blob();
        console.log('Signed URL fetch succeeded for', { bucket: storageBucket, storagePath });
      } catch (e) {
        console.error('Signed URL fallback failed:', e);
        throw new Error(`Storage download failed for bucket="${storageBucket}" path="${storagePath}". Original error: ${downloadErr?.message || JSON.stringify(downloadErr) || 'unknown'} | Fallback: ${e instanceof Error ? e.message : JSON.stringify(e)}`);
      }
    }
    
    // Convert Blob to base64 safely (avoid large argument spreads)
    const base64Data = await (async () => {
      const bytes = new Uint8Array(await fileBlob.arrayBuffer());
      const chunkSize = 0x8000; // 32KB chunks to prevent call stack overflow
      let binary = '';
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
      }
      return btoa(binary);
    })();

    const mimeType: string = (document as any).mime_type || fileBlob.type || 'application/pdf';
    const fileName: string = (document as any).original_filename || (document as any).file_name || 'document.pdf';

    // On n’utilise plus l’OCR => fixe à 0 pour garder le code en aval inchangé
    const ocrConfidence = 0.0;

    console.log('Using OpenAI Responses API with direct file attachment');

    // Prépare le prompt (identique à ton actuel)
    const systemPrompt = `You are an expert travel document analyzer.

Your goal is to extract ALL segments from a travel document (voucher, confirmation, invoice, PDF, email, e-ticket, etc.) and return a structured list of trip segments to be used in a customer-facing **travel booklet** ("carnet de voyage"). 

You must capture **every travel-related element**: flights, hotels, trains, boats, activities, excursions, transfers, rentals, city passes, etc. Extract each service as an **independent segment**, even when part of a package.

========== STRUCTURE TO RETURN ==========

Return ONLY the following JSON object (no explanations, no extra text):

{
  "travel_segments": [
    {
      "segment_type": "flight|hotel|activity|car|train|boat|pass|transfer|other",
      "title": "Client-friendly title, no abbreviations",
      "start_date": "YYYY-MM-DD or null",
      "end_date": "YYYY-MM-DD or null",
      "provider": "Company or service name, or null",
      "reference_number": "Booking/ticket number, or null",
      "address": "City name, airport code, hotel name, meeting point, or null",
      "description": "All extra details not covered by other fields (≤ 500 chars)",
      "confidence": 0.0
    }
  ]
}

========== SEGMENT RULES ==========

- Each **hotel stay block** = 1 segment (even if same hotel reappears)
- Each **flight leg** = 1 segment
- Each **transfer** = 1 segment (airport > hotel, pier > lodge, etc.)
- Each **activity/excursion/tour** = 1 segment
- Each **city pass or digital pass** = 1 segment
- Each **train, boat, bus** = 1 segment
- If a voucher confirms several services (e.g. hotel + transfer), SPLIT into multiple segments
- Max 30 segments per document

========== FIELD DEFINITIONS ==========

**segment_type**:  
Classify the type from this set: flight, hotel, activity, car, train, boat, pass, transfer, other.

**title**:  
Always write a clear title for the traveler. Examples:
- “Vol de Genève à Bamako”
- “Séjour à l’hôtel Serena Kilaguni”
- “Transfert privé en voiture de l’aéroport de Nairobi à l’hôtel”
- “Excursion à Chã das Caldeiras avec guide francophone”
- “Train de Washington à Philadelphie”

**start_date / end_date**:  
- Use ISO format (YYYY-MM-DD) when available
- If only one date is available (e.g. a flight), use it for both
- Leave as \`null\` if truly missing

**provider**:  
Use company name, hotel name, airline, transport company, or null if not found

**reference_number**:  
Ticket number, reservation number, voucher ID, etc., or null if absent

**address**:  
Use IATA airport codes, station names, hotel names, or city names. Examples:
- “Nairobi - Wilson Airport”
- “Shibuya Excel Hotel Tokyu”
- “RAI” for Praia Airport

**description**:  
Gather all **extra details not already structured**, especially:
- Room types / board (FB, BB, etc.)
- Check-in / check-out hours
- Phone numbers or contacts (e.g. “Contact: Mike +254...”)
- Meal plans
- Notes on allergies, specific instructions, taxes not included
- Boat schedules, boarding instructions, GPS, etc.
- Hotel floor / smoking info
- Baggage policies, seat classes, train numbers

**confidence**:  
- 1.0 = very structured data (clearly stated)
- 0.8 = inferred but very likely
- 0.5 or less = unclear, unstructured, possibly wrong

========== BEHAVIORAL RULES ==========

- Parse all content with maximum granularity
- No hallucinations
- If unsure of info: set \`null\` or low confidence
- Titles and comments must be clean, readable and client-facing
- You must include **multiple segments per document if relevant**
- Return maximum 30 segments per document
- DO NOT RETURN ANYTHING OTHER THAN THE JSON`;

    /******************************************************************
     * 🔄 CHANGEMENT #2 : appel OpenAI Chat Completions API avec vision
     ******************************************************************/
    const chatRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // modèle vision-compatible
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this document and extract travel segments according to the instructions.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Data}`
                }
              }
            ]
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 4000
      })
    });

    if (!chatRes.ok) {
      const errorText = await chatRes.text();
      console.error('OpenAI Chat API error:', chatRes.status, errorText);
      throw new Error(`OpenAI API error: ${chatRes.status}`);
    }

    const openaiData = await chatRes.json();

    // Le Chat Completions API renvoie classiquement dans choices[0].message.content
    const extractedContent: string =
      openaiData.choices?.[0]?.message?.content ?? '';

    console.log(`OpenAI responses output length: ${extractedContent.length || 0}`);
    console.log(`Output preview: ${extractedContent.substring(0, 200) || 'NULL/EMPTY'}`);

    if (!extractedContent || extractedContent.trim().length === 0) {
      console.error('OpenAI returned empty content');
      throw new Error('OpenAI returned empty response content');
    }

    // Parse JSON with robust error handling and repair functionality (inchangé)
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
        console.log('Direct JSON parsing failed, attempting repair...', (parseError as Error).message.substring(0, 100));
        
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
          
        } catch (repairError: any) {
          console.error('JSON repair failed:', repairError.message);
          
          // Log diagnostic info
          const lastChars = jsonContent.slice(-200);
          console.error(`Response ending (last 200 chars): ${lastChars}`);
          
          throw new Error(`JSON_PARSE_FAILED: ${(parseError as Error).message} | Repair failed: ${repairError.message} | Length: ${content.length}`);
        }
      }
    }
    
    try {
      extractedSegments = parseJsonSafely(extractedContent);
      
      // Validate and enhance segments (on garde le même traitement ; ocrConfidence=0)
      extractedSegments = extractedSegments.map(segment => {
        segment.confidence = segment.confidence || 0.0;
        segment.segment_type = segment.segment_type || 'other';
        segment.title = segment.title || 'Untitled Segment';
        if (ocrConfidence > 0.7 && segment.confidence < 0.9) {
          segment.confidence = Math.min(0.95, segment.confidence + 0.1);
        }
        return segment;
      });
      
      if (extractedSegments.length === 0) {
        throw new Error('No valid segments extracted from document');
      }
      
      console.log(`Successfully extracted ${extractedSegments.length} travel segments`);
      
    } catch (parseError: any) {
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
      processing_method: 'openai_chat_completions_vision'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
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
