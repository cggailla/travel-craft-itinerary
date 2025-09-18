import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  console.log('Delete trip function called')
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { trip_id } = await req.json()
    
    if (!trip_id) {
      throw new Error('Trip ID is required')
    }

    console.log(`Deleting trip: ${trip_id}`)

    // Check if trip is validated (cannot delete validated trips)
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('status')
      .eq('id', trip_id)
      .single()

    if (tripError) {
      throw new Error(`Failed to check trip status: ${tripError.message}`)
    }

    if (trip.status === 'validated') {
      throw new Error('Cannot delete validated trip')
    }

    // Delete related travel segments
    const { error: segmentsError } = await supabase
      .from('travel_segments')
      .delete()
      .in('document_id', 
        supabase
          .from('documents')
          .select('id')
          .eq('trip_id', trip_id)
      )

    if (segmentsError) {
      console.error('Error deleting segments:', segmentsError)
    }

    // Delete related processing jobs
    const { error: jobsError } = await supabase
      .from('document_processing_jobs')
      .delete()
      .in('document_id', 
        supabase
          .from('documents')
          .select('id')
          .eq('trip_id', trip_id)
      )

    if (jobsError) {
      console.error('Error deleting processing jobs:', jobsError)
    }

    // Delete documents from storage
    const { data: documents } = await supabase
      .from('documents')
      .select('storage_path')
      .eq('trip_id', trip_id)

    if (documents && documents.length > 0) {
      const filePaths = documents.map(doc => doc.storage_path)
      const { error: storageError } = await supabase.storage
        .from('travel-documents')
        .remove(filePaths)

      if (storageError) {
        console.error('Error deleting files from storage:', storageError)
      }
    }

    // Delete documents from database
    const { error: documentsError } = await supabase
      .from('documents')
      .delete()
      .eq('trip_id', trip_id)

    if (documentsError) {
      throw new Error(`Failed to delete documents: ${documentsError.message}`)
    }

    // Delete trip
    const { error: deleteError } = await supabase
      .from('trips')
      .delete()
      .eq('id', trip_id)

    if (deleteError) {
      throw new Error(`Failed to delete trip: ${deleteError.message}`)
    }

    console.log(`Trip ${trip_id} deleted successfully`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Trip deleted successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Delete trip error:', error)
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