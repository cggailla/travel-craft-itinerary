import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  let bodyJson: any = {};
  try {
    bodyJson = await req.json().catch(() => ({}));
    const document_id = bodyJson?.document_id;
    if (!document_id) throw new Error('Missing document_id');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1) Récupère le document (on suppose qu’il a storage_bucket + storage_path ou un file_url)
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', document_id)
      .single();
    if (docError || !document) throw new Error(`Document not found: ${docError?.message}`);

    // Récupère la job
    const { data: job, error: jobError } = await supabase
      .from('document_processing_jobs')
      .select('*')
      .eq('document_id', document_id)
      .single();
    if (jobError || !job) throw new Error(`Processing job not found: ${jobError?.message}`);

    // Passe le job en "processing"
    await supabase.from('document_processing_jobs').update({
      status: 'processing',
      updated_at: new Date().toISOString()
    }).eq('id', job.id);

    // 2) Télécharge le fichier depuis Supabase Storage
    // Adapte ces champs à ton schéma (exemples: document.storage_bucket, document.storage_path)
    const bucket = document.storage_bucket || 'documents';
    const path = document.storage_path; // ex: 'user_123/abc.pdf'
    if (!path) throw new Error('Document missing storage_path');

    const { data: fileData, error: fileErr } = await supabase.storage
      .from(bucket)
      .download(path);
    if (fileErr || !fileData) throw new Error(`Cannot download file: ${fileErr?.message}`);

    const arrayBuf = await fileData.arrayBuffer();
    const base64File = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)));
    const filename = document.original_filename || 'document.pdf';
    const mime = document.mime_type || 'application/pdf';

    // 3) Prépare le prompt (reprend ta spec JSON)
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
      "commentaire": "All extra details not covered by other fields (≤ 500 chars)",
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
Classify the type from this set: `flight`, `hotel`, `activity`, `car`, `train`, `boat`, `pass`, `transfer`, `other`.

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
- Leave as ``null`` if truly missing

**provider**:  
Use company name, hotel name, airline, transport company, or null if not found

**reference_number**:  
Ticket number, reservation number, voucher ID, etc., or null if absent

**address**:  
Use IATA airport codes, station names, hotel names, or city names. Examples:
- “Nairobi - Wilson Airport”
- “Shibuya Excel Hotel Tokyu”
- “RAI” for Praia Airport

**commentaire**:  
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
- If unsure of info: set ``null`` or low confidence
- Titles and comments must be clean, readable and client-facing
- You must include **multiple segments per document if relevant**
- Return maximum 30 segments per document
- DO NOT RETURN ANYTHING OTHER THAN THE JSON`

    // 4) Appel OpenAI Responses API avec fichier attaché
    // ⚠️ Utilise gpt-4o pour l’OCR/vision. gpt-5-nano ne supporte pas input_file.
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 4000,
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
                text: 'Analyse ce document et extrais tous les segments de voyage selon les instructions.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mime};base64,${base64File}`
                }
              }
            ]
          }
        ]
      })
    });

    if (!openaiRes.ok) {
      const errTxt = await openaiRes.text();
      throw new Error(`OpenAI API error ${openaiRes.status}: ${errTxt}`);
    }

    const oa = await openaiRes.json();

    // 5) Récupère le texte de sortie (API standard)
    let contentText = '';
    if (oa.choices && oa.choices[0] && oa.choices[0].message && oa.choices[0].message.content) {
      contentText = oa.choices[0].message.content;
    } else if (Array.isArray(oa.output) && oa.output[0]?.content?.[0]?.type === 'output_text') {
      contentText = oa.output[0].content[0].text;
    } else if (Array.isArray(oa.output) && oa.output[0]?.content?.[0]?.text?.value) {
      contentText = oa.output[0].content[0].text.value;
    } else {
      // Dernier fallback: cherche un champ text dans l’arbre
      throw new Error('No content found in OpenAI response');
    }

    // 6) Parse JSON (ton parseur robuste)
    function safeParse(content: string) {
      // enlève des fences au cas où
      const m = content.match(/```json\s*([\s\S]*?)\s*```/i);
      const raw = m ? m[1] : content;
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error('JSON parse failed from OpenAI output');
      }
      if (Array.isArray(parsed?.travel_segments)) return parsed.travel_segments;
      if (Array.isArray(parsed)) return parsed;
      throw new Error('No travel_segments array in model output');
    }

    const extractedSegments = safeParse(contentText).slice(0, 30).map((s: any) => ({
      segment_type: s.segment_type ?? 'other',
      title: s.title ?? 'Untitled Segment',
      start_date: s.start_date ?? null,
      end_date: s.end_date ?? null,
      provider: s.provider ?? null,
      reference_number: s.reference_number ?? null,
      address: s.address ?? null,
      description: s.commentaire ?? null, // si tu veux rester avec "commentaire", adapte le champ cible
      confidence: typeof s.confidence === 'number' ? s.confidence : 0.0,
      raw: s
    }));

    if (!extractedSegments.length) throw new Error('No valid segments extracted');

    // 7) Sauvegarde des segments + job “completed”
    const inserts = extractedSegments.map((s: any) => ({
      document_id,
      user_id: document.user_id,
      trip_id: document.trip_id,
      segment_type: s.segment_type,
      title: s.title,
      start_date: s.start_date,
      end_date: s.end_date,
      provider: s.provider,
      reference_number: s.reference_number,
      address: s.address,
      description: s.description,
      confidence: s.confidence,
      raw_data: s.raw,
      validated: false
    }));

    const { data: createdSegments, error: segErr } = await supabase
      .from('travel_segments')
      .insert(inserts)
      .select();
    if (segErr) throw new Error(`Failed to create travel segments: ${segErr.message}`);

    if (document.trip_id) {
      await supabase.from('trips').update({
        status: 'processing',
        updated_at: new Date().toISOString()
      }).eq('id', document.trip_id);
    }

    await supabase.from('document_processing_jobs').update({
      status: 'completed',
      ai_extracted_data: extractedSegments,
      updated_at: new Date().toISOString()
    }).eq('id', job.id);

    return new Response(JSON.stringify({
      success: true,
      document_id,
      job_id: job.id,
      segments_created: createdSegments.length,
      segment_ids: createdSegments.map(s => s.id),
      extracted_segments: extractedSegments,
      processing_method: 'openai_responses_file_ocr_gpt4o'
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    try {
      const document_id = bodyJson?.document_id;
      if (document_id) {
        const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
        await supabase.from('document_processing_jobs').update({
          status: 'failed',
          error_message: error?.message || String(error),
          updated_at: new Date().toISOString()
        }).eq('document_id', document_id);
      }
    } catch {}
    return new Response(JSON.stringify({ success: false, error: error?.message || String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

