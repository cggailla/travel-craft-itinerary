import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  console.log('Upload document function called')
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const formData = await req.formData()
    const file = formData.get('file') as File
    let tripId = formData.get('trip_id') as string
    const userId = formData.get('user_id') as string
    
    if (!file) {
      throw new Error('No file provided')
    }
    
    if (!userId) {
      throw new Error('No user_id provided')
    }

    console.log(`Processing file: ${file.name}, size: ${file.size}, type: ${file.type}`)
    console.log(`Received trip_id: ${tripId}, user_id: ${userId}`)

    // If no trip_id provided, get the most recent trip for this user
    if (!tripId) {
      console.log('No trip_id provided, getting most recent trip for user...')
      const { data: recentTrip, error: tripError } = await supabase
        .from('trips')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (tripError) {
        console.error('Error getting recent trip:', tripError)
        throw new Error('No trip_id provided and could not find recent trip for user')
      }

      tripId = recentTrip.id
      console.log(`Using most recent trip_id: ${tripId}`)
    }

    // Sanitize filename for storage (remove spaces, special chars)
    const sanitizeFilename = (filename: string) => {
      return filename
        .replace(/\s+/g, '_')           // Replace spaces with underscores
        .replace(/['"]/g, '')           // Remove quotes and apostrophes
        .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace other special chars with underscores
        .replace(/_+/g, '_')            // Replace multiple underscores with single
    }

    // Generate unique storage path
    const timestamp = new Date().getTime()
    const sanitizedFilename = sanitizeFilename(file.name)
    const storagePath = `${timestamp}-${sanitizedFilename}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('travel-documents')
      .upload(storagePath, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    console.log('File uploaded successfully:', uploadData.path)

    // Create document record in database with trip_id and user_id
    const { data: documentData, error: documentError } = await supabase
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
      .single()

    if (documentError) {
      console.error('Database error:', documentError)
      throw new Error(`Database error: ${documentError.message}`)
    }

    console.log('Document record created:', documentData.id)

    // Create processing job
    const { data: jobData, error: jobError } = await supabase
      .from('document_processing_jobs')
      .insert({
        document_id: documentData.id,
        status: 'pending',
        processing_type: 'ocr_and_ai'
      })
      .select()
      .single()

    if (jobError) {
      console.error('Job creation error:', jobError)
      throw new Error(`Job creation failed: ${jobError.message}`)
    }

    console.log('Processing job created:', jobData.id)

    return new Response(
      JSON.stringify({
        success: true,
        document_id: documentData.id,
        job_id: jobData.id,
        message: 'File uploaded successfully and queued for processing'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Upload function error:', error)
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