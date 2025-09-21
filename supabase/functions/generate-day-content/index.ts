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
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { day, dayIndex } = await req.json();
    console.log(`Génération contenu pour jour ${dayIndex + 1}:`, day);

    if (!day?.segments || !Array.isArray(day.segments)) {
      throw new Error('Structure de jour invalide');
    }

    const prompt = createPrompt(day, dayIndex);
    console.log('Prompt GPT créé, appel à OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-search-preview',
        messages: [
          {
            role: 'system',
            content: `Tu es un expert en rédaction de carnets de voyage style ADGENTES. Tu dois créer du contenu HTML structuré et élégant pour chaque jour d'un voyage.

STYLE ADGENTES - RÈGLES DE RÉDACTION :
- Ton élégant, informatif et pratique
- Structure chronologique claire avec horaires précis (ex: 11h30, 15h30)
- Titres descriptifs et évocateurs (ex: "De la vallée du Douro à la côte atlantique – Nature & gourmandises")
- Descriptions détaillées mais concises des activités
- Informations pratiques complètes (adresses, coordonnées GPS, conseils vestimentaires)
- Points de rendez-vous précis et instructions d'arrivée
- Mentions des prestataires et lieux exacts

RÈGLES TECHNIQUES CRITIQUES :
- RESPECTE EXACTEMENT les informations de la base de données (heures, références, prestataires, etc.)
- NE MODIFIE JAMAIS les données confirmées
- Tu peux rechercher automatiquement sur le web des informations complémentaires (adresses exactes, horaires d'ouverture, conseils pratiques, etc.)
- Si une info n'est pas trouvée même avec la recherche web, écris "Non précisé"
- Génère 1-2 images maximum via URL Unsplash/Pexels
- Utilise les classes CSS : theme-text, theme-border, theme-bg
- Format de sortie : HTML pur sans balises <html>, <head> ou <body>`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 3000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erreur OpenAI:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedHTML = data.choices[0].message.content;

    console.log(`Contenu généré avec succès pour le jour ${dayIndex + 1}`);

    return new Response(
      JSON.stringify({ html: generatedHTML }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Erreur dans generate-day-content:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Voir les logs pour plus d\'informations'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function createPrompt(day: any, dayIndex: number): string {
  const dayDate = new Date(day.date);
  const segments = day.segments || [];
  
  return `
Génère le contenu HTML pour ce jour de voyage dans le style ADGENTES :

DATE: ${dayDate.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
NOMBRE D'ACTIVITÉS: ${segments.length}

SEGMENTS DE LA BASE DE DONNÉES (À RESPECTER EXACTEMENT):
${segments.map((segment: any, i: number) => `
${i + 1}. ${segment.segment_type.toUpperCase()}: ${segment.title}
   - Prestataire: ${segment.provider || 'Non précisé'}
   - Référence: ${segment.reference_number || 'Non précisée'}
   - Adresse: ${segment.address || 'Non précisée'}
   - Heure début: ${segment.start_date ? new Date(segment.start_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Non précisée'}
   - Heure fin: ${segment.end_date ? new Date(segment.end_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Non précisée'}
   - Description: ${segment.description || 'Aucune'}
`).join('\n')}

INSTRUCTIONS DE RÉDACTION STYLE ADGENTES :
1. Titre de journée évocateur et descriptif
2. Structure chronologique claire avec horaires précis
3. Pour chaque activité/segment :
   - Titre avec horaire (ex: "11h30 – Traversée de la passerelle 516 Arouca")
   - Description élégante et informative
   - Informations pratiques détaillées (point de rendez-vous, conseils, adresse complète)
   - Recherche web pour compléter les infos manquantes (adresses exactes, conseils pratiques, horaires)

4. Style de rédaction :
   - Phrases courtes et directes
   - Ton informatif mais engageant
   - Détails pratiques précis
   - Conseils utiles (chaussures, arrivée en avance, etc.)

5. Format HTML structuré avec classes CSS theme-*
6. 1-2 images pertinentes maximum (URL Unsplash/Pexels)

EXEMPLE DE STYLE ATTENDU :
"11h30 – Traversée de la passerelle 516 Arouca (départ Alvarenga)
Préparez-vous à vivre une expérience impressionnante sur l'un des ponts suspendus les plus longs du monde (516 m). À 175 m au-dessus de la rivière Paiva, cette passerelle offre une vue à couper le souffle sur les gorges et montagnes environnantes.
Point de rendez-vous : Alvarenga – coordonnées GPS fournies avec votre billet
Prévoir des chaussures confortables et de l'eau"

Format de sortie: HTML pur sans balises <html>, <head> ou <body>.
`;
}