import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
};

Deno.serve(async (req) => {
  console.log('📤 Upload document function called');

  try {
    console.log(`➡️ Request method: ${req.method}`);
    console.log(`➡️ Request URL: ${req.url}`);

    // Dump basic request headers (non sensitive)
    const headersObj: Record<string, string> = {};
    for (const [k, v] of req.headers.entries()) headersObj[k] = v;
    console.log('Request headers (non-sensitive):', headersObj);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      console.log('🟡 OPTIONS preflight detected → returning CORS headers');
      return new Response(null, { headers: corsHeaders });
    }

    // ------------------------------------------------------------
    // 1️⃣ Authentification et création du client Supabase
    // ------------------------------------------------------------
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('❌ Missing or malformed Authorization header');
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    const token = authHeader.replace(/^Bearer\s+/i, '');
    console.log('✅ Authorization token present (masked):', `${token.slice(0, 8)}...${token.slice(-8)}`);

    // Create basic anon client (no RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Validate token
    console.log('🔍 Validating user token via supabase.auth.getUser...');
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      console.warn('❌ Token validation failed', authError);
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    const userId = userData.user.id;
    console.log('✅ Authenticated user id:', userId);

    // ✅ Recreate a Supabase client that enforces RLS with user token
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // ------------------------------------------------------------
    // 2️⃣ Lecture du FormData
    // ------------------------------------------------------------
    console.log('🧩 Parsing formData from request...');
    const formData = await req.formData();
    const formKeys = Array.from(formData.keys());
    console.log('FormData keys:', formKeys);

    const file = formData.get('file') as File;
    let tripId = formData.get('trip_id') as string;

    if (!file) {
      console.error('❌ No file provided in formData');
      throw new Error('No file provided');
    }

    console.log(`📄 File received: name=${file.name}, size=${file.size}, type=${file.type}`);
    console.log(`📌 trip_id: ${tripId || '(none provided)'}, user_id: ${userId}`);

    // ------------------------------------------------------------
    // 3️⃣ Vérification / récupération du trip_id
    // ------------------------------------------------------------
    if (!tripId) {
      console.log('ℹ️ No trip_id provided → fetching most recent trip for user');
      const { data: recentTrip, error: tripError } = await supabaseUser
        .from('trips')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (tripError || !recentTrip) {
        console.error('❌ Could not find a recent trip for user', tripError);
        throw new Error('No trip_id provided and could not find recent trip for user');
      }

      tripId = recentTrip.id;
      console.log(`✅ Using most recent trip_id: ${tripId}`);
    }

    // ------------------------------------------------------------
    // 4️⃣ Vérification ownership (avec client RLS-aware)
    // ------------------------------------------------------------
    console.log('🔐 Verifying trip ownership for tripId:', tripId);
    const { data: tripOwner, error: tripErr } = await supabaseUser
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single();

    console.log('Trip ownership query result:', { tripOwner, tripErr });

    if (tripErr || !tripOwner || tripOwner.user_id !== userId) {
      console.warn('🚫 Ownership check failed', {
        tripErr,
        tripOwnerUserId: tripOwner?.user_id,
        currentUserId: userId,
      });
      return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // ------------------------------------------------------------
    // 5️⃣ Upload fichier vers Supabase Storage
    // ------------------------------------------------------------
    const sanitizeFilename = (filename: string) =>
      filename
        .replace(/\s+/g, '_')
        .replace(/['"]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_');

    const timestamp = Date.now();
    const sanitizedFilename = sanitizeFilename(file.name);
    const storagePath = `${userId}/${timestamp}-${sanitizedFilename}`;

    console.log('🗂️ Uploading file to storage path:', storagePath);
    const { data: uploadData, error: uploadError } = await supabaseUser.storage
      .from('travel-documents')
      .upload(storagePath, file);

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    console.log('✅ File uploaded successfully:', uploadData?.path);

    // ------------------------------------------------------------
    // 6️⃣ Création du document en base
    // ------------------------------------------------------------
    const { data: documentData, error: documentError } = await supabaseUser
      .from('documents')
      .insert({
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: uploadData.path,
        trip_id: tripId,
        user_id: userId,
      })
      .select()
      .single();

    if (documentError) {
      console.error('❌ Database error inserting document record:', documentError);
      throw new Error(`Database error: ${documentError.message}`);
    }

    console.log('✅ Document record created:', documentData?.id);

    // ------------------------------------------------------------
    // 7️⃣ Création du job de traitement
    // ------------------------------------------------------------
    const { data: jobData, error: jobError } = await supabaseUser
      .from('document_processing_jobs')
      .insert({
        document_id: documentData.id,
        status: 'pending',
        processing_type: 'ocr_and_ai',
      })
      .select()
      .single();

    if (jobError) {
      console.error('❌ Job creation error:', jobError);
      throw new Error(`Job creation failed: ${jobError.message}`);
    }

    console.log('✅ Processing job created:', jobData?.id);

    // ------------------------------------------------------------
    // ✅ Réponse finale
    // ------------------------------------------------------------
    return new Response(
      JSON.stringify({
        success: true,
        document_id: documentData.id,
        job_id: jobData.id,
        message: 'File uploaded successfully and queued for processing',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('💥 Upload function error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Une erreur inconnue est survenue';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
