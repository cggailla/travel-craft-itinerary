import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
};

// 🔒 --- Authentification & Ownership checks ---
async function authenticateRequest(req: Request) {
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.warn("❌ Missing or malformed Authorization header");
    throw new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const token = authHeader.replace(/^Bearer\s+/i, "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: userData, error: authError } = await supabase.auth.getUser(
    token,
  );

  if (authError || !userData?.user) {
    console.error("❌ Invalid token", authError);
    throw new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  console.log("✅ Authenticated user:", userData.user.id);

  // Client RLS-aware
  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  return { user: userData.user, supabaseUser };
}

async function verifyStepOwnership(supabase: any, userId: string, stepId: string) {
  const { data: step, error: stepError } = await supabase
    .from("travel_steps")
    .select("trip_id")
    .eq("id", stepId)
    .single();

  if (stepError || !step) {
    console.error("❌ Step not found:", stepError);
    throw new Response(
      JSON.stringify({ success: false, error: "Step not found" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("user_id")
    .eq("id", step.trip_id)
    .single();

  if (tripError || !trip || trip.user_id !== userId) {
    console.warn("🚫 Forbidden access to step", { stepId, userId, tripError });
    throw new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log("✅ Step ownership confirmed for user:", userId);
}
// --- Fin bloc sécurité ---

serve(async (req) => {
  console.log("🧠 Generate Step AI Content Function Called");

  // ------------------------------------------------------------
  // 1️⃣ CORS preflight
  // ------------------------------------------------------------
  if (req.method === "OPTIONS") {
    console.log("🟡 OPTIONS preflight detected");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ------------------------------------------------------------
    // 2️⃣ Lecture du body JSON
    // ------------------------------------------------------------
    const { stepId, stepTitle, primaryLocation, sections, tripSummary } =
      await req.json().catch(() => ({}));

    console.log("📦 Input parameters:", {
      stepId,
      stepTitle,
      primaryLocation,
      sectionsCount: sections?.length || 0,
      hasTripSummary: !!tripSummary,
    });

    if (!stepId || !stepTitle || !sections) {
      console.warn("❌ Missing required fields");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: stepId, stepTitle, or sections",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ------------------------------------------------------------
    // 3️⃣ Authentification + client RLS-aware
    // ------------------------------------------------------------
    const { user, supabaseUser } = await authenticateRequest(req);

    // ------------------------------------------------------------
    // 4️⃣ Vérification ownership du step
    // ------------------------------------------------------------
    await verifyStepOwnership(supabaseUser, user.id, stepId);

    // ------------------------------------------------------------
    // 5️⃣ Vérification de la clé API Perplexity
    // ------------------------------------------------------------
    const perplexityApiKey = Deno.env.get("PERPLEXITY_API_KEY");
    if (!perplexityApiKey) {
      console.error("❌ PERPLEXITY_API_KEY not configured");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Perplexity API key not configured",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ------------------------------------------------------------
    // 6️⃣ Construction de la requête pour Perplexity
    // ------------------------------------------------------------
    console.log(`🚀 Generating AI content for step "${stepTitle}" in ${primaryLocation}`);


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