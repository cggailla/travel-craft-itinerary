import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Validate trip function called');
    
    const { trip_id } = await req.json();
    if (!trip_id) throw new Error('Missing trip_id');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Validating trip:', trip_id);

    // Get all segments for this trip
    const { data: segments, error: segmentsError } = await supabase
      .from('travel_segments')
      .select(`
        *,
        documents!inner (
          trip_id
        )
      `)
      .eq('documents.trip_id', trip_id);

    if (segmentsError) {
      throw new Error(`Failed to fetch trip segments: ${segmentsError.message}`);
    }

    console.log('Validating', segments?.length || 0, 'segments for trip');

    // Mark all segments as validated
    if (segments && segments.length > 0) {
      const { error: updateError } = await supabase
        .from('travel_segments')
        .update({ 
          validated: true,
          updated_at: new Date().toISOString()
        })
        .in('id', segments.map(s => s.id));

      if (updateError) {
        throw new Error(`Failed to validate segments: ${updateError.message}`);
      }
    }

    // Update trip status to validated
    const { error: tripUpdateError } = await supabase
      .from('trips')
      .update({ 
        status: 'validated',
        updated_at: new Date().toISOString()
      })
      .eq('id', trip_id);

    if (tripUpdateError) {
      throw new Error(`Failed to update trip status: ${tripUpdateError.message}`);
    }

    console.log('Trip validated successfully');

    return new Response(JSON.stringify({
      success: true,
      trip_id,
      validated_segments: segments?.length || 0,
      message: 'Trip validated successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Validate trip function error:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});