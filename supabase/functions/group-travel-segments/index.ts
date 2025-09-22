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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`Grouping segments for trip: ${trip_id}`)

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

    // Create the optimized prompt for LLM (favoring indices over UUIDs)
    const prompt = `Tu es un expert en structuration d'itinéraires pour carnet de voyage.
Ta mission : regrouper des segments atomiques (vols, transferts, hôtels, activités, etc.) en **étapes ("steps")** cohérentes.

RÈGLES MÉTIER OBLIGATOIRES
1) Pas de split intrajournalier : une étape couvre des **journées entières** (matin→soir).
   • Si un check-in/check-out/arrivée se produit en milieu de journée, l'étape qui en résulte **commence le matin** de ce jour, et l'étape précédente **se termine la veille au soir**.
2) Nouvelle étape lorsqu'on change de **base** (hôtel/ville/île/parc) ou qu'il y a une **journée de transition** (transports dominants sans base stable).
3) Un même jour n'appartient qu'à **une seule étape**.
4) Conserver l'ordre chronologique des segments.
5) Ne SUPPRIME, n'AJOUTE ni ne MODIFIE aucun segment d'entrée.

CONTRAINTES D'AFFILIATION
- Chaque segment d'entrée (index 0-based affiché ci-dessous) doit apparaître **exactement une fois**.
- Les `step_id` doivent être **compacts et ordonnés**: STEP_001, STEP_002, STEP_003… dans l'ordre d'apparition chronologique.
- Les segments d'une même étape doivent être cohérents (même base ou journée de transition).
- Si l'information est ambiguë, tranche de façon raisonnable en respectant les règles ci-dessus.

TYPES D'ÉTAPES AUTORISÉS : arrival_day, city_stay, safari_experience, travel_day, departure_day, beach_stay, mountain_stay, cultural_visit, activity_day, other

RÔLES AUTORISÉS DANS LOGICAL_SEQUENCE : arrival_transport, departure_transport, accommodation_checkin, accommodation_checkout, main_activity, secondary_activity, meal, transfer, other

SORTIE STRICTE (AUCUN TEXTE HORS JSON)
Renvoyer un UNIQUE objet JSON conforme au schéma suivant. Utilise des indices 0-based pour référencer les segments (champ obligatoire `segment_index`). `segment_id` peut être fourni en plus, mais sera ignoré si `segment_index` est présent.

{
  "travel_steps": [
    {
      "step_id": "STEP_001",
      "step_type": "arrival_day",
      "step_title": "Arrivée à Nairobi",
      "start_date": "2024-03-15",
      "end_date": "2024-03-15",
      "primary_location": "Nairobi",
      "segment_indices": [0, 1, 2],
      "logical_sequence": [
        { "segment_index": 0, "position_in_step": 1, "role": "arrival_transport" },
        { "segment_index": 1, "position_in_step": 2, "role": "accommodation_checkin" },
        { "segment_index": 2, "position_in_step": 3, "role": "secondary_activity" }
      ]
    }
  ]
}

SEGMENTS À TRAITER (indices 0-based inclus):
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
      throw new Error(`Failed to parse LLM response: ${parseError.message}`)
    }

    if (!stepsData.travel_steps || !Array.isArray(stepsData.travel_steps)) {
      throw new Error('Invalid response format from LLM')
    }

    // Log what we received from the LLM to debug UUID issues
    console.log('LLM response structure:', JSON.stringify(stepsData, null, 2))
    for (const step of stepsData.travel_steps) {
      if (step.logical_sequence) {
        console.log(`Step ${step.step_id} segment IDs:`, step.logical_sequence.map(s => s.segment_id))
      }
    }

    console.log(`Processing ${stepsData.travel_steps.length} travel steps`)

    // Build robust lookup structures for segment resolution
    const idSet = new Set<string>()
    const byIndex = new Map<number, string>()
    const normalizedToId = new Map<string, string>() // 32-hex (no dashes) -> original id

    const normalize = (s: string) => s.replace(/[^a-fA-F0-9]/g, '').toLowerCase()

    segments.forEach((segment, index) => {
      idSet.add(segment.id)
      byIndex.set(index, segment.id)
      normalizedToId.set(normalize(segment.id), segment.id)
    })

    function resolveSegmentRef(ref: any): string | null {
      // 1) Prefer explicit index
      if (
        ref &&
        Number.isInteger(ref.segment_index) &&
        ref.segment_index >= 0 &&
        ref.segment_index < segments.length
      ) {
        return byIndex.get(ref.segment_index) as string
      }

      // 2) Exact UUID string
      const sid = ref?.segment_id
      if (typeof sid === 'string' && idSet.has(sid)) return sid

      // 3) Fuzzy matching on normalized string (no dashes)
      if (typeof sid === 'string') {
        const norm = normalize(sid)
        if (norm.length >= 8) {
          // Try exact normalized match first
          const exact = normalizedToId.get(norm)
          if (exact) return exact

          // Try prefix match
          const candidates = segments.filter((s) => normalize(s.id).startsWith(norm))
          if (candidates.length === 1) return candidates[0].id

          // Try substring match
          const incl = segments.filter((s) => normalize(s.id).includes(norm))
          if (incl.length === 1) return incl[0].id
        }

        // 4) Numeric-only => treat as index (avoid partial numbers like "20b6...")
        if (/^\d+$/.test(sid)) {
          const idx = parseInt(sid, 10)
          if (idx >= 0 && idx < segments.length) return byIndex.get(idx) as string
        }
      }

      return null
    }

    // Ensure each step has a logical_sequence built from indices when possible, then resolve to UUIDs
    for (const step of stepsData.travel_steps) {
      // Build fallback logical_sequence from segment_indices or segment_ids
      if (!Array.isArray(step.logical_sequence) || step.logical_sequence.length === 0) {
        if (Array.isArray(step.segment_indices)) {
          step.logical_sequence = step.segment_indices.map((idx: number, i: number) => ({
            segment_index: idx,
            position_in_step: i + 1,
            role: 'other'
          }))
        } else if (Array.isArray(step.segment_ids)) {
          step.logical_sequence = step.segment_ids.map((sid: string, i: number) => ({
            segment_id: sid,
            position_in_step: i + 1,
            role: 'other'
          }))
        } else {
          console.error(`Step ${step.step_id} has no logical_sequence/segment_indices/segment_ids`)
          throw new Error(`Step ${step.step_id} has no segments to link`)
        }
      }

      // Resolve each item in sequence to a valid UUID from our segments list
      for (const [i, seq] of step.logical_sequence.entries()) {
        if (seq.position_in_step == null) seq.position_in_step = i + 1
        if (!seq.role) seq.role = 'other'

        const resolved = resolveSegmentRef(seq)
        if (!resolved) {
          console.error(`Could not resolve segment reference in step ${step.step_id}:`, seq)
          throw new Error(`Invalid segment reference in step ${step.step_id}`)
        }
        // Mutate to the canonical UUID and drop segment_index to avoid confusion
        seq.segment_id = resolved
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
        const stepSegments = step.logical_sequence.map(seq => ({
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