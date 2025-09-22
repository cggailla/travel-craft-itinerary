import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

Deno.serve(async (req) => {
  console.log('Generate step content function called')
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const { tripId, stepId } = await req.json()
    
    if (!tripId) {
      throw new Error('Trip ID is required')
    }
    
    if (!stepId) {
      throw new Error('Step ID is required')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`Generating content for trip ${tripId}, step ${stepId}`)

    // Fetch the travel step with its segments
    const { data: step, error: stepError } = await supabase
      .from('travel_steps')
      .select(`
        *,
        travel_step_segments(
          position_in_step,
          role,
          travel_segments(
            *,
            documents(id, file_name, file_type, created_at),
            document_processing_jobs(status, error_message)
          )
        )
      `)
      .eq('trip_id', tripId)
      .eq('step_id', stepId)
      .single()

    if (stepError || !step) {
      console.error('Error fetching step:', stepError)
      throw new Error(`Failed to fetch step: ${stepError?.message || 'Step not found'}`)
    }

    // Extract and sort segments by position in step
    const segments = step.travel_step_segments
      ?.map(tss => ({
        ...tss.travel_segments,
        position_in_step: tss.position_in_step,
        role: tss.role
      }))
      .sort((a, b) => a.position_in_step - b.position_in_step) || []

    console.log(`Found step with ${segments.length} segments`)

    if (segments.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No segments found for this step'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      )
    }

    // Create the step object for the prompt
    const stepData = {
      step_id: step.step_id,
      step_type: step.step_type,
      step_title: step.step_title,
      start_date: step.start_date,
      end_date: step.end_date,
      primary_location: step.primary_location,
      segments: segments
    }

    // Generate the prompt and call OpenAI
    const prompt = createStepPrompt(stepData)
    
    console.log('Calling OpenAI...')

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-search-preview',
        messages: [
          { role: 'system', content: 'Tu es un expert en rédaction de carnets de voyage dans le style ADGENTES. Tu crées du contenu engageant et informatif en français.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      }),
    });

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenAI API error:', error)
      throw new Error(`OpenAI API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    const generatedHtml = data.choices[0].message.content
    
    console.log('Content generated successfully')

    return new Response(
      JSON.stringify({
        success: true,
        stepId: stepId,
        html: generatedHtml
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Generate step content function error:', error)
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

function createStepPrompt(step: any) {
  // Helper function to get emoji based on segment type
  function getSegmentTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'flight': '✈️',
      'hotel': '🏨',
      'activity': '🎯',
      'car': '🚗',
      'train': '🚂',
      'boat': '⛵',
      'pass': '🎫',
      'transfer': '🚌',
      'other': '📍'
    }
    return icons[type] || '📍'
  }

  // Helper function to format time if available
  function formatTime(dateString: string | null): string | null {
    if (!dateString) return null
    try {
      const date = new Date(dateString)
      const hours = date.getHours()
      const minutes = date.getMinutes()
      
      // Only return time if it's not midnight (which often indicates date-only)
      if (hours === 0 && minutes === 0) return null
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    } catch {
      return null
    }
  }

  const startDateFormatted = step.start_date ? new Date(step.start_date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : ''

  const endDateFormatted = step.end_date && step.end_date !== step.start_date ? 
    new Date(step.end_date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : ''

  const dateRange = endDateFormatted ? `${startDateFormatted} - ${endDateFormatted}` : startDateFormatted

  const segmentsList = step.segments.map((segment: any, index: number) => {
    const icon = getSegmentTypeIcon(segment.segment_type)
    const time = formatTime(segment.start_date)
    const timeStr = time ? ` (${time})` : ''
    
    return `${index + 1}. ${icon} ${segment.title}${timeStr}
   Type: ${segment.segment_type}
   Rôle dans l'étape: ${segment.role || 'non spécifié'}
   ${segment.provider ? `Prestataire: ${segment.provider}` : ''}
   ${segment.reference_number ? `Référence: ${segment.reference_number}` : ''}
   ${segment.address ? `Lieu: ${segment.address}` : ''}
   ${segment.description ? `Description: ${segment.description}` : ''}`
  }).join('\n\n')

  return `Tu dois créer le contenu HTML d'une étape de carnet de voyage dans le style ADGENTES.

**ÉTAPE À RÉDIGER:**
🏷️ **${step.step_title}** (${step.step_type})
📅 **Période:** ${dateRange}
📍 **Lieu principal:** ${step.primary_location || 'Non spécifié'}

**SEGMENTS DE L'ÉTAPE (dans l'ordre logique):**
${segmentsList}

**STYLE ET EXIGENCES ADGENTES:**

🎨 **Style narratif:** Adopte un ton personnel, immersif et authentique. Raconte comme si tu avais vécu cette étape.

📖 **Structure narrative:** 
- Présente l'étape et son contexte
- Raconte chronologiquement les activités avec transitions fluides entre les segments
- Termine par un bilan/réflexion sur cette étape du voyage

🔍 **Enrichissement obligatoire:** 
- Recherche et intègre des informations réelles sur les lieux, prestataires, et activités mentionnés
- Ajoute des détails culturels, historiques, ou pratiques pertinents
- Mentionne des spécialités locales, conseils, ou anecdotes authentiques

⏰ **Chronologie:** Respecte l'ordre logique des segments (position_in_step) et leurs rôles dans l'étape.

🎯 **Contenu par type de segment:**
- **Vols/Transports:** Ambiance, paysages vus, détails pratiques
- **Hôtels:** Atmosphère, services, localisation, recommandations
- **Activités:** Expérience vécue, émotions, conseils pratiques
- **Restaurants:** Plats, ambiance, spécialités, prix approximatifs

🎨 **Mise en forme HTML:**
- Utilise les classes CSS disponibles : .step-content, .segment-block, .highlight, .practical-info
- Structure avec des paragraphes <p>, listes <ul>/<ol>, emphases <em>/<strong>
- Ajoute des emoji pertinents pour illustrer
- Utilise .highlight pour les moments clés et .practical-info pour les conseils

⭐ **Ton authentique:** Écris comme un voyageur passionné qui partage son expérience avec un ami.

**GÉNÉRE UNIQUEMENT LE HTML DE CONTENU, PAS LA STRUCTURE COMPLÈTE DE PAGE.**`
}