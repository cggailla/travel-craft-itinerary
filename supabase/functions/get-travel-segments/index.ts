import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
};

Deno.serve(async (req) => {
  console.log('📜 Get travel segments function called');

  if (req.method === 'OPTIONS') {
    console.log('🟡 OPTIONS preflight detected');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ------------------------------------------------------------
    // 1️⃣ Parse des paramètres URL
    // ------------------------------------------------------------
    const url = new URL(req.url);
    const trip_id = url.searchParams.get('trip_id');
    const status = url.searchParams.get('status');

    if (!trip_id) {
      console.warn('❌ Missing trip_id parameter');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing trip_id parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      );
    }

    // ------------------------------------------------------------
    // 2️⃣ Authentification et création du client Supabase
    // ------------------------------------------------------------
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('❌ Missing or malformed Authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 },
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    console.log('✅ Authorization token received (masked):', `${token.slice(0, 8)}...${token.slice(-8)}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Client sans RLS pour décoder le user
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      console.error('❌ Invalid token', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 },
      );
    }

    const userId = userData.user.id;
    console.log('✅ Authenticated user id:', userId);

    // ✅ Client RLS-aware
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // ------------------------------------------------------------
    // 3️⃣ Vérification ownership (via RLS)
    // ------------------------------------------------------------
    console.log('🔍 Checking trip ownership for trip_id:', trip_id);
    const { data: trip, error: tripErr } = await supabaseUser
      .from('trips')
      .select('user_id')
      .eq('id', trip_id)
      .single();

    if (tripErr || !trip) {
      console.warn('🚫 Trip ownership check failed or trip not found', tripErr);
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 },
      );
    }

    console.log('✅ Trip ownership confirmed');

    // ------------------------------------------------------------
    // 4️⃣ Récupération des segments
    // ------------------------------------------------------------
    console.log(`📦 Fetching travel segments for trip: ${trip_id}, status filter: ${status}`);

    let query = supabaseUser
      .from('travel_segments')
      .select(`
        *,
        documents!travel_segments_document_id_fkey (
          id,
          file_name,
          file_type,
          created_at,
          trip_id
        )
      `)
      .eq('trip_id', trip_id)
      .order('start_date', { ascending: true, nullsFirst: false })
      .order('sequence_order', { ascending: true });

    if (status === 'validated') {
      query = query.eq('validated', true);
    } else if (status === 'unvalidated') {
      query = query.eq('validated', false);
    }

    const { data: segments, error } = await query;

    if (error) {
      console.error('❌ Database error:', error);
      throw new Error(`Failed to fetch travel segments: ${error.message}`);
    }

    console.log(`✅ Found ${segments?.length || 0} travel segments`);

    // ------------------------------------------------------------
    // 5️⃣ Groupement par date
    // ------------------------------------------------------------
    const groupedByDate: Record<string, any[]> = {};
    const undatedSegments: any[] = [];

    segments?.forEach((segment) => {
      if (segment.start_date) {
        const dateKey = new Date(segment.start_date).toISOString().split('T')[0];
        groupedByDate[dateKey] ??= [];
        groupedByDate[dateKey].push(segment);
      } else {
        undatedSegments.push(segment);
      }
    });

    const timeline = Object.keys(groupedByDate)
      .sort()
      .map((date) => ({
        date,
        segments: groupedByDate[date],
      }));

    // ------------------------------------------------------------
    // 6️⃣ Réponse finale
    // ------------------------------------------------------------
    return new Response(
      JSON.stringify({
        success: true,
        segments: segments || [],
        timeline,
        undated_segments: undatedSegments,
        total_count: segments?.length || 0,
        message: 'Travel segments retrieved successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('💥 Get travel segments function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
