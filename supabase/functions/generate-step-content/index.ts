import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const openAIApiKey = Deno.env.get("OPENAI_API_KEY");

Deno.serve(async (req) => {
  console.log("Generate step content function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) throw new Error("OpenAI API key not configured");

    const { tripId, stepId } = await req.json();
    if (!tripId) throw new Error("Trip ID is required");
    if (!stepId) throw new Error("Step ID is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    console.log(`Generating content for trip ${tripId}, step ${stepId}`);

    // 1) Fetch step
    const { data: step, error: stepError } = await supabase
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
        render_mode: getRenderMode(tss.travel_segments.segment_type),
      })) ?? [];

    if (segments.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No segments found for this step" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 },
      );
    }

    // 4) Build stepData JSON
    const stepData = {
      step_id: step.step_id,
      step_type: step.step_type,
      step_title: step.step_title,
      start_date: step.start_date,
      end_date: step.end_date,
      primary_location: step.primary_location,
      segments,
    };

    // ============================
    // 🔹 Appel 1 : Enrichissement
    // ============================
    console.log("Calling OpenAI for enrichment…");

    const enrichData = await callOpenAIWithRetry({
      model: "gpt-4o-search-preview",
      messages: [
        {
          role: "system",
          content: `
Tu es un travel assistant professionnel.
Ta mission est de compléter factuellement le JSON fourni avec des données manquantes en utilisant la recherche web.

Règles :
- Recherche autorisée uniquement pour : hôtels (check-in/out, adresse précise, commodités), transports (gares/aéroports, durée, opérateur), activités (horaires, durée, localisation).
- Ajoute un champ "description_context" au niveau de l'étape : résumé historique/géographique/touristique adapté au type d'étape (séjour long = description développée + suggestions; transition = focus sur le déplacement).
- Ne supprime jamais ni ne modifie les infos existantes.
- Retourne uniquement du JSON strictement valide. Pas de texte, pas de commentaire, pas de markdown.
- Respecte exactement le format de sortie ci-dessous.

### Exemple de format attendu :
{
  "step_id": "123",
  "step_type": "sejour",
  "step_title": "Découverte de Kyoto",
  "start_date": "2025-05-01",
  "end_date": "2025-05-04",
  "primary_location": "Kyoto, Japon",
  "description_context": "Kyoto, ancienne capitale impériale, est célèbre pour ses temples...",
  "segments": [
    {
      "segment_type": "hotel",
      "title": "Hôtel Granvia Kyoto",
      "position_in_step": 1,
      "role": "hébergement principal",
      "provider": "Granvia",
      "reference_number": "ABC123",
      "address": "JR Kyoto Station, Karasuma Chuo-guchi, Kyoto",
      "start_date": "2025-05-01T15:00:00",
      "end_date": "2025-05-04T11:00:00",
      "description": "Hôtel moderne au cœur de la gare de Kyoto",
      "render_mode": "narrative"
    }
  ]
}
`,

        },
        { role: "user", content: JSON.stringify(stepData, null, 2) },
      ],
    });

    // Récupérer le contenu brut sans parser (évite les erreurs JSON)
    const enrichedStepContent = enrichData.choices[0].message.content;

    // ============================
    // 🔹 Appel 2 : Rendu HTML
    // ============================
    console.log("Calling OpenAI for HTML rendering…");

    const renderData = await callOpenAIWithRetry({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Tu es le rédacteur principal du carnet de voyage ADGENTES.
À partir d’un JSON ENRICHI fourni en message utilisateur (clé step + segments), tu génères un **HTML propre**, élégant, structuré, sans balises <html>/<head>/<body>, prêt à être intégré.

OBJECTIF ÉDITORIAL
- Donner envie (ton expert et chaleureux) sans être commercial.
- Mettre en valeur les informations **confirmées** (jamais d’invention).
- Rendre lisible en un coup d’œil ce qui est **essentiel** (transport en listes, hébergement/activités en narratif).
- Respecter l’ordre `position_in_step`.

RÈGLES FACTUELLES (NON NÉGOCIABLES)
1) **DB-first** : ne modifie pas les données fournies (titres, adresses, références, dates/heures).
2) **Pas d’invention** : si un champ manque, laisse un placeholder explicite
   → <span data-missing="FIELD">[Manquant]</span>.
