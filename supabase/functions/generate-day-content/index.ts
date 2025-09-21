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
            content: `Tu es un expert en rédaction de carnets de voyage style ADGENTES. Tu dois créer du contenu HTML structuré, élégant et moderne pour chaque jour d'un voyage.

STYLE ADGENTES - APPROCHE GUIDE PLUTÔT QUE PLANNING :
- Ton sophistiqué, informatif et engageant avec une approche narrative
- Style guide souple et inspirant plutôt qu'un planning rigide
- Titres élégants et descriptifs avec contexte géographique/culturel
- Descriptions riches incluant histoire, anecdotes et conseils d'expert
- Informations pratiques détaillées enrichies par recherche web
- Contexte culturel et historique pour enrichir l'expérience
- Conseils pratiques spécialisés selon le type d'activité

FORMAT HTML REQUIS :
- Conteneur principal avec classes theme appropriées
- Hiérarchie claire : date → segments → détails → conseils
- Classes CSS cohérentes : theme-text, theme-border, theme-bg, theme-accent
- Séparateurs visuels entre les segments
- Mise en forme distinctive selon le type (vol, hôtel, activité, transfert)

RÈGLES TECHNIQUES CRITIQUES :
- RESPECTE EXACTEMENT les données confirmées (références, prestataires, adresses)
- NE MODIFIE JAMAIS les informations factuelles de la base
- Enrichis avec recherche web automatique (adresses complètes, contexte historique, conseils)
- HEURES : N'inclus les horaires QUE si ils sont spécifiés dans les données
- Si aucune heure précise, évite de mentionner des horaires pour garder la flexibilité
- Privilégie des indications temporelles souples (matin, après-midi, soirée)
- Format de sortie : HTML structuré sans balises <html>, <head> ou <body>`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
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
  
  // Fonction helper pour formater les types de segments
  const getSegmentTypeIcon = (type: string) => {
    const icons = {
      'flight': '✈️',
      'hotel': '🏨', 
      'activity': '🎯',
      'car': '🚗',
      'train': '🚆',
      'boat': '⛵',
      'transfer': '🚌',
      'pass': '🎫',
      'other': '📍'
    };
    return icons[type] || '📍';
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      // Vérifier si l'heure est spécifiée (différente de 00:00:00)
      const hours = date.getUTCHours();
      const minutes = date.getUTCMinutes();
      if (hours === 0 && minutes === 0) return null; // Pas d'heure spécifiée
      
      return date.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'UTC'
      });
    } catch {
      return null;
    }
  };

  const segmentsDetails = segments.map((segment: any, i: number) => {
    const startTime = formatTime(segment.start_date);
    const endTime = formatTime(segment.end_date);
    const icon = getSegmentTypeIcon(segment.segment_type);
    
    return `
SEGMENT ${i + 1} - ${segment.segment_type.toUpperCase()} ${icon}
• Titre: "${segment.title}"
• Prestataire: ${segment.provider || 'Non précisé'}
• Référence: ${segment.reference_number || 'Non précisée'}
• Adresse: ${segment.address || 'À rechercher sur le web'}
• Heure début: ${startTime || 'Non spécifiée - à mentionner seulement si pertinent'}
• Heure fin: ${endTime || 'Non spécifiée - à mentionner seulement si pertinent'}
• Description base: ${segment.description || 'À enrichir avec recherche web'}`;
  }).join('\n');
  
  return `
Crée le contenu HTML pour cette journée de voyage dans le style ADGENTES sophistiqué :

📅 DATE: ${dayDate.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
📍 SEGMENTS À TRAITER: ${segments.length}

${segmentsDetails}

STRUCTURE HTML ATTENDUE (EXEMPLE) :
<div class="theme-bg rounded-lg p-6 mb-8 border theme-border">
  <h2 class="text-2xl font-bold theme-text mb-4">
    ${dayDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
  </h2>
  <h3 class="text-xl theme-accent mb-6 font-medium">
    Titre évocateur du jour – Contexte géographique & thématique
  </h3>
  
  <div class="space-y-6">
    <div class="border-l-4 theme-border pl-4">
      <h4 class="font-semibold theme-text text-lg mb-2">
        🚆 [Type] Titre élégant de l'activité (avec heure seulement si spécifiée)
      </h4>
      <div class="theme-text text-sm mb-3 leading-relaxed">
        Description narrative enrichie avec contexte historique/culturel trouvé par recherche web.
        Anecdotes pertinentes et conseils d'expert.
      </div>
      <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm">
        <strong>Informations pratiques :</strong><br/>
        • Point de rendez-vous : [Adresse complète trouvée par recherche]<br/>
        • Durée estimée : [Si disponible]<br/>
        • Conseils : [Spécifiques au type d'activité]
      </div>
    </div>
  </div>
</div>

INSTRUCTIONS SPÉCIALES PAR TYPE DE SEGMENT :

✈️ VOL : Inclure aéroports complets, temps de trajet, conseils d'enregistrement
🏨 HÔTEL : Check-in/out, commodités, quartier, restaurants proximité  
🎯 ACTIVITÉ : Contexte historique, anecdotes, conseils pratiques, horaires d'ouverture
🚗 LOCATION/TRANSFERT : Durée trajet, points remarquables sur la route, conseils conduite
🚆 TRAIN : Gares exactes, correspondances, paysages traversés, conseils réservation
⛵ BATEAU : Conditions météo, points d'intérêt navigation, conseils mal de mer
🎫 PASS/BILLET : Modalités d'utilisation, sites couverts, conseils optimisation

RÈGLES DE CHRONOLOGIE SOUPLE :
- Si heures réelles disponibles → utilise-les en format français élégant
- Si heures manquantes → NE PAS inventer d'horaires, utilise des indications souples (matin, après-midi)
- Privilégie un ordre logique sans contraintes temporelles rigides
- Style guide accompagnateur plutôt que planning strict

ENRICHISSEMENT OBLIGATOIRE :
- Recherche web pour adresses complètes et précises
- Contexte historique/culturel des lieux visités  
- Anecdotes locales et légendes si pertinentes
- Conseils pratiques spécialisés (météo, tenue, horaires optimaux)
- Informations transport public si nécessaire

STYLE NARRATIF ADGENTES :
- Ton expert et passionné, jamais commercial
- Phrases élégantes mais accessibles  
- Détails pratiques intégrés naturellement
- Perspective d'initié avec conseils exclusifs
- Évocation sensorielle des expériences

CLASSES CSS À UTILISER :
theme-bg, theme-text, theme-border, theme-accent pour la cohérence visuelle.

FORMAT FINAL : HTML propre sans balises <html>/<head>/<body>, prêt pour intégration directe.
`;
}