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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tripId, tripSummary } = await req.json();

    if (!tripId) {
      throw new Error("Missing tripId");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // If tripSummary is not provided, fetch it
    let summary = tripSummary;
    if (!summary) {
      const { data: trip } = await supabase
        .from("trips")
        .select("trip_summary")
        .eq("id", tripId)
        .single();
      summary = trip?.trip_summary;
    }

    if (!summary) {
      throw new Error("No trip summary available to generate quote content");
    }

    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) {
      throw new Error("Missing OPENAI_API_KEY");
    }

    const prompt = `
      Tu es un expert en rédaction touristique de luxe.
      Voici le résumé d'un voyage :
      ${summary}

      Tâche :
      1. Rédige un court texte de présentation inspirant (2-3 phrases max) qui donne envie de partir. Utilise un ton évocateur et élégant. (Exemple: "Embarquez pour un voyage à travers les âges...")
      2. Extrais une liste de 3 à 5 points forts (atouts majeurs) de ce voyage. Ce peut être des activités spécifiques, des lieux iconiques visités, ou des expériences uniques. Sois précis mais très concis - quelques mots. Dans l'ordre : commence par les activités prévues, puis les lieux iconiques puis enfin les hôtels si nécessaire. Pour un voyage de 3 étapes, 3 points sont emplement suffisants

      Réponds UNIQUEMENT au format JSON suivant :
      {
        "description": "Le texte de présentation...",
        "highlights": ["Point fort 1", "Point fort 2", "Point fort 3"...]
      }
    `;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Tu es un assistant expert en voyages." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    const aiData = await response.json();
    const content = aiData.choices[0].message.content;
    
    // Parse JSON from content (handle potential markdown code blocks)
    const jsonStr = content.replace(/```json\n?|\n?```/g, "").trim();
    const result = JSON.parse(jsonStr);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
