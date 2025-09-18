import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Get trips function called');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id');
    const status = url.searchParams.get('status');

    console.log('Fetching trips for user:', userId, 'status:', status);

    let query = supabase
      .from('trips')
      .select(`
        *,
        documents (
          id,
          file_name,
          file_type,
          created_at,
          document_processing_jobs (
            status,
            error_message
          )
        )
      `)
      .order('created_at', { ascending: false });

    // Add filters if provided
    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: trips, error } = await query;

    if (error) {
      console.error('Error fetching trips:', error);
      throw new Error(`Failed to fetch trips: ${error.message}`);
    }

    console.log('Found', trips?.length || 0, 'trips');

    return new Response(JSON.stringify({
      success: true,
      trips: trips || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Get trips function error:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});