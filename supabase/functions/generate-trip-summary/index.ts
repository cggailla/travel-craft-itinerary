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
    console.log('Starting trip summary generation');
    
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

    console.log(`Found ${steps.length} travel steps, generating summary`);

    // Prepare step information for AI
    const stepsInfo = steps.map((step, index) => {
      const accommodations = step.travel_step_segments
        .filter((tss: any) => tss.role === 'accommodation')
        .map((tss: any) => tss.travel_segments.title)
        .join(', ');
      
      const activities = step.travel_step_segments
        .filter((tss: any) => tss.role === 'activities')
        .map((tss: any) => tss.travel_segments.title)
        .join(', ');

      const transports = step.travel_step_segments
        .filter((tss: any) => tss.role === 'transport')
        .map((tss: any) => tss.travel_segments.title)
        .join(', ');

      const startDate = new Date(step.start_date).toLocaleDateString('fr-FR');
      const endDate = new Date(step.end_date).toLocaleDateString('fr-FR');
      const duration = Math.ceil((new Date(step.end_date).getTime() - new Date(step.start_date).getTime()) / (1000 * 60 * 60 * 24));

      return {
        position: index + 1,
        stepTitle: step.step_title,
        stepType: step.step_type,
        primaryLocation: step.primary_location,
        startDate,
        endDate,
        duration,
        accommodations,
        activities,
        transports
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
    const prompt = `Voici les étapes du voyage avec leurs informations détaillées :

${stepsInfo.map(step => 
  `Étape ${step.position} : ${step.stepTitle} (${step.primaryLocation})
  Dates : ${step.startDate} → ${step.endDate} (${step.duration} jour${step.duration > 1 ? 's' : ''})
  Transport : ${step.transports || 'Non spécifié'}
  Hébergement : ${step.accommodations || 'Non spécifié'}
  Activités : ${step.activities || 'Non spécifié'}`
).join('\n\n')}

Crée un résumé chronologique avec le format suivant :
- Titre de chaque étape : "Étape X – [Lieu] (dates au format JJ/MM)"
- Sous chaque titre : descriptif factuel court basé uniquement sur les informations disponibles
- Ton neutre et factuel : indiquer l'hôtel, les nuits, les activités, transferts
- Ne pas inventer d'informations touristiques`;

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
            content: 'Tu es un assistant spécialisé dans la préparation de carnets de voyage. Ton rôle est de transformer une structure JSON contenant des étapes et leurs segments en un résumé chronologique simple, factuel et lisible. Règles : Le résumé doit suivre l\'ordre chronologique des étapes. Chaque étape doit avoir un titre clair au format : "Étape X – [Lieu] (dates)". Sous chaque titre, écrire un court descriptif factuel basé uniquement sur les informations disponibles dans les segments. Le ton doit être neutre et factuel : indiquer l\'hôtel, les nuits prévues, les éventuelles activités, transferts ou vols. Ne pas inventer d\'informations touristiques. L\'objectif est de donner un contexte clair et compact qui servira ensuite à un générateur pour écrire du texte enrichi.'
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
      tripSummary
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