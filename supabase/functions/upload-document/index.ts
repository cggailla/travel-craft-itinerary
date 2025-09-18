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
    const tripId = formData.get('trip_id') as string
    
    if (!file) {
      throw new Error('No file provided')
    }

    console.log(`Processing file: ${file.name}, size: ${file.size}, type: ${file.type}`)

    // Generate unique storage path
    const timestamp = new Date().getTime()
    const storagePath = `${timestamp}-${file.name}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('travel-documents')
      .upload(storagePath, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    console.log('File uploaded successfully:', uploadData.path)

    // Create document record in database
    const { data: documentData, error: documentError } = await supabase
      .from('documents')
      .insert({
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: uploadData.path,
        trip_id: tripId || null,
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