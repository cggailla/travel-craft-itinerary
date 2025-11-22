import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// --- Mistral OCR via document_url (Option 1) ---
const mistralOCRFromUrl = async (documentUrl: string): Promise<{ text: string; confidence: number }> => {
  const mistralApiKey = Deno.env.get('MISTRAL_API_KEY');
  if (!mistralApiKey) throw new Error('MISTRAL_API_KEY not configured');

  // Build payload as per Mistral OCR docs: model + document.type=document_url
  const payload = {
    model: 'mistral-ocr-latest',
    document: {
      type: 'document_url',
      document_url: documentUrl,
    },
    include_image_base64: false,
  };

  const res = await fetch('https://api.mistral.ai/v1/ocr', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${mistralApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Mistral OCR API error: ${res.status} ${t}`);
  }

  const ocrResult = await res.json();

  // Concatenate markdown from all pages (Mistral returns pages[].markdown)
  let extractedText = '';
  if (ocrResult?.pages?.length) {
    extractedText = ocrResult.pages.map((p: any) => p?.markdown ?? '').join('\n\n');
  }

  // Simple confidence heuristic based on length
  const confidence = extractedText.length > 50 ? 0.9 : (extractedText.length > 10 ? 0.7 : 0.3);

  return { text: extractedText, confidence };
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Parse body ONCE and keep it for the entire handler (including catch)
  let bodyJson: { document_id?: string } = {};
  try {
    console.log('Extract text function called');
    bodyJson = await req.json().catch(() => ({}));
    const document_id = bodyJson?.document_id;
    if (!document_id) throw new Error('Missing document_id');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

    // Auth: require Bearer token and use ANON client so RLS applies
    const authHeader = (req.headers.get('authorization') || req.headers.get('Authorization') || '');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 })
    }
    const token = authHeader.replace(/^Bearer\s+/i, '');

    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '');
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 })
    }
    const user = userData.user;

    console.log('Processing document for OCR:', document_id);

    // 1) Load document row
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', document_id)
      .single();
    if (docError || !document) throw new Error(`Document not found: ${docError?.message ?? 'unknown error'}`);

    // Verify ownership: the document's trip belongs to the user (or documents.user_id)
    const docTripId = document.trip_id || document.tripId || document.trip;
    if (!docTripId) {
      // If document stores user_id directly, check it
      if (document.user_id && document.user_id !== user.id) {
        return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 })
      }
    } else {
      const { data: tripOwner, error: tripErr } = await supabase.from('trips').select('user_id').eq('id', docTripId).single();
      if (tripErr || !tripOwner || tripOwner.user_id !== user.id) {
        return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 })
      }
    }

    // 2) Load job row
    const { data: job, error: jobError } = await supabase
      .from('document_processing_jobs')
      .select('*')
      .eq('document_id', document_id)
      .single();
    if (jobError || !job) throw new Error(`Processing job not found: ${jobError?.message ?? 'unknown error'}`);

    // 3) Mark job as processing
    await supabase
      .from('document_processing_jobs')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', job.id);
    console.log('Mistral OCR job status updated to processing');

    // 4) Create a signed URL for the storage object, then send that URL to Mistral OCR
    const bucket = 'travel-documents';
    const path = document.storage_path as string;
    if (!path) throw new Error('Document has no storage_path');

    // Gate supported types: PDF and images
    const fileType: string = String(document.file_type ?? '').toLowerCase();
    if (!(fileType === 'application/pdf' || fileType.startsWith('image/'))) {
      console.log('Unsupported file type for OCR:', fileType);
      const errMsg = `Unsupported file type for OCR: ${fileType}`;
      await supabase
        .from('document_processing_jobs')
        .update({
          status: 'failed',
          error_message: errMsg,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      return new Response(JSON.stringify({ success: false, error: errMsg }), {
        status: 415,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create signed URL (10 minutes is plenty for a single OCR call)
    const { data: signed, error: signedErr } = await supabase
      .storage.from(bucket)
      .createSignedUrl(path, 60 * 10);
    if (signedErr || !signed?.signedUrl) throw new Error(`Failed to create signed URL: ${signedErr?.message ?? 'unknown error'}`);

    console.log('Calling Mistral OCR via document_url');
    const { text, confidence } = await mistralOCRFromUrl(signed.signedUrl);
    console.log(`Mistral OCR extraction completed, text length: ${text.length}, confidence: ${confidence}`);

    // 5) Update job with results
    const markdownText = text;
    const status = text ? 'completed' : 'failed';
    const updatePayload: Record<string, unknown> = {
      ocr_text: markdownText,
      ocr_confidence: confidence,
      status,
      updated_at: new Date().toISOString(),
    };
    if (!text) updatePayload.error_message = 'No text could be extracted via Mistral OCR';

    const { error: updateErr } = await supabase
      .from('document_processing_jobs')
      .update(updatePayload)
      .eq('id', job.id);
    if (updateErr) throw new Error(`Failed to update job: ${updateErr.message}`);

    console.log('Mistral OCR results saved successfully');

    return new Response(JSON.stringify({
      success: true,
      document_id,
      job_id: job.id,
      ocr_text: markdownText,
      ocr_confidence: confidence,
      file_type: fileType,
      extracted_length: text.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    console.error('Extract text function error:', err);

    // Best-effort job update without re-reading the request
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
            error_message: err instanceof Error ? err.message : 'Unexpected error',
            updated_at: new Date().toISOString(),
          })
          .eq('document_id', document_id);
      }
    } catch (uErr) {
      console.error('Failed to update job status:', uErr);
    }

    return new Response(JSON.stringify({
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
