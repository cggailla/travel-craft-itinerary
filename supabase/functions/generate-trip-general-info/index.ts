import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tripId } = await req.json();

    if (!tripId) {
      return new Response(
        JSON.stringify({ success: false, error: "tripId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const perplexityApiKey = Deno.env.get("PERPLEXITY_API_KEY");

    if (!perplexityApiKey) {
      console.error("PERPLEXITY_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Perplexity API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get trip and destination zone
    console.log(`Fetching trip ${tripId}`);
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("destination_zone")
      .eq("id", tripId)
      .single();

    if (tripError || !trip) {
      console.error("Error fetching trip:", tripError);
      return new Response(
        JSON.stringify({ success: false, error: "Trip not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const destinationZone = trip.destination_zone;
    if (!destinationZone) {
      console.error("Destination zone not set for trip");
      return new Response(
        JSON.stringify({ success: false, error: "Destination zone not set" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating general info for ${destinationZone}`);

    // Call Perplexity API
    const prompt = `Recherche et génère des informations générales complètes sur ${destinationZone} pour un carnet de voyage en français.

IMAGES: Trouve et sélectionne 2 magnifiques photos de voyage représentatives de ${destinationZone} (paysages emblématiques, monuments, vie locale, nature). Privilégie des images de haute qualité et évocatrices.

IMPORTANT: Réponds UNIQUEMENT en JSON pur sans backticks markdown.

Structure JSON OBLIGATOIRE:
{
  "capital": "Nom de la capitale",
  "population": "environ X millions d'habitants",
  "surface_area": "environ X km²",
  "timezone_info": {
    "main_timezone": "UTC+X ou UTC-X",
    "offset_description": "Décalage avec la Suisse en été/hiver"
  },
  "entry_requirements": {
    "passport": "Type de passeport requis",
    "visa": "Informations visa/ESTA/exemption",
    "validity": "Durée maximale autorisée"
  },
  "health_requirements": {
    "vaccines": ["Vaccin 1", "Vaccin 2"],
    "insurance_advice": "Recommandations assurance",
    "water_safety": "Eau potable : oui/non/précisions"
  },
  "currency": "Nom de la devise (CODE)",
  "exchange_rate": "1 CHF ≈ X devise (taux approximatif)",
  "budget_info": {
    "coffee": "X-Y devise",
    "simple_meal": "X-Y devise",
    "restaurant": "X-Y devise par personne"
  },
  "tipping_culture": {
    "required": true,
    "restaurants": "X% ou description",
    "taxis": "X% ou montant",
    "guides": "X devise par personne",
    "porters": "X devise par bagage"
  },
  "electricity_info": {
    "voltage": "XXX volts",
    "plug_types": ["Type A", "Type B"],
    "adapter_needed": true
  },
  "phone_info": {
    "calling_to": "Code pour appeler depuis la Suisse",
    "calling_from": "Code pour appeler la Suisse depuis le pays",
    "tips": "Conseils SIM locale/roaming"
  },
  "languages": {
    "official": ["Langue 1", "Langue 2"],
    "french_spoken": true,
    "notes": "Autres langues courantes"
  },
  "religion_info": "Principales religions et respect attendu dans les lieux de culte",
  "clothing_advice": {
    "season": "Saison concernée par le voyage",
    "temperatures": "Fourchette de températures (X-Y°C)",
    "recommended": ["Vêtement/accessoire 1", "Vêtement/accessoire 2"]
  },
  "food_specialties": [
    {
      "region": "Région ou ville",
      "specialty": "Nom de la spécialité locale"
    }
  ],
  "shopping_info": "Produits typiques à acheter et conseils shopping",
  "cultural_sites": [
    {
      "name": "Nom du site culturel/historique",
      "description": "Courte description"
    }
  ],
  "natural_attractions": "Description des parcs, paysages naturels, faune/flore",
  "safety_info": "Conseils de sécurité généraux et numéro d'urgence local",
  "climate_info": {
    "current_season": "Description climat durant la période du voyage",
    "summer": "Description climat en été",
    "winter": "Description climat en hiver",
    "autumn": "Description climat en automne",
    "spring": "Description climat au printemps"
  }
}

CONSIGNES:
- Utilise tes capacités de recherche web pour obtenir des informations à jour
- Sois précis sur les montants budgétaires et taux de change
- Mentionne des spécialités culinaires locales authentiques
- JSON pur sans backticks markdown
- Toutes les informations en français`;

    const perplexityResponse = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${perplexityApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content: "Tu es un expert en informations pratiques de voyage avec accès à internet. Tu génères du contenu structuré et factuel pour des carnets de voyage. Réponds uniquement en JSON valide sans backticks markdown."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 3000,
        return_images: true,
        return_related_questions: false,
        image_domain_filter: ["-gettyimages.com", "-shutterstock.com", "-istockphoto.com"],
        image_format_filter: ["jpeg", "png", "webp"],
        search_recency_filter: "month",
        web_search_options: {
          search_context_size: "medium"
        }
      }),
    });

    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      console.error(`Perplexity API error: ${perplexityResponse.status}`, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Perplexity API error: ${perplexityResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const perplexityData = await perplexityResponse.json();
    let content = perplexityData.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in Perplexity response");
      return new Response(
        JSON.stringify({ success: false, error: "No content received from Perplexity" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Raw Perplexity content (first 500 chars):", content.substring(0, 500));

    // Extract and filter images
    const images = perplexityData.images || [];
    console.log(`📸 Images found: ${images.length}`);
    
    const validImageUrls: string[] = [];
    const blockedDomains = ["gettyimages.com", "shutterstock.com", "istockphoto.com"];
    const validFormats = ["jpeg", "jpg", "png", "webp"];
    
    for (const img of images) {
      if (validImageUrls.length >= 2) break;
      
      const imageUrl = img.image_url || img.url;
      if (!imageUrl) continue;
      
      // Check format
      const hasValidFormat = validFormats.some(format => 
        imageUrl.toLowerCase().includes(`.${format}`)
      );
      
      // Check blocked domains
      const isFromBlockedDomain = blockedDomains.some(domain => 
        imageUrl.toLowerCase().includes(domain)
      );
      
      if (hasValidFormat && !isFromBlockedDomain) {
        validImageUrls.push(imageUrl);
        console.log(`✅ Valid cover image ${validImageUrls.length}: ${imageUrl}`);
      }
    }
    
    console.log(`📈 Total cover images selected: ${validImageUrls.length}/2`);

    // Try to parse JSON, handle markdown wrapping
    let generalInfo;
    try {
      // Try direct parse first
      generalInfo = JSON.parse(content);
    } catch (e) {
      console.log("Direct JSON parse failed, trying to extract from markdown");
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        try {
          generalInfo = JSON.parse(jsonMatch[1]);
          console.log("Successfully extracted JSON from markdown");
        } catch (e2) {
          console.error("Failed to parse extracted JSON:", e2);
          return new Response(
            JSON.stringify({ success: false, error: "Invalid JSON format in response" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        console.error("Could not find JSON in response");
        return new Response(
          JSON.stringify({ success: false, error: "Could not parse JSON from response" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check if general info already exists
    const { data: existing } = await supabase
      .from("trip_general_info")
      .select("id")
      .eq("trip_id", tripId)
      .maybeSingle();

    if (existing) {
      // Update existing
      console.log("Updating existing general info");
      const { error: updateError } = await supabase
        .from("trip_general_info")
        .update({
          destination_country: destinationZone,
          cover_images: validImageUrls,
          ...generalInfo,
          updated_at: new Date().toISOString()
        })
        .eq("trip_id", tripId);

      if (updateError) {
        console.error("Error updating general info:", updateError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to update general info" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Insert new
      console.log("Inserting new general info");
      const { error: insertError } = await supabase
        .from("trip_general_info")
        .insert({
          trip_id: tripId,
          destination_country: destinationZone,
          cover_images: validImageUrls,
          ...generalInfo
        });

      if (insertError) {
        console.error("Error inserting general info:", insertError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to insert general info" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("✅ General info saved successfully");

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-trip-general-info:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
