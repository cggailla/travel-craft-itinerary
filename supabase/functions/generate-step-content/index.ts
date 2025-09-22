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

    const enrichResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `
Tu es un travel assistant professionnel.
Ta mission est de compléter factuellement le JSON fourni avec des données manquantes en utilisant la recherche web.
Règles :
- Recherche autorisée uniquement pour : hôtels (check-in/out, adresse précise, commodités), transports (gares/aéroports, durée, opérateur), activités (horaires, durée, localisation).
- Ajoute un champ "description_context" au niveau de l'étape : résumé historique/géographique/touristique adapté au type d'étape (séjour long = description développée + suggestions; transition = focus sur le déplacement).
- Ne supprime jamais ni ne modifies les infos existantes.
- Ne rédige aucune prose HTML ou narrative : uniquement compléter les champs JSON.
- Retourne du JSON strictement valide.
`,
          },
          { role: "user", content: JSON.stringify(stepData, null, 2) },
        ],
        temperature: 0.2,
      }),
    });

    if (!enrichResponse.ok) {
      const errorText = await enrichResponse.text();
      throw new Error(`OpenAI Enrichment error: ${enrichResponse.status} - ${errorText}`);
    }

    const enrichData = await enrichResponse.json();
    const enrichedStep = JSON.parse(enrichData.choices[0].message.content);

    // (Optionnel) Sauvegarder en base
    await supabase.from("travel_step_enriched").insert({
      trip_id: tripId,
      step_id: stepId,
      enriched_json: enrichedStep,
      created_at: new Date().toISOString(),
    });

    // ============================
    // 🔹 Appel 2 : Rendu HTML
    // ============================
    console.log("Calling OpenAI for HTML rendering…");

    const renderResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
Tu es un rédacteur de carnets de voyage ADGENTES.
Ta mission : transformer le JSON enrichi en HTML narratif et structuré, en respectant strictement les données.
Règles générales :
- Intro étape : 
   • Séjour long → 2–3 paragraphes narratifs (contexte historique, culturel, recommandations).
   • Transition → texte court axé sur le déplacement.
- Respecte l'ordre des segments (position_in_step).
- Utilise render_mode pour la mise en forme :
   • list : infos pratiques en liste de puces, titre concis + bloc clair.
   • narrative : titre + paragraphe narratif (ambiance, histoire, conseils) + encadré pratique.
   • mixed : court paragraphe + liste pratique.
- Toujours inclure les champs confirmés (prestataire, référence, adresse, heures si dispo).
- Pas d'invention : si une donnée est absente, laisse un placeholder clair.
- Style ADGENTES : ton expert, élégant, engageant, jamais commercial.
- Format final = HTML propre sans <html>/<head>/<body>.
`,
          },
          { role: "user", content: JSON.stringify(enrichedStep, null, 2) },
        ],
        temperature: 0.5,
        max_tokens: 3500,
      }),
    });

    if (!renderResponse.ok) {
      const errorText = await renderResponse.text();
      throw new Error(`OpenAI Render error: ${renderResponse.status} - ${errorText}`);
    }

    const renderData = await renderResponse.json();
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
