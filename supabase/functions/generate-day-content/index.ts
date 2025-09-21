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
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Tu es un expert en rédaction de carnets de voyage style ADGENTES. Tu dois créer du contenu HTML structuré et élégant pour chaque jour d'un voyage.

RÈGLES CRITIQUES :
- RESPECTE EXACTEMENT les informations de la base de données (heures, références, prestataires, etc.)
- NE MODIFIE JAMAIS les données confirmées
- Complète uniquement les informations manquantes par recherche web
- Si tu ne trouves pas une info, écris "Non précisé" 
- Génère 1-2 images maximum via URL Unsplash/Pexels
- Utilise les classes CSS existantes du projet (theme-text, theme-border, etc.)
- Style ADGENTES : élégant, pratique, informatif`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
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
Génère le contenu HTML pour ce jour de voyage :

DATE: ${dayDate.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
NOMBRE D'ACTIVITÉS: ${segments.length}

SEGMENTS DE LA BASE DE DONNÉES:
${segments.map((segment: any, i: number) => `
${i + 1}. ${segment.segment_type.toUpperCase()}: ${segment.title}
   - Prestataire: ${segment.provider || 'Non précisé'}
   - Référence: ${segment.reference_number || 'Non précisée'}
   - Adresse: ${segment.address || 'Non précisée'}
   - Heure début: ${segment.start_date ? new Date(segment.start_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Non précisée'}
   - Heure fin: ${segment.end_date ? new Date(segment.end_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Non précisée'}
   - Description: ${segment.description || 'Aucune'}
`).join('\n')}

INSTRUCTIONS:
1. Crée un HTML structuré avec le titre du jour
2. Pour chaque segment, génère une carte élégante avec:
   - Icône émoji appropriée
   - Informations de la DB (EXACTEMENT comme fournies)
   - Infos complémentaires trouvées par recherche web si nécessaire
   - Conseils pratiques
3. Ajoute un bloc "NOTES PRATIQUES" avec conseils du jour
4. Ajoute 1-2 images pertinentes (URL directe Unsplash/Pexels)
5. Utilise les classes CSS: theme-text, theme-border, theme-bg

Format de sortie: HTML pur sans balises <html>, <head> ou <body>.
`;
}