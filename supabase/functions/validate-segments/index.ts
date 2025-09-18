import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log('Validate segments function called')
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { segment_ids } = await req.json()
    
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
      .update({ validated: true })
      .in('id', segment_ids)
      .select()

    if (error) {
      console.error('Database error:', error)
      throw new Error(`Failed to validate segments: ${error.message}`)
    }

    console.log(`Successfully validated ${updatedSegments?.length || 0} segments`)

    return new Response(
      JSON.stringify({
        success: true,
        validated_count: updatedSegments?.length || 0,
        segments: updatedSegments,
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