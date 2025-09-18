import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  console.log('Validate segments function called')
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { segment_ids, trip_id } = await req.json()
    
    if (!segment_ids || !Array.isArray(segment_ids)) {
      throw new Error('Segment IDs array is required')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`Validating ${segment_ids.length} segments`)

    // Update segments as validated
    const { data: updatedSegments, error } = await supabase
      .from('travel_segments')
      .update({ 
        validated: true,
        updated_at: new Date().toISOString()
      })
      .in('id', segment_ids)
      .select('id, trip_id')

    if (error) {
      console.error('Database error:', error)
      throw new Error(`Failed to validate segments: ${error.message}`)
    }

    console.log(`Successfully validated ${updatedSegments?.length || 0} segments`)

    // Update trip status - use trip_id from segments if not provided
    const tripIdToUpdate = trip_id || updatedSegments?.[0]?.trip_id;
    
    if (tripIdToUpdate) {
      const { error: tripError } = await supabase
        .from('trips')
        .update({ 
          status: 'validated',
          updated_at: new Date().toISOString()
        })
        .eq('id', tripIdToUpdate)

      if (tripError) {
        console.error('Failed to update trip status:', tripError)
        // Don't throw error for trip update failure
      } else {
        console.log(`Trip ${tripIdToUpdate} status updated to validated`)
        
        // Trigger cleanup after trip validation
        try {
          await supabase.rpc('cleanup_abandoned_data')
          console.log('Cleanup triggered after trip validation')
        } catch (cleanupError) {
          console.error('Cleanup failed:', cleanupError)
          // Don't fail the main operation if cleanup fails
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        validated_count: updatedSegments?.length || 0,
        message: 'Segments validated successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Validate segments function error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})