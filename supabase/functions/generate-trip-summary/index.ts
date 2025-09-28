import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting trip pre-analysis generation');
    
    const { tripId } = await req.json();

    if (!tripId) {
      console.error('Missing tripId in request');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing tripId' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Fetching travel steps for trip: ${tripId}`);

    // Get all travel steps for the trip with their segments
    const { data: steps, error: stepsError } = await supabase
      .from('travel_steps')
      .select(`
        *,
        travel_step_segments!inner(
          segment_id,
          role,
          position_in_step,
          travel_segments!inner(*)
        )
      `)
      .eq('trip_id', tripId)
      .order('start_date', { ascending: true });

    if (stepsError) {
      console.error('Error fetching travel steps:', stepsError);
      return new Response(JSON.stringify({
        success: false,
        error: `Database error: ${stepsError.message}`
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!steps || steps.length === 0) {
      console.log('No travel steps found for trip');
      return new Response(JSON.stringify({
        success: true,
        tripSummary: "Aucune étape trouvée pour ce voyage."
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${steps.length} travel steps, building timeline data`);

    // Prepare step information for AI with chronological timeline
    const stepsInfo = steps.map((step, index) => {
      const startDate = new Date(step.start_date).toLocaleDateString('fr-FR');
      const endDate = new Date(step.end_date).toLocaleDateString('fr-FR');
      const duration = Math.ceil(
        (new Date(step.end_date).getTime() - new Date(step.start_date).getTime()) 
        / (1000 * 60 * 60 * 24)
      );

      // Keep timeline of segments ordered by position_in_step
      const timeline = step.travel_step_segments
        .sort((a: any, b: any) => a.position_in_step - b.position_in_step)
        .map((tss: any) => {
          const seg = tss.travel_segments;
          return {
            type: seg.segment_type,
            title: seg.title,
            description: seg.description,
            address: seg.address,
            start_date: seg.start_date,
            end_date: seg.end_date,
            role: tss.role
          };
        });

      return {
        position: index + 1,
        stepTitle: step.step_title,
        stepType: step.step_type,
        startDate,
        endDate,
        duration,
        timeline
      };
    });

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not found');
      return new Response(JSON.stringify({
        success: false,
        error: 'OpenAI API key not configured'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create AI prompt
    const prompt = `Voici les étapes du voyage avec leurs informations détaillées et chronologiques :

${stepsInfo.map(step => 
  `Étape ${step.position} : ${step.stepTitle} (${step.startDate} → ${step.endDate}, ${step.duration} jour${step.duration > 1 ? 's' : ''})
Timeline :
${step.timeline.map((seg: any) => `- ${seg.type} : ${seg.title}${seg.description ? " (" + seg.description + ")" : ""}${seg.address ? " [" + seg.address + "]" : ""}`).join('\n')}`
).join('\n\n')}

Crée un résumé chronologique avec le format EXACT suivant :
- Format de titre obligatoire : "Etape X - [Titre court et général] (dates au format JJ/MM) {Localisation majoritaire}"
- Sous chaque titre : descriptif factuel court basé sur la chronologie fournie

Règles pour le titre :
- Titre court et général avec la localisation principale (ex: "Séjour sur l'île Santiago", "Safari au Parc Tsavo East")
- Dates au format JJ/MM seulement

Règles pour la localisation majoritaire entre {} :
- Analyser les segments pour déterminer la ville/endroit principal
- Se baser sur les hébergements plutôt que les transports/aéroports
- Utiliser un nom de ville ou d'endroit, pas une adresse complète
- Regarder les adresses des segments pour extraire le lieu principal

Ton neutre et factuel, ne pas inventer d'informations touristiques.`;

    console.log('Calling OpenAI API');

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
            content: 'Tu es un assistant spécialisé dans la préparation de carnets de voyage. Ton rôle est de transformer des étapes de voyage (avec segments chronologiques) en un résumé lisible et factuel. Règles STRICTES : Le résumé doit suivre l\'ordre chronologique des étapes. Format de titre OBLIGATOIRE : "Etape X - [Titre court et général] (dates JJ/MM) {Localisation majoritaire}". Le titre doit être court et général avec la localisation principale (ex: "Séjour sur l\'île Santiago", "Safari au Parc Tsavo East"). La localisation majoritaire entre {} doit être un nom de ville ou d\'endroit, pas une adresse complète. Sous chaque titre, écrire un court descriptif factuel basé sur la chronologie (exemple : vol, puis transfert, puis check-in hôtel). Le ton doit être neutre et factuel. Ne pas inventer d\'informations touristiques. L\'objectif est de donner un contexte clair et compact avec un format parseable par regex.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      return new Response(JSON.stringify({
        success: false,
        error: `OpenAI API error: ${response.status} ${errorText}`
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const tripSummary = data.choices[0].message.content;

    console.log('Trip summary generated successfully');

    return new Response(JSON.stringify({
      success: true,
      tripSummary,
      stepsInfo // <-- utile si tu veux debugger ou inspecter
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-trip-summary function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