3) **Heures** : n’affiche une heure que si elle est présente dans le JSON.
4) **Ordre** : les segments sont rendus par ordre croissant de `position_in_step`.
5) **render_mode** :
   - "list" → bloc concis en **liste de puces** (transports, pass, transferts).
   - "narrative" → **paragraphe(s)** d’ambiance + **encadré pratique** (hôtel, activité).
   - "mixed" → petit paragraphe + liste pratique.

STYLE & CLASSES
- Conteneur principal d’étape : <div class="theme-bg rounded-lg p-6 mb-8 border theme-border">
- Titres : h2 (étape), h3 (période/lieu), h4 (segment)
- Textes : classes theme-text, theme-accent
- Encadrés pratiques : <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm">
- Séparateurs de segments : <div class="border-l-4 theme-border pl-4 ...">
- Icônes suggérées : ✈️ 🚌 🚆 🚗 ⛵ 🏨 🎯 🎫 📍

STRUCTURE ATTENDUE (GÉNÉRIQUE)
1) En-tête d’étape
   - h2 : titre d’étape (step.step_title)
   - h3 : période + lieu (format lisible)
   - Intro : 1–3 courts paragraphes à partir de step.description_context
     * Séjour long → description plus généreuse + suggestions globales
     * Transition → texte court, focus déplacement/conseils
2) Segments (loop ordonné)
   - Selon `render_mode` :
     a) list → Titre concis + <ul> d’infos essentielles
     b) narrative → Paragraphe(s) d’ambiance + Encadré "Informations pratiques"
     c) mixed → 1 petit paragraphe + liste pratique

IMPORTANT : Retourne **uniquement** le HTML (pas de JSON, pas de texte hors HTML).

