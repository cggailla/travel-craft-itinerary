import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { segments, destination, tripSummary } = await req.json();

    if (!segments || segments.length === 0) {
      throw new Error('No segments provided');
    }

    // Préparation du contexte pour l'IA
    const segmentsDescription = segments.map((s: any) => {
      let desc = `- ${s.type}: ${s.title || 'Non spécifié'}`;
      if (s.description) desc += ` (${s.description})`;
      return desc;
    }).join('\n');

    const systemPrompt = `
      Tu es un conseiller voyage expert spécialisé dans la création de devis sur mesure haut de gamme.
      
      TA MISSION :
      Rédiger un court paragraphe (environ 40-60 mots) décrivant cette étape du voyage pour un devis client.
      
      TON STYLE :
      - Professionnel, fluide et invitant.
      - Utilise le "Vous".
      - Mets en valeur les services (hôtels, transferts, activités) de manière subtile.
      - Ne sois pas trop "marketing", reste factuel mais élégant.
      - Inspire-toi de ce style : "Arrivée à l'aéroport... accueillis par notre représentant... transférés à votre hôtel... Cette soirée est l'occasion de vous détendre..."
      
      CONTRAINTES :
      - Ne pas inventer d'informations non présentes dans les segments.
      - Si c'est une étape d'arrivée, mentionne l'accueil.
      - Si c'est une étape de séjour, mentionne l'hôtel et l'ambiance.
      - Langue : Français.
    `;

    let userPrompt = `
      Destination globale : ${destination || 'Non spécifiée'}
      
      Voici les éléments prévus pour cette étape (journée ou période) :
      ${segmentsDescription}
      
      Rédige le texte du devis pour cette étape.
    `;

    if (tripSummary) {
      userPrompt = `
        CONTEXTE GLOBAL DU VOYAGE (Résumé) :
        ${tripSummary}
        
        ----------------
        
        FOCUS SUR L'ÉTAPE ACTUELLE :
        Destination globale : ${destination || 'Non spécifiée'}
        
        Voici les éléments prévus pour cette étape (journée ou période) :
        ${segmentsDescription}
        
        Rédige le texte du devis pour cette étape en t'assurant qu'il s'intègre bien dans le contexte global du voyage.
      `;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const generatedText = data.choices[0].message.content;

    return new Response(JSON.stringify({ content: generatedText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
