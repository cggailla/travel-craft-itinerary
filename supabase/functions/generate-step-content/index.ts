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
    console.log('Generate step content function called');
    
    const { tripId, stepId } = await req.json();
    console.log(`Request for trip ${tripId}, step ${stepId}`);
    
    if (!tripId) throw new Error("Trip ID is required");
    if (!stepId) throw new Error("Step ID is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

        const { trip_id, step_id } = body;

        // Auth: require Bearer token and use anon client so RLS applies
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

        // Verify step/trip ownership
        if (trip_id) {
          const { data: trip, error: tripErr } = await supabase.from('trips').select('user_id').eq('id', trip_id).single();
          if (tripErr || !trip || trip.user_id !== user.id) {
            return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 })
          }
        }
        if (step_id) {
          const { data: step, error: stepErr } = await supabase.from('travel_steps').select('trip_id').eq('id', step_id).single();
          if (stepErr || !step) {
            return new Response(JSON.stringify({ success: false, error: 'Step not found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 })
          }
          const { data: trip, error: tripErr2 } = await supabase.from('trips').select('user_id').eq('id', step.trip_id).single();
          if (tripErr2 || !trip || trip.user_id !== user.id) {
            return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 })
          }
        }
      .from("travel_steps")
      .select("*")
      .eq("trip_id", tripId)
      .eq("step_id", stepId)
      .single();

    if (stepError || !step) {
      console.error("Error fetching step:", stepError);
      throw new Error(`Failed to fetch step: ${stepError?.message || "Step not found"}`);
    }

    // 2) Fetch segments
    const { data: stepSegments, error: segmentsError } = await supabase
      .from("travel_step_segments")
      .select(`
        position_in_step,
        role,
        travel_segments(*)
      `)
      .eq("step_id", step.id)
      .order("position_in_step", { ascending: true });

    if (segmentsError) {
      console.error("Error fetching step segments:", segmentsError);
      throw new Error(`Failed to fetch step segments: ${segmentsError.message}`);
    }

    // 3) Add render_mode to each segment
    const segments =
      stepSegments?.map((tss: any) => ({
        ...tss.travel_segments,
        position_in_step: tss.position_in_step,
        role: tss.role,
        render_mode: getRenderMode(tss.travel_segments?.segment_type || "other"),
      })) || [];

    console.log(`Found ${segments.length} segments for step ${stepId}`);

    const stepData = {
      step: {
        step_id: step.step_id,
        step_title: step.step_title,
        step_type: step.step_type,
        start_date: step.start_date,
        end_date: step.end_date,
        primary_location: step.primary_location,
      },
      segments: segments,
    };

    // === PHASE 1: Enrichir les données avec Perplexity (gpt-4o-2024-08-06) ===

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('=== PHASE 1: Data enrichment ===');

    const enrichmentPrompt = `ENRICHIR LES DONNÉES DE VOYAGE

Tu reçois un JSON avec une étape de voyage (step + segments). Ton rôle : enrichir les données factuelles manquantes UNIQUEMENT.

DONNÉES REÇUES:
${JSON.stringify(stepData, null, 2)}

RÈGLES D'ENRICHISSEMENT:
1) **Compléter SEULEMENT** les champs vides ou génériques
2) **Conserver** toutes les données existantes (titres, heures, références, adresses)
3) **Rechercher** des informations factuelles précises (horaires moyens, distances, conseils pratiques)
4) **Ajouter** un champ description_context à step avec 2-3 phrases sur le lieu/activité

PRIORITÉS ENRICHISSEMENT:
- Compléter les adresses manquantes des hôtels/lodges
- Ajouter des durées de trajet réalistes pour les transferts
- Compléter les horaires manquants (check-in/out standards)
- Ajouter des informations pratiques sur les parcs/activités

RÉPONSE: Retourne le JSON enrichi avec la même structure.`;

    console.log('Calling OpenAI for data enrichment...');

    const enrichmentResponse = await callOpenAIWithRetry({
      model: "gpt-4o-2024-08-06",
      messages: [
        {
          role: "system",
          content: "Tu es un expert en enrichissement de données de voyage. Tu complètes les informations manquantes avec des données factuelles précises. Réponds uniquement en JSON.",
        },
        {
          role: "user",
          content: enrichmentPrompt,
        },
      ],
      max_tokens: 2000,
      temperature: 0.2,
    });

    let enrichedData;
    try {
      const enrichedContent = enrichmentResponse.choices[0].message.content;
      enrichedData = JSON.parse(enrichedContent);
      console.log('Data enrichment successful');
    } catch (parseError) {
      console.warn('Failed to parse enriched data, using original:', parseError);
      enrichedData = stepData;
    }

    // === PHASE 2: Générer le HTML (gpt-4o-mini) ===

    console.log('=== PHASE 2: HTML generation ===');

    const htmlGenerationPrompt = `Tu es le rédacteur principal du carnet de voyage ADGENTES.
À partir d'un JSON ENRICHI fourni en message utilisateur (clé step + segments), tu génères un HTML propre, élégant, structuré, sans balises <html>/<head>/<body>, prêt à être intégré.

OBJECTIF ÉDITORIAL
- Donner envie (ton expert et chaleureux) sans être commercial.
- Mettre en valeur les informations confirmées (jamais d'invention).
- Rendre lisible en un coup d'œil ce qui est essentiel (transport en listes, hébergement/activités en narratif).
- Respecter l'ordre position_in_step.

RÈGLES FACTUELLES (NON NÉGOCIABLES)
1) DB-first : ne modifie pas les données fournies (titres, adresses, références, dates/heures).
2) Pas d'invention : si un champ manque, laisse un placeholder explicite
   → <span data-missing="FIELD">[Manquant]</span>.
3) Heures : n'affiche une heure que si elle est présente dans le JSON.
4) Ordre : les segments sont rendus par ordre croissant de position_in_step.
5) render_mode :
   - "list" → bloc concis en liste de puces (transports, pass, transferts).
   - "narrative" → paragraphe d'ambiance + encadré pratique (hôtels, activités).
   - "mixed" → format hybride selon contexte.

STRUCTURE HTML ATTENDUE
1) En-tête d'étape
   - h2 : titre d'étape (step.step_title)
   - h3 : période + lieu (format lisible)
   - Intro : 1–3 courts paragraphes à partir de step.description_context
     * Séjour long → description plus généreuse + suggestions globales
     * Transition → texte court, focus déplacement/conseils
2) Segments (loop ordonné)
   - Selon render_mode :
     a) list → Titre concis + <ul> d'infos essentielles
     b) narrative → Paragraphe(s) d'ambiance + Encadré "Informations pratiques"
     c) mixed → 1 petit paragraphe + liste pratique

IMPORTANT : Retourne uniquement le HTML (pas de JSON, pas de texte hors HTML).

EXEMPLE FICTIF (vol + transfert + hôtel) — À TITRE DE STYLE
<div class="step-content">
  <header class="step-header">
    <h2>Arrivée à Nairobi</h2>
    <h3>16 juillet 2025 • Nairobi, Kenya</h3>
    <div class="step-intro">
      <p>Votre aventure kenyane commence par l'arrivée dans la capitale dynamique du Kenya. Nairobi, porte d'entrée vers les merveizes safari, vous accueille avec son mélange unique de modernité et de traditions africaines.</p>
    </div>
  </header>

  <section class="segment-list">
    <h4>🛫 Vol Ethiopian Airlines ET 308</h4>
    <ul>
      <li><strong>Départ :</strong> Addis-Abeba (ADD) - 08:30</li>
      <li><strong>Arrivée :</strong> Nairobi (NBO) - 11:45</li>
      <li><strong>Référence :</strong> ET308-16JUL</li>
    </ul>
  </section>

  <section class="segment-narrative">
    <h4>🏨 Ole Sereni Hotel</h4>
    <p>Idéalement situé face au parc national de Nairobi, l'Ole Sereni offre une transition parfaite entre votre vol et l'immersion safari. Depuis vos fenêtres, vous pourrez apercevoir les premiers animaux sauvages de votre séjour.</p>
    
    <div class="practical-info">
      <h5>Informations pratiques</h5>
      <ul>
        <li><strong>Adresse :</strong> Mombasa Road, Nairobi</li>
        <li><strong>Check-in :</strong> 14:00</li>
        <li><strong>Services :</strong> Wifi, Restaurant, Piscine</li>
      </ul>
    </div>
  </section>
</div>

DONNÉES À TRAITER:`;

    console.log('Calling OpenAI for HTML generation...');

    const htmlResponse = await callOpenAIWithRetry({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: htmlGenerationPrompt },
        {
          role: "user",
          content: JSON.stringify(enrichedData, null, 2),
        },
      ],
      max_tokens: 3000,
      temperature: 0.7,
    });

    const generatedHTML = htmlResponse.choices[0].message.content;
    console.log('HTML generation completed');

    return new Response(
      JSON.stringify({
        success: true,
        stepId: stepId,
        html: generatedHTML,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-step-content function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        stepId: null,
        html: '',
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/**
 * Determine render mode based on segment type
 */
function getRenderMode(segmentType: string): "list" | "narrative" | "mixed" {
  const listTypes = ["flight", "train", "car", "transfer", "pass"];
  const narrativeTypes = ["hotel", "activity"];
  
  if (listTypes.includes(segmentType)) {
    return "list";
  }
  if (narrativeTypes.includes(segmentType)) {
    return "narrative";
  }
  return "mixed";
}

/**
 * Call OpenAI API with retry logic for rate limiting
 */
async function callOpenAIWithRetry(body: any, maxRetries: number = 3): Promise<any> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      return await response.json();
    }

    if (response.status === 429) {
      const errorText = await response.text();
      console.warn("Rate limit error:", errorText);

      // Try to extract wait time from the message
      const match = errorText.match(/try again in ([0-9.]+)s/i);
      const waitSeconds = match ? parseFloat(match[1]) : 2;

      console.log(`⏳ Waiting ${waitSeconds} seconds before retry (attempt ${attempt}/${maxRetries})…`);
      await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
      continue;
    }

    throw new Error(`OpenAI API error: ${response.status} - ${await response.text()}`);
  }

  throw new Error("OpenAI API failed after max retries");
}