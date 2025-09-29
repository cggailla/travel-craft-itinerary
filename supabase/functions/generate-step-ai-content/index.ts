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
    console.log('  - Return images: true');
    console.log('  - Image domain filter:', ["-gettyimages.com", "-shutterstock.com", "-istockphoto.com"]);
    console.log('  - Image format filter:', ["jpeg", "png", "webp"]);

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
- Trouve et sélectionne des images de paysages, vie locale, et bâtiments emblématiques de ${primaryLocation}
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
        return_images: true,
        image_domain_filter: ["-gettyimages.com", "-shutterstock.com", "-istockphoto.com"],
        image_format_filter: ["jpeg", "png", "webp"]
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
    console.log('  - Images field present:', !!perplexityData.images);
    console.log('  - Images count:', perplexityData.images?.length || 0);
    
    if (perplexityData.images && perplexityData.images.length > 0) {
      console.log('🖼️ Images found in response:');
      console.log('  - Images count:', perplexityData.images.length);
      
      // Log the complete structure of the first image for debugging
      console.log('📊 First image complete structure:');
      console.log(JSON.stringify(perplexityData.images[0], null, 2));
      
      perplexityData.images.forEach((img: any, index: number) => {
        console.log(`  Image ${index + 1}:`);
        console.log(`    - Title: ${img.title || 'N/A'}`);
        console.log(`    - URL (url field): ${img.url}`);
        console.log(`    - URL (imageUrl field): ${img.imageUrl}`);
        console.log(`    - OriginUrl: ${img.originUrl || 'N/A'}`);
        console.log(`    - Source: ${img.source || 'N/A'}`);
        console.log(`    - Format: ${img.format || 'N/A'}`);
        console.log(`    - Width: ${img.width || 'N/A'}`);
        console.log(`    - Height: ${img.height || 'N/A'}`);
      });
    } else {
      console.log('⚠️ No images found in Perplexity response');
    }

    const content = perplexityData.choices[0].message.content;
    console.log('📄 Content length:', content?.length || 0);
    
    // Extract up to 2 image URLs, trying multiple possible URL fields
    const validImages = (perplexityData.images || [])
      .filter((img: any) => {
        // Try different possible URL fields - prioritize image_url (snake_case) from Perplexity
        const imageUrl = img.image_url || img.imageUrl || img.url || img.src || img.href;
        if (!imageUrl) {
          console.log(`❌ No valid URL found for image: ${JSON.stringify(img)}`);
          return false;
        }
        
        // Filter by format - check the URL extension
        const allowedFormats = ['jpeg', 'jpg', 'png', 'webp'];
        const hasValidFormat = allowedFormats.some(format => 
          imageUrl.toLowerCase().includes(`.${format}`)
        );
        
        // Filter out stock photo sites
        const blockedDomains = ['-gettyimages.com', '-shutterstock.com', '-istockphoto.com'];
        const isFromBlockedDomain = blockedDomains.some(domain => 
          imageUrl.includes(domain)
        );
        
        console.log(`🔍 Image validation for "${img.title}":`, {
          url: imageUrl,
          hasValidFormat,
          isFromBlockedDomain,
          passed: hasValidFormat && !isFromBlockedDomain
        });
        
        return hasValidFormat && !isFromBlockedDomain;
      })
      .slice(0, 2)
      .map((img: any) => img.image_url || img.imageUrl || img.url || img.src || img.href);
    
    console.log('🎯 Final extracted images URLs:');
    validImages.forEach((url: string, index: number) => {
      console.log(`  ${index + 1}. ${url}`);
    });
    console.log(`📈 Total images selected: ${validImages.length}/2`);
    
    const images = validImages;
    
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
    console.log(`  - Images: ${images.length} URLs`);

    return new Response(
      JSON.stringify({
        success: true,
        stepId,
        overview: aiContent.overview,
        tips: aiContent.tips,
        localContext: aiContent.localContext || null,
        images: images
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