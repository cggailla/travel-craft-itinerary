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
    console.log('Generate step AI content function called');
    
    const { stepId, stepTitle, primaryLocation, sections } = await req.json();
    
    if (!stepId || !stepTitle || !sections) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: stepId, stepTitle, or sections' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'OpenAI API key not configured' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Generating AI content for step: ${stepTitle} in ${primaryLocation}`);

    // Create structured prompt for targeted content generation
    const sectionsInfo = sections.map((section: any) => {
      const segmentTitles = section.segments.map((s: any) => s.title);
      return `${section.title} (${section.role}): ${segmentTitles.join(', ')}`;
    }).join('\n');

    const prompt = `Génère du contenu descriptif pour cette étape de voyage en français.

ÉTAPE: ${stepTitle}
LIEU: ${primaryLocation}
SECTIONS:
${sectionsInfo}

Réponds uniquement en JSON avec cette structure exacte:
{
  "overview": "Description générale de cette étape en 2-3 phrases (100-150 mots max)",
  "tips": ["Conseil pratique 1", "Conseil pratique 2", "Conseil pratique 3"],
  "localContext": "Informations culturelles/historiques intéressantes sur le lieu (80-120 mots max, optionnel)"
}

CONSIGNES:
- Overview: Description engageante et informative de l'étape
- Tips: 2-4 conseils pratiques et utiles pour cette étape
- LocalContext: Contexte culturel/historique uniquement si pertinent
- Ton: Informatif mais chaleureux, comme un guide de voyage
- Longueur: Entre 1 et 2 paragraphes`;

    console.log('Calling OpenAI for AI content generation...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en voyage qui génère du contenu descriptif concis et utile pour des carnets de voyage. Réponds uniquement en JSON valide.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `OpenAI API error: ${response.status} - ${errorText}` 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const openaiData = await response.json();
    console.log('OpenAI response received');

    const content = openaiData.choices[0].message.content;
    
    // Parse JSON response
    let aiContent;
    try {
      aiContent = JSON.parse(content);
    } catch (parseError) {
      console.error('Error parsing OpenAI JSON response:', parseError);
      console.error('Raw content:', content);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to parse AI response as JSON' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate response structure
    if (!aiContent.overview || !Array.isArray(aiContent.tips)) {
      console.error('Invalid AI response structure:', aiContent);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'AI response missing required fields' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`AI content generated successfully for step ${stepId}`);

    return new Response(
      JSON.stringify({
        success: true,
        stepId,
        overview: aiContent.overview,
        tips: aiContent.tips,
        localContext: aiContent.localContext || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-step-ai-content function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});