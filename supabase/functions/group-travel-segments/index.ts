import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

Deno.serve(async (req) => {
  console.log('Group travel segments function called')
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const { trip_id } = await req.json()
    
    if (!trip_id) {
      throw new Error('Trip ID is required')
    }

    // Auth: require Bearer token and use ANON client so RLS applies
    const authHeader = (req.headers.get('authorization') || req.headers.get('Authorization') || '');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 })
    }
    const token = authHeader.replace(/^Bearer\s+/i, '');

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '')
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 })
    }
    const user = userData.user;

    console.log(`Grouping segments for trip: ${trip_id}`)

    // Verify trip ownership
    const { data: tripOwner, error: tripErr } = await supabase.from('trips').select('user_id').eq('id', trip_id).single();
    if (tripErr || !tripOwner || tripOwner.user_id !== user.id) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 })
    }

    // Fetch validated segments for the trip
    const { data: segments, error: segmentsError } = await supabase
      .from('travel_segments')
      .select('*')
      .eq('trip_id', trip_id)
      .eq('validated', true)
      .order('start_date', { ascending: true })
      .order('sequence_order', { ascending: true })

    if (segmentsError) {
      console.error('Error fetching segments:', segmentsError)
      throw new Error(`Failed to fetch segments: ${segmentsError.message}`)
    }

    if (!segments || segments.length === 0) {
      console.log('No validated segments found for trip')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No validated segments found',
          steps_created: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    console.log(`Found ${segments.length} validated segments`)

    // Prepare segments data for LLM
    const segmentsForLLM = segments.map((segment, index) => ({
      index,
      id: segment.id,
      segment_type: segment.segment_type,
      title: segment.title,
      start_date: segment.start_date,
      end_date: segment.end_date,
      provider: segment.provider,
      reference_number: segment.reference_number,
      address: segment.address,
      description: segment.description
    }))

    console.log('Segments being sent to LLM:', segmentsForLLM.map(s => ({ index: s.index, id: s.id, title: s.title })))

    // Create the simplified index-only prompt for LLM
    const prompt = `Tu es un expert en structuration d'itinéraires pour carnet de voyage.
Ta mission : regrouper des segments atomiques en **étapes ("steps")** cohérentes.

RÈGLES MÉTIER OBLIGATOIRES
1) Pas de split intrajournalier : une étape couvre des **journées entières** (matin→soir).
2) Nouvelle étape lorsqu'on change de **base** (hôtel/ville/île/parc) ou qu'il y a une **journée de transition**.
3) Un même jour n'appartient qu'à **une seule étape**.
4) Conserver l'ordre chronologique des segments.
5) Ne SUPPRIME, n'AJOUTE ni ne MODIFIE aucun segment d'entrée.

CONTRAINTES D'AFFILIATION
- Chaque segment d'entrée (index 0-based affiché ci-dessous) doit apparaître **exactement une fois**.
- Les step_id doivent être **compacts et ordonnés**: STEP_001, STEP_002, STEP_003… dans l'ordre chronologique.

TYPES D'ÉTAPES AUTORISÉS : arrival_day, city_stay, safari_experience, travel_day, departure_day, beach_stay, mountain_stay, cultural_visit, activity_day, other

RÔLES AUTORISÉS : arrival_transport, departure_transport, accommodation_checkin, accommodation_checkout, main_activity, secondary_activity, meal, transfer, other

IMPORTANT : Utilise UNIQUEMENT des indices 0-based pour référencer les segments. NE GÉNÈRE AUCUN UUID ou segment_id.

SORTIE STRICTE (JSON uniquement, aucun autre texte):
{
  "travel_steps": [
    {
      "step_id": "STEP_001",
      "step_type": "arrival_day", 
      "step_title": "Arrivée à Nairobi",
      "start_date": "2024-03-15",
      "end_date": "2024-03-15", 
      "primary_location": "Nairobi",
      "logical_sequence": [
        { "segment_index": 0, "position_in_step": 1, "role": "arrival_transport" },
        { "segment_index": 1, "position_in_step": 2, "role": "accommodation_checkin" }
      ]
    }
  ]
}

SEGMENTS À TRAITER (indices 0-based):
${JSON.stringify(segmentsForLLM, null, 2)}

RÉPONSE ATTENDUE : JSON uniquement, aucun autre texte.`

    console.log('Calling OpenAI for segment grouping...')

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'Tu es un expert en structuration d\'itinéraires. Tu renvoies UNIQUEMENT du JSON valide, aucun autre texte.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 4000
      }),
    });

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenAI API error:', error)
      throw new Error(`OpenAI API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    const generatedContent = data.choices[0].message.content.trim()
    
    console.log('OpenAI response received, parsing JSON...')

    // Parse the JSON response
    let stepsData
    try {
      // Clean the response in case there's markdown formatting
      const cleanedContent = generatedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      stepsData = JSON.parse(cleanedContent)
    } catch (parseError) {
      console.error('Failed to parse LLM response:', generatedContent)
      const errorMessage = parseError instanceof Error ? parseError.message : 'Erreur de parsing inconnue';
      throw new Error(`Failed to parse LLM response: ${errorMessage}`)
    }

    if (!stepsData.travel_steps || !Array.isArray(stepsData.travel_steps)) {
      throw new Error('Invalid response format from LLM')
    }

    // Log what we received from the LLM  
    console.log('LLM response structure:', JSON.stringify(stepsData, null, 2))

    console.log(`Processing ${stepsData.travel_steps.length} travel steps`)

    // Simple index-to-UUID resolver
    function resolveSegmentByIndex(segmentIndex: number): string | null {
      if (!segments || !Number.isInteger(segmentIndex) || segmentIndex < 0 || segmentIndex >= segments.length) {
        console.error(`Invalid segment index: ${segmentIndex} (valid range: 0-${segments ? segments.length - 1 : 'N/A'})`)
        return null
      }
      
      const segmentId = segments[segmentIndex].id
      console.log(`Resolved index ${segmentIndex} -> ${segmentId}`)
      return segmentId
    }

    // Process each step and resolve segment indices to UUIDs
    for (const step of stepsData.travel_steps) {
      // Ensure logical_sequence exists
      if (!Array.isArray(step.logical_sequence) || step.logical_sequence.length === 0) {
        console.error(`Step ${step.step_id} has no logical_sequence`)
        throw new Error(`Step ${step.step_id} has no segments to link`)
      }

      // Resolve each segment index to actual UUID
      for (const [i, seq] of step.logical_sequence.entries()) {
        if (seq.position_in_step == null) seq.position_in_step = i + 1
        if (!seq.role) seq.role = 'other'

        // Only use segment_index, ignore any segment_id from LLM
        if (typeof seq.segment_index !== 'number') {
          console.error(`Missing or invalid segment_index in step ${step.step_id}:`, seq)
          throw new Error(`Invalid segment_index in step ${step.step_id}`)
        }

        const resolvedId = resolveSegmentByIndex(seq.segment_index)
        if (!resolvedId) {
          throw new Error(`Could not resolve segment index ${seq.segment_index} in step ${step.step_id}`)
        }

        // Set the resolved UUID and remove index to avoid confusion  
        seq.segment_id = resolvedId
        delete seq.segment_index
      }

      console.log(`Step ${step.step_id} resolved ${step.logical_sequence.length} segments`)
    }

    // Clear existing steps for this trip
    const { error: deleteStepSegmentsError } = await supabase
      .from('travel_step_segments')
      .delete()
      .in('step_id', 
        await supabase
          .from('travel_steps')
          .select('id')
          .eq('trip_id', trip_id)
          .then(({ data }) => data?.map(step => step.id) || [])
      )

    if (deleteStepSegmentsError) {
      console.error('Error deleting existing step segments:', deleteStepSegmentsError)
    }

    const { error: deleteStepsError } = await supabase
      .from('travel_steps')
      .delete()
      .eq('trip_id', trip_id)

    if (deleteStepsError) {
      console.error('Error deleting existing steps:', deleteStepsError)
    }

    // Insert new steps and segments
    let stepsCreated = 0
    
    for (const step of stepsData.travel_steps) {
      // Insert the travel step
      const { data: insertedStep, error: stepError } = await supabase
        .from('travel_steps')
        .insert({
          trip_id: trip_id,
          step_id: step.step_id,
          step_type: step.step_type,
          step_title: step.step_title,
          start_date: step.start_date,
          end_date: step.end_date,
          primary_location: step.primary_location
        })
        .select('id')
        .single()

      if (stepError) {
        console.error('Error inserting step:', stepError)
        throw new Error(`Failed to insert step: ${stepError.message}`)
      }

      const stepDbId = insertedStep.id

      // Insert step segments relationships
      if (step.logical_sequence && Array.isArray(step.logical_sequence)) {
        const stepSegments = step.logical_sequence.map((seq: any) => ({
          step_id: stepDbId,
          segment_id: seq.segment_id,
          position_in_step: seq.position_in_step,
          role: seq.role
        }))

        const { error: segmentError } = await supabase
          .from('travel_step_segments')
          .insert(stepSegments)

        if (segmentError) {
          console.error('Error inserting step segments:', segmentError)
          throw new Error(`Failed to insert step segments: ${segmentError.message}`)
        }
      }

      stepsCreated++
    }

    console.log(`Successfully created ${stepsCreated} travel steps`)

    return new Response(
      JSON.stringify({
        success: true,
        steps_created: stepsCreated,
        message: `Successfully grouped segments into ${stepsCreated} travel steps`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Group travel segments function error:', error)
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