EXEMPLE FICTIF (vol + transfert + hôtel) — À TITRE DE STYLE
--------------------------------------------------------------------------------
<div class="theme-bg rounded-lg p-6 mb-8 border theme-border">
  <h2 class="text-2xl font-bold theme-text mb-1">Arrivée à Valparaiso & Installation</h2>
  <h3 class="text-lg theme-accent mb-5">Dimanche 12 janvier – Mardi 14 janvier 2025 • Valparaiso, Chili</h3>

  <div class="theme-text leading-relaxed mb-6">
    <p>À flanc de collines face au Pacifique, Valparaiso mêle funiculaires historiques, maisons colorées et un esprit bohème qui a inspiré poètes et marins. On vient y chercher les panoramas sur la baie, la vivacité des ruelles peintes, et les cafés perchés qui ponctuent les « cerros ».</p>
    <p>Installez-vous doucement : la ville se découvre en balades, au rythme des escaliers et des ascenseurs centenaires.</p>
  </div>

  <!-- SEGMENT 1 — render_mode: list (ex: flight) -->
  <div class="border-l-4 theme-border pl-4 py-3 mb-6">
    <h4 class="font-semibold theme-text text-lg mb-2">✈️ Vol Santiago (SCL) → Valparaiso (VAP)</h4>
    <ul class="list-disc pl-5 text-sm theme-text space-y-1">
      <li>Départ : <strong>10:20</strong> — Arrivée : <strong>11:05</strong></li>
      <li>Compagnie / Prestataire : <strong>LATAM</strong></li>
      <li>Référence : <strong>AB12CD</strong></li>
      <li>Adresse départ : <strong>Aéroport Arturo-Merino-Benítez (SCL)</strong></li>
      <li>Adresse arrivée : <strong>Aéroport de Valparaiso (VAP)</strong></li>
    </ul>
  </div>

  <!-- SEGMENT 2 — render_mode: list (ex: transfer) -->
  <div class="border-l-4 theme-border pl-4 py-3 mb-6">
    <h4 class="font-semibold theme-text text-lg mb-2">🚌 Transfert aéroport → Centre-ville</h4>
    <ul class="list-disc pl-5 text-sm theme-text space-y-1">
      <li>Opérateur : <strong>ValpaShuttle</strong></li>
      <li>Point de rencontre : <strong>Sortie T1, borne « Shuttle »</strong></li>
      <li>Durée estimée : <strong>45 min</strong> (selon trafic)</li>
      <li>Référence : <strong>TRF-4492</strong></li>
      <li>Destination : <strong>Hotel Casa de los Cerros</strong> — <span>Pasaje Miramar 18, Valparaiso</span></li>
    </ul>
  </div>

  <!-- SEGMENT 3 — render_mode: narrative (ex: hotel) -->
  <div class="border-l-4 theme-border pl-4 py-3 mb-6">
    <h4 class="font-semibold theme-text text-lg mb-2">🏨 Hotel Casa de los Cerros</h4>
    <div class="theme-text text-sm mb-3 leading-relaxed">
      Niché sur un « cerro » tranquille, l’hôtel ouvre sur une vue ample de la baie. La décoration mêle bois patiné et touches contemporaines ; au lever du jour, la lumière glisse sur les façades colorées alentour.
    </div>
    <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm">
      <strong>Informations pratiques :</strong><br/>
      • Adresse : <span>Pasaje Miramar 18, Valparaiso</span><br/>
      • Check-in : <span>15:00</span> — Check-out : <span>11:00</span><br/>
      • Prestataire / Référence : <span>Booking.com</span> — <span>BK-556733</span>
    </div>
  </div>
</div>
--------------------------------------------------------------------------------

DÉTAILS D’IMPLÉMENTATION (obligations de rendu)
- Période : formate lisiblement avec les champs fournis (si dates identiques, une seule date ; sinon “du – au”).
- Icônes : privilégie ✈️ 🚌 🚆 🚗 ⛵ 🏨 🎯 🎫 📍 selon le segment.
- Paragraphes : courts et denses (éviter la redondance).
- Listes (render_mode=list) : 5–7 puces max, priorise : heures (si présentes), départ/arrivée/adresse, prestataire, référence, durée.
- Encadré pratique : toujours après la partie narrative pour les modes "narrative" et "mixed".
- Placeholders si nécessaire :
  • Exemple : Adresse : <span data-missing="address">[Manquant]</span>
  • Exemple : Référence : <span data-missing="reference_number">[Manquant]</span>

NE RETOURNE QUE LE HTML. PAS DE COMMENTAIRES. PAS DE TEXTE HORS HTML.`

        },
        { role: "user", content: enrichedStepContent },
      ],
      temperature: 0.5,
      max_tokens: 3500,
    });

    const generatedHtml = renderData.choices[0].message.content;

    // ============================
    // 🔹 Return result
    // ============================
    return new Response(
      JSON.stringify({
        success: true,
        stepId: stepId,
        html: generatedHtml,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("Generate step content function error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});

// =========================
// Helpers
// =========================
function getRenderMode(segmentType: string): "list" | "narrative" | "mixed" {
  switch (segmentType) {
    case "flight":
    case "train":
    case "car":
    case "boat":
    case "transfer":
    case "pass":
      return "list";
    case "hotel":
    case "activity":
      return "narrative";
    default:
      return "mixed";
  }
}

/**
 * Retry wrapper for OpenAI API calls with rate limit handling
 */
async function callOpenAIWithRetry(body: any, maxRetries = 3): Promise<any> {
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

      // Essayer d'extraire le temps d'attente du message
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

