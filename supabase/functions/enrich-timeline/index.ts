import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tripId } = await req.json();
    console.log('Enriching timeline for trip:', tripId);

    if (!tripId) {
      throw new Error('tripId is required');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Récupérer les travel_steps validés + leurs travel_segments
    const { data: steps, error: stepsError } = await supabase
      .from('travel_steps')
      .select(`
        *,
        travel_step_segments (
          segment_id,
          travel_segments (*)
        )
      `)
      .eq('trip_id', tripId);

    if (stepsError) {
      throw new Error(`Error fetching steps: ${stepsError.message}`);
    }

    console.log(`Found ${steps?.length || 0} steps to enrich`);

    // Collecter tous les segments à enrichir
    const segmentsToEnrich: any[] = [];
    const stepsForRecommendations: any[] = [];
    
    for (const step of steps || []) {
      const segments = step.travel_step_segments?.map((tss: any) => tss.travel_segments) || [];
      
      for (const segment of segments) {
        if (!segment) continue;

        const segmentType = segment.segment_type?.toLowerCase();
        if (['hotel', 'flight', 'boat', 'activity'].includes(segmentType)) {
          segmentsToEnrich.push(segment);
        } else {
          console.log(`Skipping segment ${segment.id}: type ${segmentType} not supported for enrichment`);
        }
      }
      
      stepsForRecommendations.push(step);
    }

    console.log(`Found ${segmentsToEnrich.length} segments to enrich and ${stepsForRecommendations.length} steps for recommendations`);

    // Paralléliser l'enrichissement des segments par batches de 35
    const BATCH_SIZE = 35;
    const enrichedSegments: any[] = [];
    
    for (let i = 0; i < segmentsToEnrich.length; i += BATCH_SIZE) {
      const batch = segmentsToEnrich.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(segmentsToEnrich.length/BATCH_SIZE)} with ${batch.length} segments`);
      
      const enrichmentPromises = batch.map(async (segment) => {
        try {
          const enrichedData = await enrichSegmentWithPerplexity(segment);
          return { segment, enrichedData, success: true };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Error enriching segment ${segment.id}:`, errorMessage);
          return { segment, error: errorMessage, success: false };
        }
      });

      const results = await Promise.allSettled(enrichmentPromises);
      
      // Traiter les résultats et préparer les updates en batch
      const segmentUpdates: any[] = [];
      
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.success) {
          const { segment, enrichedData } = result.value;
          if (Object.keys(enrichedData).length > 0) {
            segmentUpdates.push({ id: segment.id, ...enrichedData });
            enrichedSegments.push({ ...segment, ...enrichedData });
          }
        }
      }

      // Update segments en batch si il y en a
      if (segmentUpdates.length > 0) {
        try {
          for (const update of segmentUpdates) {
            const { id, ...updateData } = update;
            const { error: updateError } = await supabase
              .from('travel_segments')
              .update(updateData)
              .eq('id', id);

            if (updateError) {
              console.error(`Error updating segment ${id}:`, updateError);
            } else {
              console.log(`Successfully enriched segment ${id}`);
            }
          }
        } catch (updateError) {
          console.error('Error batch updating segments:', updateError);
        }
      }

      // Petite pause entre les batches pour éviter la surcharge
      if (i + BATCH_SIZE < segmentsToEnrich.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Paralléliser la génération des recommandations par batches
    const allRecommendations: any[] = [];
    const REC_BATCH_SIZE = 30;
    
    for (let i = 0; i < stepsForRecommendations.length; i += REC_BATCH_SIZE) {
      const batch = stepsForRecommendations.slice(i, i + REC_BATCH_SIZE);
      console.log(`Processing recommendations batch ${Math.floor(i/REC_BATCH_SIZE) + 1}/${Math.ceil(stepsForRecommendations.length/REC_BATCH_SIZE)} with ${batch.length} steps`);
      
      const recommendationPromises = batch.map(async (step) => {
        try {
          const recommendations = await generateStepRecommendations(step);
          return { step, recommendations, success: true };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Error generating recommendations for step ${step.id}:`, errorMessage);
          return { step, error: errorMessage, success: false };
        }
      });

      const results = await Promise.allSettled(recommendationPromises);
      
      // Collecter toutes les recommandations de ce batch
      const batchRecommendations: any[] = [];
      
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.success) {
          const { step, recommendations } = result.value;
          if (recommendations && recommendations.length > 0) {
            const stepsRecs = recommendations.map(rec => ({
              ...rec,
              step_id: step.id,
              trip_id: tripId
            }));
            batchRecommendations.push(...stepsRecs);
            allRecommendations.push(...recommendations);
          }
        }
      }

      // Insérer toutes les recommandations de ce batch en une fois
      if (batchRecommendations.length > 0) {
        try {
          const { error: recError } = await supabase
            .from('travel_recommendations')
            .insert(batchRecommendations);

          if (recError) {
            console.error('Error batch inserting recommendations:', recError);
          } else {
            console.log(`Successfully added ${batchRecommendations.length} recommendations for batch`);
          }
        } catch (insertError) {
          console.error('Error inserting recommendations batch:', insertError);
        }
      }

      // Petite pause entre les batches
      if (i + REC_BATCH_SIZE < stepsForRecommendations.length) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }

    return new Response(JSON.stringify({
      success: true,
      enrichedSegments: enrichedSegments.length,
      recommendations: allRecommendations.length,
      message: `Enriched ${enrichedSegments.length} segments and generated ${allRecommendations.length} recommendations`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in enrich-timeline function:', errorMessage);
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function enrichSegmentWithPerplexity(segment: any) {
  if (!PERPLEXITY_API_KEY) {
    throw new Error('PERPLEXITY_API_KEY not configured');
  }

  const segmentType = segment.segment_type?.toLowerCase();
  
  // Gather existing data from the segment including enriched fields
  const existingData = {
    title: segment.title,
    address: segment.address,
    description: segment.description,
    provider: segment.provider,
    reference_number: segment.reference_number,
    start_date: segment.start_date,
    end_date: segment.end_date,
    phone: segment.phone,
    website: segment.website,
    star_rating: segment.star_rating,
    checkin_time: segment.checkin_time,
    checkout_time: segment.checkout_time,
    opening_hours: segment.opening_hours,
    activity_price: segment.activity_price,
    duration: segment.duration,
    booking_required: segment.booking_required,
    iata_code: segment.iata_code,
    icao_code: segment.icao_code,
    route: segment.route,
    ticket_price: segment.ticket_price
  };

  // Function to check if a value is empty/null
  const isEmpty = (value: any): boolean => {
    return value === null || value === undefined || value === '' || 
           (typeof value === 'string' && value.trim() === '');
  };

  // Remove null/undefined values for cleaner prompt
  const cleanExistingData = Object.fromEntries(
    Object.entries(existingData).filter(([_, value]) => !isEmpty(value))
  );

  console.log(`Segment ${segment.id} existing data:`, cleanExistingData);

  let prompt = '';
  let requestBody: any = {
    model: "sonar",
    web_search_options: {
      "search_context_size": "low"
    }
  };

  switch (segmentType) {
    case 'hotel':
      prompt = `Fournis les informations officielles de l'hôtel "${segment.title}" ${segment.address ? `à ${segment.address}` : ''}.
      Données déjà disponibles: ${JSON.stringify(cleanExistingData)}
      Retourne UNIQUEMENT un objet JSON valide (sans markdown) avec ces clés possibles: address, phone, website, checkin_time, checkout_time, star_rating.
      N'inclus aucune autre clé ni texte. Fournis uniquement les informations manquantes.`;
      
      break;

    case 'activity':
      prompt = `Fournis les informations officielles de l'activité "${segment.title}" ${segment.address ? `à ${segment.address}` : ''}.
      Données déjà disponibles: ${JSON.stringify(cleanExistingData)}
      Retourne UNIQUEMENT un objet JSON valide (sans markdown) avec ces clés possibles: address, phone, website, opening_hours, duration, booking_required.
      N'inclus aucune autre clé ni texte. Fournis uniquement les informations manquantes.`;
      
      break;

    case 'flight':
      prompt = `Fournis les informations officielles de l'aéroport "${segment.title}" ${segment.address ? `à ${segment.address}` : ''}.
      Données déjà disponibles: ${JSON.stringify(cleanExistingData)}
      Retourne UNIQUEMENT un objet JSON valide (sans markdown) avec ces clés possibles: address, iata_code, icao_code.
      N'inclus aucune autre clé ni texte. Fournis uniquement les informations manquantes.`;
      
      break;
      
            

    case 'boat':
      prompt = `Fournis les informations officielles du service de bateau/ferry "${segment.title}" ${segment.address ? `à ${segment.address}` : ''}.
      Données déjà disponibles: ${JSON.stringify(cleanExistingData)}
      Retourne UNIQUEMENT un objet JSON valide (sans markdown) avec ces clés possibles: address, phone, website, route, duration.
      N'inclus aucune autre clé ni texte. Fournis uniquement les informations manquantes.`;
      
      break;

    default:
      throw new Error(`Unsupported segment type: ${segmentType}`);
  }

  requestBody.messages = [
    {
      role: 'system',
      content: 'Be precise and concise. Retourne UNIQUEMENT un JSON valide sans markdown.'
    },
    {
      role: 'user',
      content: prompt
    }
  ];
  console.log(`Perplexity request for segment ${segment.id} (${segmentType}) using model: ${requestBody.model}`);
  console.log('Prompt (first 300 chars):', String(prompt).slice(0, 300));

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Perplexity API error for segment ${segment.id}:`, response.status, errorText);
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  console.log(`Perplexity JSON received for segment ${segment.id}`);
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    console.error('No content returned from Perplexity API', data);
    throw new Error('No content returned from Perplexity API');
  }

  try {
    console.log('Content (raw, first 500 chars):', typeof content === 'string' ? content.slice(0, 500) : content);
    const cleanedContent = String(content).replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    console.log('Cleaned content (first 500 chars):', cleanedContent.slice(0, 500));
    const newEnrichmentData = JSON.parse(cleanedContent);

    console.log(`Perplexity returned data for segment ${segment.id}:`, newEnrichmentData);
    
    // Filter out fields that already exist and are not null/empty
    // Exception: address is always updated if Perplexity returns a new one
    const fieldsToUpdate: any = {};
    Object.entries(newEnrichmentData).forEach(([key, value]) => {
      const existingValue = existingData[key as keyof typeof existingData];
      
      // Special case for address: always update if we have a new value
      if (key === 'address' && !isEmpty(value)) {
        fieldsToUpdate[key] = value;
        console.log(`Will always update address: ${existingValue} -> ${value}`);
      }
      // For other fields: only update if existing value is empty/null and new value is not empty
      else if (key !== 'address' && isEmpty(existingValue) && !isEmpty(value)) {
        fieldsToUpdate[key] = value;
        console.log(`Will update ${key}: ${existingValue} -> ${value}`);
      } else {
        console.log(`Skipping ${key}: existing=${existingValue}, new=${value}`);
      }
    });
    
    console.log(`Found ${Object.keys(fieldsToUpdate).length} new fields to update for segment ${segment.id}:`, Object.keys(fieldsToUpdate));
    return fieldsToUpdate;
  } catch (parseError) {
    console.error('Error parsing Perplexity JSON response:', parseError);
    console.error('Raw content:', content);
    throw new Error('Invalid JSON response from Perplexity API');
  }
}

async function generateStepRecommendations(step: any) {
  if (!PERPLEXITY_API_KEY) {
    throw new Error('PERPLEXITY_API_KEY not configured');
  }

  const location = step.primary_location || step.step_title;
  const prompt = `Find 5 local recommendations for travelers in ${location}. Include a mix of restaurants, activities, and sites to visit.
  Return ONLY a valid JSON array where each item has: name, recommendation_type ("restaurant", "activity", "site"), description, address, rating (1-5), price_level (1-4 or null), opening_hours, website, phone.
  If information is not available, use null for that field.`;

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        {
          role: 'system',
          content: 'You are a local travel guide. Return ONLY valid JSON arrays without any markdown formatting or additional text.'
        },
        {
          role: 'user',
          content: prompt
        },
      ],
      web_search_options: {
        "search_context_size": "medium"
      }
    }),
  });

  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    return [];
  }

  try {
    const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const recommendations = JSON.parse(cleanedContent);
    
    if (!Array.isArray(recommendations)) {
      console.error('Recommendations is not an array:', recommendations);
      return [];
    }

    return recommendations.slice(0, 5);
  } catch (parseError) {
    console.error('Error parsing recommendations JSON response:', parseError);
    console.error('Raw content:', content);
    return [];
  }
}