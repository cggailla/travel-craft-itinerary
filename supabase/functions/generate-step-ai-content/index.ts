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

    // Auth: require Bearer token and use ANON client so RLS applies
    const authHeader = (req.headers.get('authorization') || req.headers.get('Authorization') || '');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 })
    }
    const token = authHeader.replace(/^Bearer\s+/i, '');

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '');
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 })
    }
    const user = userData.user;

    // Verify step -> trip -> ownership
    if (!stepId) {
      return new Response(JSON.stringify({ success: false, error: 'stepId is required' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }
    const { data: stepRow, error: stepErr } = await supabase.from('travel_steps').select('trip_id').eq('id', stepId).single();
    if (stepErr || !stepRow) {
      return new Response(JSON.stringify({ success: false, error: 'Step not found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 })
    }
    const { data: tripOwner, error: tripErr } = await supabase.from('trips').select('user_id').eq('id', stepRow.trip_id).single();
    if (tripErr || !tripOwner || tripOwner.user_id !== user.id) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 })
    }
    
    console.log('📍 Input parameters:');
    console.log(`  - Step ID: ${stepId}`);
    console.log(`  - Step Title: ${stepTitle}`);
    console.log(`  - Primary Location: ${primaryLocation}`);
    console.log(`  - Sections count: ${sections?.length || 0}`);
    console.log(`  - Trip Summary provided: ${!!tripSummary}`);
    
    if (!stepId || !stepTitle || !sections) {
      console.error('❌ Missing required fields:', { stepId: !!stepId, stepTitle: !!stepTitle, sections: !!sections });
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

    console.log(`🚀 Generating AI content for step: ${stepTitle} in ${primaryLocation}`);
    console.log('🌐 Perplexity API request configuration:');
    console.log('  - Model: sonar');


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

    console.log('📝 Prompt sections info:');
    console.log(sectionsInfo);
    
    console.log('🔄 Calling Perplexity for AI content generation with web search...');

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
        return_related_questions: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Perplexity API error:', response.status, errorText);
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
    console.log('✅ Perplexity response received');
    console.log('📊 Full Perplexity response structure:');
    console.log('  - Choices:', perplexityData.choices?.length || 0);

    const content = perplexityData.choices[0].message.content;
    console.log('📄 Content length:', content?.length || 0);
    // Parse JSON response
    let aiContent;
    try {
      aiContent = JSON.parse(content);
      console.log('✅ Successfully parsed AI content JSON');
      console.log('📋 AI Content structure:');
      console.log(`  - Overview length: ${aiContent.overview?.length || 0} chars`);
      console.log(`  - Tips count: ${aiContent.tips?.length || 0}`);
      console.log(`  - Local context length: ${aiContent.localContext?.length || 0} chars`);
    } catch (parseError) {
      console.error('❌ Error parsing Perplexity JSON response:', parseError);
      console.error('🔍 Raw content preview:', content?.substring(0, 500));
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
      console.error('❌ Invalid AI response structure:', aiContent);
      console.error('🔍 Missing fields - Overview:', !!aiContent.overview, 'Tips array:', Array.isArray(aiContent.tips));
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

    console.log(`🎉 AI content generated successfully for step ${stepId}`);
    console.log('📤 Final response summary:');
    console.log(`  - Step ID: ${stepId}`);
    console.log(`  - Overview: ${aiContent.overview.length} chars`);
    console.log(`  - Tips: ${aiContent.tips.length} items`);
    console.log(`  - Local context: ${aiContent.localContext?.length || 0} chars`);

    return new Response(
      JSON.stringify({
        success: true,
        stepId,
        overview: aiContent.overview,
        tips: aiContent.tips,
        localContext: aiContent.localContext || null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Error in generate-step-ai-content function:', error);
    console.error('🔍 Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
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