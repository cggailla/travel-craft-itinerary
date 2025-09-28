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
    
    const { stepId, stepTitle, primaryLocation, sections, tripSummary } = await req.json();
    
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

    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityApiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Perplexity API key not configured' 
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

    const prompt = `Recherche et génère du contenu enrichi pour cette étape de voyage en français.

RECHERCHE ET RÉDACTION DEMANDÉES:
1. Recherche des informations actuelles sur ${primaryLocation}
2. Trouve des détails historiques, culturels et pratiques spécifiques au lieu
3. Identifie des conseils locaux authentiques et des anecdotes intéressantes
4. Crée un contenu engageant style guide de voyage expert

${tripSummary ? `\nCONTEXTE DU VOYAGE COMPLET:\n${tripSummary}\n` : ''}
ÉTAPE: ${stepTitle}
LIEU: ${primaryLocation}
SECTIONS:
${sectionsInfo}

Réponds uniquement en JSON avec cette structure exacte:
{
  "overview": "Description générale riche et engageante du déroulé de cette étape (100 - 300 mots), incluant des détails spécifiques trouvés par recherche. Tu dois forcément parlé de chacun des segments et utiliser un style narratif propre au voyage qu'emploierait un guide local.",
  "tips": ["Conseil pratique local spécifique", "Astuce culturelle authentique", "Recommandation basée sur des infos récentes"] ATTENTION : lire attentivement les segments de l'étape pour ne pas faire de répétition ou de contre indication (ne pas recommender une activité déjà réservé),
  "localContext": "Contexte historique, culturel ou anecdotique fascinant sur le lieu (100-120 mots), avec des détails précis trouvés par recherche"
}

CONSIGNES STRICTES:
- Utilise tes capacités de recherche web pour enrichir le contenu
- Overview: Intègre des détails spécifiques et récents sur le lieu
- Tips: Base-toi sur des informations locales authentiques trouvées
- LocalContext: Inclus des faits historiques/culturels précis et captivants
- Ton: Narratif expert, style ADGENTES, informatif mais personnel
- OBLIGATOIRE: Réponds en JSON pur sans backticks markdown
${tripSummary ? '\n- Crée des liens pertinents avec le contexte global du voyage' : ''}`;

    console.log('Calling Perplexity for AI content generation with web search...');

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en voyage avec accès à internet qui génère du contenu riche et authentique pour des carnets de voyage. Utilise tes capacités de recherche pour enrichir tes réponses avec des informations actuelles et spécifiques. Réponds uniquement en JSON valide sans backticks markdown.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        web_search_options: {
          "search_context_size": "medium"
        },
        return_related_questions: false
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Perplexity API error: ${response.status} - ${errorText}` 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const perplexityData = await response.json();
    console.log('Perplexity response received');

    const content = perplexityData.choices[0].message.content;
    
    // Parse JSON response
    let aiContent;
    try {
      aiContent = JSON.parse(content);
    } catch (parseError) {
      console.error('Error parsing Perplexity JSON response:', parseError);
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