import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TravelDocumentData {
  type: 'flight' | 'hotel' | 'activity' | 'car' | 'other'
  title: string
  startDate: string
  endDate?: string
  provider: string
  reference?: string
  address?: string
  description: string
  confidence: number
  details: { [key: string]: any }
}

Deno.serve(async (req) => {
  console.log('Process document function called')
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { document_id } = await req.json()
    
    if (!document_id) {
      throw new Error('Document ID is required')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`Processing document: ${document_id}`)

    // Get document and processing job
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*, document_processing_jobs(*)')
      .eq('id', document_id)
      .single()

    if (docError || !document) {
      throw new Error('Document not found')
    }

    const jobId = document.document_processing_jobs[0]?.id
    if (!jobId) {
      throw new Error('No processing job found for document')
    }

    // Update job status to processing
    await supabase
      .from('document_processing_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId)

    console.log('Job status updated to processing')

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('travel-documents')
      .download(document.storage_path)

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`)
    }

    console.log('File downloaded for processing')

    // Convert file to base64 for AI processing
    const arrayBuffer = await fileData.arrayBuffer()
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
    const mimeType = document.file_type
    const dataUrl = `data:${mimeType};base64,${base64Data}`

    console.log('File converted to base64, calling OpenAI API')

    // Call OpenAI Vision API
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const prompt = `Analyse ce document de voyage et extrait les informations dans un format JSON structuré.

Retourne UNIQUEMENT un objet JSON valide avec cette structure exacte:
{
  "type": "flight" | "hotel" | "activity" | "car" | "other",
  "title": "Titre descriptif court",
  "startDate": "YYYY-MM-DD" ou "YYYY-MM-DDTHH:mm",
  "endDate": "YYYY-MM-DD" ou "YYYY-MM-DDTHH:mm" (optionnel),
  "provider": "Nom de la compagnie/fournisseur",
  "reference": "Numéro de confirmation/référence",
  "address": "Adresse ou lieux (départ-arrivée pour vols)",
  "description": "Description détaillée des informations extraites",
  "confidence": 0.95,
  "details": {
    // Informations spécifiques selon le type
  }
}

Règles importantes:
- Détermine le TYPE avec précision (flight/hotel/activity/car/other)
- Extrait les DATES au format ISO (si pas d'heure, utilise juste YYYY-MM-DD)
- Pour les vols: address = "Départ - Arrivée", details inclut classe, siège, etc.
- Pour les hôtels: address = adresse complète, details inclut type de chambre, etc.
- Confidence entre 0.1 et 1.0 selon la clarté des infos
- Si incertain sur un champ, utilise "Non spécifié" ou null`

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en extraction d\'informations de documents de voyage. Tu réponds UNIQUEMENT avec du JSON valide, sans commentaires.'
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: dataUrl } }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    })

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`)
    }

    const openaiData = await openaiResponse.json()
    const content = openaiData.choices[0]?.message?.content

    if (!content) {
      throw new Error('Empty response from OpenAI API')
    }

    console.log('OpenAI response received, parsing JSON')

    // Parse AI response
    let parsedData: TravelDocumentData
    try {
      parsedData = JSON.parse(content.trim())
    } catch (parseError) {
      console.error('JSON parsing error:', content)
      throw new Error('Invalid JSON response from AI')
    }

    // Update processing job with results
    await supabase
      .from('document_processing_jobs')
      .update({
        status: 'completed',
        ai_extracted_data: parsedData,
        ocr_confidence: parsedData.confidence
      })
      .eq('id', jobId)

    // Create travel segment record
    const { data: segmentData, error: segmentError } = await supabase
      .from('travel_segments')
      .insert({
        document_id: document_id,
        segment_type: parsedData.type,
        title: parsedData.title,
        start_date: parsedData.startDate ? new Date(parsedData.startDate).toISOString() : null,
        end_date: parsedData.endDate ? new Date(parsedData.endDate).toISOString() : null,
        provider: parsedData.provider,
        reference_number: parsedData.reference,
        address: parsedData.address,
        description: parsedData.description,
        confidence: parsedData.confidence,
        raw_data: parsedData.details,
        validated: false
      })
      .select()
      .single()

    if (segmentError) {
      console.error('Segment creation error:', segmentError)
      throw new Error(`Failed to create travel segment: ${segmentError.message}`)
    }

    console.log(`Processing completed successfully for document ${document_id}`)

    return new Response(
      JSON.stringify({
        success: true,
        document_id: document_id,
        segment_id: segmentData.id,
        extracted_data: parsedData,
        message: 'Document processed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Process document function error:', error)

    // Try to update job status to failed if we have document_id
    try {
      const { document_id } = await req.json()
      if (document_id) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        
        const { data: jobs } = await supabase
          .from('document_processing_jobs')
          .select('id')
          .eq('document_id', document_id)
          .eq('status', 'processing')
        
        if (jobs && jobs.length > 0) {
          await supabase
            .from('document_processing_jobs')
            .update({
              status: 'failed',
              error_message: error.message
            })
            .eq('id', jobs[0].id)
        }
      }
    } catch (updateError) {
      console.error('Failed to update job status:', updateError)
    }

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