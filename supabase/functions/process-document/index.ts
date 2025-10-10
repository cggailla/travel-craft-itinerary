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
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let bodyJson: { document_id?: string } = {};

  try {
    console.log('Process document function called');
    bodyJson = await req.json().catch(() => ({}));
    const document_id = bodyJson?.document_id;
    if (!document_id) throw new Error('Missing document_id');

    // Auth: require Bearer token and use anon key so RLS applies
    const authHeader = (req.headers.get('authorization') || req.headers.get('Authorization') || '');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 })
    }
    const token = authHeader.replace(/^Bearer\s+/i, '');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '');

    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 })
    }
    const user = userData.user;

    console.log('Processing document:', document_id);

    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', document_id)
      .single();

    if (docError || !document) throw new Error(`Document not found: ${docError?.message}`);

    const { data: job, error: jobError } = await supabase
      .from('document_processing_jobs')
      .select('*')
      .eq('document_id', document_id)
      .single();

    if (jobError || !job) throw new Error(`Processing job not found: ${jobError?.message}`);

    await supabase
      .from('document_processing_jobs')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    console.log('Job status updated to processing');

    /******************************************************************
     * 📥 Téléchargement du fichier depuis Supabase Storage
     ******************************************************************/
    const storageBucket: string = document.storage_bucket || document.bucket || 'travel-documents';

    let rawPath: string =
      document.storage_path ||
      document.path ||
      document.file_path ||
      document.relative_path ||
      document.object_path ||
      document.key ||
      '';

    if (!rawPath) throw new Error('No storage path found on document');

    const storagePath = String(rawPath).replace(/^public\//, '').replace(/^\/+/, '');
    const bucketClient = supabase.storage.from(storageBucket);

    let fileBlob: Blob | null = null;
    let downloadErr: any = null;

    try {
      const downloadRes = await bucketClient.download(storagePath);
      if (downloadRes.error) downloadErr = downloadRes.error;
      else fileBlob = downloadRes.data!;
    } catch (e) {
      downloadErr = e;
    }

    if (!fileBlob) {
      console.warn('Direct download failed, trying signed URL fallback', downloadErr);
      const { data: signed, error: signErr } = await bucketClient.createSignedUrl(storagePath, 60);
      if (signErr || !signed?.signedUrl) throw new Error(`Signed URL creation failed: ${signErr?.message}`);
      const httpRes = await fetch(signed.signedUrl);
      if (!httpRes.ok) throw new Error(`Signed URL fetch failed (${httpRes.status})`);
      fileBlob = await httpRes.blob();
      console.log('Signed URL fetch succeeded');
    }

    /******************************************************************
     * 🧠 Détection du type de fichier
     ******************************************************************/
    const mimeType: string = (document as any).mime_type || fileBlob.type || 'application/pdf';
    const fileName: string = (document as any).original_filename || (document as any).file_name || 'document.pdf';

    const isPlainText =
      /text\/plain/i.test(mimeType) ||
      /\.txt$/i.test(fileName) ||
      (!mimeType && fileName.endsWith('.txt')) ||
      (!mimeType && fileBlob.size < 2_000_000);

    console.log('File detection:', { mimeType, fileName, isPlainText });

    /******************************************************************
     * 📖 Lecture du contenu texte brut
     ******************************************************************/
    let rawPlainText: string | null = null;

    if (isPlainText) {
      try {
        if (fileBlob instanceof Blob && fileBlob.text) {
          rawPlainText = await fileBlob.text();
        } else {
          const buf = await fileBlob.arrayBuffer();
          rawPlainText = new TextDecoder('utf-8').decode(buf);
        }
        console.log(`Plain text read successfully (${rawPlainText.length} chars)`);
      } catch (e) {
        console.warn('Failed to read blob as text', e);
        rawPlainText = null;
      }
    }

        /******************************************************************
     * 📦 Conversion base64 si le document n'est PAS du texte
     ******************************************************************/
    let base64Data: string | null = null;

    if (!isPlainText || rawPlainText === null) {
        console.log('Converting file to base64 for OpenAI attachment...');
        const bytes = new Uint8Array(await fileBlob.arrayBuffer());
        const chunkSize = 0x8000; // 32KB chunks to avoid stack overflow
        let binary = '';
        for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode(...chunk);
        }
        base64Data = btoa(binary);
    }


    // legacy OCR compatibility
    const ocrConfidence = 0.0;

    console.log(
      'Using OpenAI Chat API with ' +
        (isPlainText && rawPlainText ? 'inline plain text' : 'file attachment') +
        ' mode.'
    );

    /******************************************************************
     * ✉️ PROMPTS
     ******************************************************************/
    const analysisPrompt = `You are a document structure analyst.

Read the DOCUMENT attached and output a short analysis describing the document’s structure and layout. 
Do NOT extract data and do NOT generate JSON. 
Your output must be concise and only guide the next parsing step.

Focus on:
- DOCUMENT TYPE: Identify the kind (itinerary day-by-day, hotel voucher, invoice line-items, e-ticket, city pass, transfer voucher, mixed).
- STRUCTURE: How the information is organized (e.g., daily blocks with DAY X, table rows, check-in/out blocks, ticket header + timetable).
- GRANULARITY RULE: Describe exactly how the parser MUST create segments. 
  • Example: “Create one segment per hotel stay block.”  
  • Example: “Create one segment PER DAY. In this case, start_date and end_date MUST always be the same single day.”  
- ORDERING: Whether to keep chronological order or document order.
- SPECIAL ELEMENTS: Global notes outside main blocks (allergies, contacts, policies, conditions) that must be added as an "other" segment.
- KEY SERVICE TYPES: List which segment types are expected (flight, hotel, train, transfer, boat, activity, pass, other).

Be brief, factual, and actionable. 
This analysis will be used as the System prompt of the next step parser.`;

    const parsingPrompt = `

========== STRUCTURE TO RETURN ==========
IMPORTANT !!!! : Return ONLY the following JSON object, NO EXPLANATIONS, NO EXTRA TEXT:

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
- Each hotel stay block = 1 segment (even if same hotel reappears)
- Each flight leg = 1 segment
- Each transfer = 1 segment (airport > hotel, pier > lodge, etc.)
- Each activity/excursion/tour = 1 segment
- Each city pass or digital pass = 1 segment
- Each train, boat, bus = 1 segment
- If a voucher confirms several services (e.g. hotel + transfer), SPLIT into multiple segments
- Max 30 segments per document

========== FIELD DEFINITIONS ==========
segment_type:
- One of: flight, hotel, activity, car, train, boat, pass, transfer, other.

title:
- Clear client-facing title (e.g., “Vol de Genève à Bamako”, “Séjour à l’hôtel Serena Kilaguni”, “Transfert privé en voiture de l’aéroport de Nairobi à l’hôtel”, “Excursion à Chã das Caldeiras avec guide francophone”, “Train de Washington à Philadelphie”).
- Avoid abbreviations in the title; keep them in description if useful.

start_date / end_date:
- Use ISO (YYYY-MM-DD) when available.
- If only one date is available (e.g., a flight), use it for both.
- If the SYSTEM analysis specifies "day by day granularity", you MUST create one segment per day and set start_date and end_date to the same single day.
- Leave as null if truly missing.

provider:
- Airline, hotel, transport company, tour operator, or null.

reference_number:
- Ticket number, reservation number, voucher ID, etc., or null.

address:
- IATA airport codes, station names, hotel names, meeting points, or city names.

description:
- Put any extra detail not captured elsewhere: room type & board (BB/HB/FB), check-in/out times, phone numbers or contacts, meal plans, allergies, specific instructions, taxes not included, boat schedules/boarding instructions/GPS, hotel floor/smoking info, baggage policies, seat classes, train numbers.

confidence:
- 1.0 = explicitly provided/clear; 0.8 = inferred but very likely; 0.5 or less = unclear/ambiguous.

========== BEHAVIORAL RULES ==========
- FOLLOW the System directives from the previous analysis exactly (granularity, ordering, special rules).
- Parse with maximum granularity appropriate to the document type.
- If unsure, set fields to null or low confidence.
- SPEAK FRENCH !
- Always include an “other” segment with title like “Informations générales” (dates null) if there are global notes/contacts/policies/allergies outside specific services.
- Return ONLY the JSON !!!!!
`;  // (à réinsérer)

    /******************************************************************
     * 🧩 APPEL 1 — ANALYSE
     ******************************************************************/
    let analysisMessages: any[];

    if (isPlainText && rawPlainText) {
      const MAX_TEXT_CHARS = 45000;
      const truncated = rawPlainText.slice(0, MAX_TEXT_CHARS);
      const clipped = truncated.length < rawPlainText.length;
      const decorated = `RAW DOCUMENT (truncated to ${MAX_TEXT_CHARS} chars if needed):\n<<<DOCUMENT_PLAIN_TEXT_START>>>\n${truncated}\n<<<DOCUMENT_PLAIN_TEXT_END>>>`;
      analysisMessages = [
        { role: 'system', content: analysisPrompt },
        {
          role: 'user',
          content:
            'Analyze ONLY the document structure/layout as instructed. Do NOT parse data. Output the short analysis block.\n' +
            decorated,
        },
      ];
    } else {
      // autres fichiers : ne pas modifier pour cette étape
      analysisMessages = [
        { role: 'system', content: analysisPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze ONLY...' },
            { type: 'file', file: { filename: `${fileName}`, file_data: `data:${mimeType};base64,${base64Data}` } },
          ],
        },
      ];
    }

    const analysisRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: analysisMessages,
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!analysisRes.ok) {
      const errorText = await analysisRes.text();
      console.error('OpenAI Chat API error (analysis):', analysisRes.status, errorText);
      throw new Error(`OpenAI API error (analysis): ${analysisRes.status}`);
    }

    const analysisData = await analysisRes.json();
    const systemDirectives: string = analysisData.choices?.[0]?.message?.content ?? '';
    if (!systemDirectives?.trim()) throw new Error('OpenAI returned empty analysis directives');

    console.log('--- System directives from analysis ---');
    console.log(systemDirectives);

    /******************************************************************
     * 🧠 APPEL 2 — PARSING
     ******************************************************************/
    const parsingPromptWithDirectives = `You are an expert travel document analyzer...\n\n${systemDirectives}\n${parsingPrompt}`;

    let parsingMessages: any[];

    if (isPlainText && rawPlainText) {
      const MAX_TEXT_CHARS = 45000;
      const truncated = rawPlainText.slice(0, MAX_TEXT_CHARS);
      const clipped = truncated.length < rawPlainText.length;
      const decorated = `RAW DOCUMENT (truncated to ${MAX_TEXT_CHARS} chars if needed):\n<<<DOCUMENT_PLAIN_TEXT_START>>>\n${truncated}\n<<<DOCUMENT_PLAIN_TEXT_END>>>`;
      parsingMessages = [
        { role: 'system', content: parsingPromptWithDirectives },
        {
          role: 'user',
          content:
            'Analyze this document and extract travel segments according to the instructions.\n' +
            decorated,
        },
      ];
    } else {
      // autres fichiers : inchangé
      parsingMessages = [
        { role: 'system', content: parsingPromptWithDirectives },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this document...' },
            { type: 'file', file: { filename: `${fileName}`, file_data: `data:${mimeType};base64,${base64Data}` } },
          ],
        },
      ];
    }

    const chatRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: parsingMessages,
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    if (!chatRes.ok) {
      const errorText = await chatRes.text();
      console.error('OpenAI Chat API error (parsing):', chatRes.status, errorText);
      throw new Error(`OpenAI API error (parsing): ${chatRes.status}`);
    }

    const openaiData = await chatRes.json();
    const extractedContent: string = openaiData.choices?.[0]?.message?.content ?? '';

    console.log(`OpenAI responses output length: ${extractedContent.length || 0}`);
    console.log(`Output preview: ${extractedContent.substring(0, 200) || 'NULL/EMPTY'}`);

    if (!extractedContent?.trim()) throw new Error('OpenAI returned empty response content');

    /******************************************************************
     * 🧩 PARSING DU JSON (inchangé)
     ******************************************************************/
    let extractedSegments: TravelDocumentData[] = [];

    function parseJsonSafely(content: string): TravelDocumentData[] {
      let jsonContent = content;
      const jsonMatch = jsonContent.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) jsonContent = jsonMatch[1];
      try {
        const parsed = JSON.parse(jsonContent);
        if (parsed.travel_segments && Array.isArray(parsed.travel_segments)) return parsed.travel_segments;
        if (Array.isArray(parsed)) return parsed;
        if (typeof parsed === 'object' && parsed.segment_type) return [parsed];
        throw new Error('Unexpected JSON format');
      } catch (err) {
        console.error('JSON parse failed:', err);
        throw err;
      }
    }

    extractedSegments = parseJsonSafely(extractedContent);
    extractedSegments = extractedSegments.map((seg) => ({
      ...seg,
      confidence: seg.confidence || 0.0,
      segment_type: seg.segment_type || 'other',
      title: seg.title || 'Untitled Segment',
    }));

    if (!extractedSegments.length) throw new Error('No segments extracted');

    console.log(`Successfully extracted ${extractedSegments.length} segments`);

    await supabase
      .from('document_processing_jobs')
      .update({
        status: 'completed',
        ai_extracted_data: extractedSegments,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    const segmentInserts = extractedSegments.map((segment, index) => ({
      document_id,
      user_id: document.user_id,
      trip_id: document.trip_id,
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
      sequence_order: index,
      validated: false,
    }));

    const { data: createdSegments, error: segmentError } = await supabase
      .from('travel_segments')
      .insert(segmentInserts)
      .select();

    if (segmentError || !createdSegments)
      throw new Error(`Failed to create travel segments: ${segmentError?.message}`);

    if (document.trip_id) {
      await supabase
        .from('trips')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', document.trip_id);
    }

    console.log(`${createdSegments.length} segments created successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        document_id,
        job_id: job.id,
        segments_created: createdSegments.length,
        extracted_segments: extractedSegments,
        processing_method: isPlainText && rawPlainText ? 'openai_chat_completions_text' : 'openai_chat_completions_vision',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Process document function error:', error);
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
            updated_at: new Date().toISOString(),
          })
          .eq('document_id', document_id);
      }
    } catch (updateError) {
      console.error('Failed to update job status:', updateError);
    }

    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
