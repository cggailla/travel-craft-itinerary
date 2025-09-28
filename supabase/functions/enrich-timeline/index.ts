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

    const enrichedSegments: any[] = [];
    const allRecommendations: any[] = [];

    // Enrichir les segments par type
    for (const step of steps || []) {
      const segments = step.travel_step_segments?.map((tss: any) => tss.travel_segments) || [];
      
      for (const segment of segments) {
        if (!segment) {
          console.log(`Skipping null segment`);
          continue;
        }

        const segmentType = segment.segment_type?.toLowerCase();
        if (!['hotel', 'flight', 'boat', 'activity'].includes(segmentType)) {
          console.log(`Skipping segment ${segment.id}: type ${segmentType} not supported for enrichment`);
          continue;
        }

        try {
          const enrichedData = await enrichSegmentWithPerplexity(segment);
          
          if (Object.keys(enrichedData).length > 0) {
            const { error: updateError } = await supabase
              .from('travel_segments')
              .update(enrichedData)
              .eq('id', segment.id);

            if (updateError) {
              console.error(`Error updating segment ${segment.id}:`, updateError);
            } else {
              enrichedSegments.push({ ...segment, ...enrichedData });
              console.log(`Successfully enriched segment ${segment.id}`);
            }
          }
        } catch (segmentError) {
          const errorMessage = segmentError instanceof Error ? segmentError.message : 'Unknown error';
          console.error(`Error enriching segment ${segment.id}:`, errorMessage);
        }
      }

      // Générer des recommandations pour chaque step
      try {
        const recommendations = await generateStepRecommendations(step);
        
        if (recommendations.length > 0) {
          const { error: recError } = await supabase
            .from('travel_recommendations')
            .insert(
              recommendations.map(rec => ({
                ...rec,
                step_id: step.id,
                trip_id: tripId
              }))
            );

          if (recError) {
            console.error(`Error inserting recommendations for step ${step.id}:`, recError);
          } else {
            allRecommendations.push(...recommendations);
            console.log(`Successfully added ${recommendations.length} recommendations for step ${step.id}`);
          }
        }
      } catch (recError) {
        const errorMessage = recError instanceof Error ? recError.message : 'Unknown error';
        console.error(`Error generating recommendations for step ${step.id}:`, errorMessage);
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
    model: 'llama-3.1-sonar-small-128k-online',
    temperature: 0.2,
    max_tokens: 800
  };

  switch (segmentType) {
    case 'hotel':
      prompt = `Fournis les informations officielles de l'hôtel "${segment.title}" ${segment.address ? `à ${segment.address}` : ''}. 
      Informations déjà disponibles: ${JSON.stringify(cleanExistingData)}
      Fournis uniquement les informations manquantes.`;
      
      requestBody.response_format = {
        type: 'json_schema',
        json_schema: {
          name: 'HotelInfo',
          schema: {
            type: 'object',
            properties: {
              address: { type: 'string' },
              phone: { type: 'string' },
              website: { type: 'string' },
              checkin_time: { type: 'string' },
              checkout_time: { type: 'string' },
              star_rating: { type: 'number' }
            }
          }
        }
      };
      break;

    case 'activity':
      prompt = `Fournis les informations officielles de l'activité "${segment.title}" ${segment.address ? `à ${segment.address}` : ''}. 
      Informations déjà disponibles: ${JSON.stringify(cleanExistingData)}
      Fournis uniquement les informations manquantes.`;
      
      requestBody.response_format = {
        type: 'json_schema',
        json_schema: {
          name: 'ActivityInfo',
          schema: {
            type: 'object',
            properties: {
              address: { type: 'string' },
              phone: { type: 'string' },
              website: { type: 'string' },
              opening_hours: { type: 'string' },
              activity_price: { type: 'string' },
              duration: { type: 'string' },
              booking_required: { type: 'boolean' }
            }
          }
        }
      };
      break;

    case 'flight':
      prompt = `Fournis les informations officielles de l'aéroport "${segment.title}" ${segment.address ? `à ${segment.address}` : ''}. 
      Informations déjà disponibles: ${JSON.stringify(cleanExistingData)}
      Fournis uniquement les informations manquantes.`;
      
      requestBody.response_format = {
        type: 'json_schema',
        json_schema: {
          name: 'AirportInfo',
          schema: {
            type: 'object',
            properties: {
              address: { type: 'string' },
              iata_code: { type: 'string' },
              icao_code: { type: 'string' },
            }
          }
        }
      };
      break;
      
            

    case 'boat':
      prompt = `Fournis les informations officielles du service de bateau/ferry "${segment.title}" ${segment.address ? `à ${segment.address}` : ''}. 
      Informations déjà disponibles: ${JSON.stringify(cleanExistingData)}
      Fournis uniquement les informations manquantes.`;
      
      requestBody.response_format = {
        type: 'json_schema',
        json_schema: {
          name: 'BoatInfo',
          schema: {
            type: 'object',
            properties: {
              address: { type: 'string' },
              phone: { type: 'string' },
              website: { type: 'string' },
              route: { type: 'string' },
              ticket_price: { type: 'string' },
              duration: { type: 'string' }
            }
          }
        }
      };
      break;

    default:
      throw new Error(`Unsupported segment type: ${segmentType}`);
  }

  requestBody.messages = [
    {
      role: 'user',
      content: prompt
    }
  ];

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No content returned from Perplexity API');
  }

  try {
    const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const newEnrichmentData = JSON.parse(cleanedContent);
    
    console.log(`Perplexity returned data for segment ${segment.id}:`, newEnrichmentData);
    
    // Filter out fields that already exist and are not null/empty
    const fieldsToUpdate: any = {};
    Object.entries(newEnrichmentData).forEach(([key, value]) => {
      const existingValue = existingData[key as keyof typeof existingData];
      // Only update if existing value is empty/null and new value is not empty
      if (isEmpty(existingValue) && !isEmpty(value)) {
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
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [
        {
          role: 'system',
          content: 'You are a local travel guide. Return ONLY valid JSON arrays without any markdown formatting or additional text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1500,
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