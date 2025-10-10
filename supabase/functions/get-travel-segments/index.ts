import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

Deno.serve(async (req) => {
  console.log('Get travel segments function called')
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Auth: require Bearer token and use anon key so RLS applies
    const authHeader = (req.headers.get('authorization') || req.headers.get('Authorization') || '');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 })
    }
    const token = authHeader.replace(/^Bearer\s+/i, '');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 })
    }
    const user = userData.user;

    // If trip_id provided, verify ownership
    if (trip_id) {
      const { data: trip, error: tripErr } = await supabase.from('trips').select('user_id').eq('id', trip_id).single();
      if (tripErr || !trip || trip.user_id !== user.id) {
        return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 })
      }
    }

    const url = new URL(req.url)
    const trip_id = url.searchParams.get('trip_id')
    const status = url.searchParams.get('status') // 'all', 'validated', 'unvalidated'

    console.log(`Fetching travel segments for trip: ${trip_id}, status: ${status}`)

    let query = supabase
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
      .order('start_date', { ascending: true, nullsFirst: false })
      .order('sequence_order', { ascending: true })

    // Filter by trip if provided - now using travel_segments.trip_id directly
    if (trip_id) {
      query = query.eq('trip_id', trip_id)
    }

    // Filter by validation status if provided
    if (status === 'validated') {
      query = query.eq('validated', true)
    } else if (status === 'unvalidated') {
      query = query.eq('validated', false)
    }

    const { data: segments, error } = await query

    if (error) {
      console.error('Database error:', error)
      throw new Error(`Failed to fetch travel segments: ${error.message}`)
    }

    console.log(`Found ${segments?.length || 0} travel segments`)

    // Group segments by date for timeline view
    const groupedByDate: { [key: string]: any[] } = {}
    const undatedSegments: any[] = []
    
    segments?.forEach(segment => {
      if (segment.start_date) {
        const dateKey = new Date(segment.start_date).toISOString().split('T')[0]
        if (!groupedByDate[dateKey]) {
          groupedByDate[dateKey] = []
        }
        groupedByDate[dateKey].push(segment)
      } else {
        undatedSegments.push(segment)
      }
    })

    // Convert to timeline format
    const timeline = Object.keys(groupedByDate)
      .sort()
      .map(date => ({
        date,
        segments: groupedByDate[date]
      }))

    return new Response(
      JSON.stringify({
        success: true,
        segments: segments || [],
        timeline,
        undated_segments: undatedSegments,
        total_count: segments?.length || 0,
        message: 'Travel segments retrieved successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Get travel segments function error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})