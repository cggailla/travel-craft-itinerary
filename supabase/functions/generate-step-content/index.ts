import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

Deno.serve(async (req) => {
  console.log('Generate step content function called')
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const { tripId, stepId } = await req.json()
    
    if (!tripId) {
      throw new Error('Trip ID is required')
    }
    
    if (!stepId) {
      throw new Error('Step ID is required')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`Generating content for trip ${tripId}, step ${stepId}`)

    // Récupérer d'abord les informations de l'étape
    const { data: step, error: stepError } = await supabase
      .from('travel_steps')
      .select('*')
      .eq('trip_id', tripId)
      .eq('step_id', stepId)
      .single()

    if (stepError || !step) {
      console.error('Error fetching step:', stepError)
      throw new Error(`Failed to fetch step: ${stepError?.message || 'Step not found'}`)
    }

    // Récupérer les segments de cette étape via la table de liaison
    const { data: stepSegments, error: segmentsError } = await supabase
      .from('travel_step_segments')
      .select(`
        position_in_step,
        role,
        travel_segments(*)
      `)
      .eq('step_id', step.id)
      .order('position_in_step', { ascending: true })

    if (segmentsError) {
      console.error('Error fetching step segments:', segmentsError)
      throw new Error(`Failed to fetch step segments: ${segmentsError.message}`)
    }

    // Extraire et enrichir les segments
    const segments = stepSegments?.map(tss => ({
      ...tss.travel_segments,
      position_in_step: tss.position_in_step,
      role: tss.role
    })) || []

    console.log(`Found step with ${segments.length} segments`)

    if (segments.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No segments found for this step'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      )
    }

    // Create the step object for the prompt
    const stepData = {
      step_id: step.step_id,
      step_type: step.step_type,
      step_title: step.step_title,
      start_date: step.start_date,
      end_date: step.end_date,
      primary_location: step.primary_location,
      segments: segments
    }

    // Generate the prompt and call OpenAI
    const prompt = createStepPrompt(stepData)
    
    console.log('Calling OpenAI...')

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: `Tu es un expert en rédaction de carnets de voyage style ADGENTES. Tu dois créer du contenu HTML structuré, élégant et moderne pour chaque étape d'un voyage.

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
- Hiérarchie claire : étape → segments → détails → conseils
- Classes CSS cohérentes : theme-text, theme-border, theme-bg, theme-accent
- Séparateurs visuels entre les segments
- Mise en forme distinctive selon le type (vol, hôtel, activité, transfert)

RÈGLES TECHNIQUES CRITIQUES :
- RESPECTE EXACTEMENT les données confirmées (références, prestataires, adresses)
- RESPECTE OBLIGATOIREMENT l'ordre des segments de la base de donnée (position_in_step)
- NE MODIFIE JAMAIS les informations factuelles de la base
- Enrichis avec recherche web automatique (adresses complètes, contexte historique, conseils)
- HEURES : N'inclus les horaires QUE si ils sont spécifiés dans les données
- Si aucune heure précise, évite de mentionner des horaires pour garder la flexibilité
- Privilégie des indications temporelles souples (matin, après-midi, soirée)
- Format de sortie : HTML structuré sans balises <html>, <head> ou <body>`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 3000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI API error:', response.status, errorText)
      
      // Gestion spécifique du rate limiting
      if (response.status === 429) {
        throw new Error(`Rate limit atteint. Essayez à nouveau dans quelques secondes.`)
      }
      
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const generatedHtml = data.choices[0].message.content
    
    console.log('Content generated successfully')

    return new Response(
      JSON.stringify({
        success: true,
        stepId: stepId,
        html: generatedHtml
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Generate step content function error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

function createStepPrompt(step: any): string {
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

  const startDateFormatted = step.start_date ? new Date(step.start_date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : ''

  const endDateFormatted = step.end_date && step.end_date !== step.start_date ? 
    new Date(step.end_date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : ''

  const dateRange = endDateFormatted ? `${startDateFormatted} - ${endDateFormatted}` : startDateFormatted

  const segmentsDetails = step.segments.map((segment: any, i: number) => {
    const startTime = formatTime(segment.start_date);
    const endTime = formatTime(segment.end_date);
    const icon = getSegmentTypeIcon(segment.segment_type);
    
    return `
SEGMENT ${i + 1} - ${segment.segment_type.toUpperCase()} ${icon}
• Titre: "${segment.title}"
• Rôle dans l'étape: ${segment.role || 'Non spécifié'}
• Prestataire: ${segment.provider || 'Non précisé'}
• Référence: ${segment.reference_number || 'Non précisée'}
• Adresse: ${segment.address || 'À rechercher sur le web'}
• Heure début: ${startTime || 'Non spécifiée - à mentionner seulement si pertinent'}
• Heure fin: ${endTime || 'Non spécifiée - à mentionner seulement si pertinent'}
• Description base: ${segment.description || 'À enrichir avec recherche web'}`;
  }).join('\n');
  
  return `
Crée le contenu HTML pour cette étape de voyage dans le style ADGENTES sophistiqué :

🏷️ **ÉTAPE: ${step.step_title}** (${step.step_type})
📅 **PÉRIODE:** ${dateRange}
📍 **LIEU PRINCIPAL:** ${step.primary_location || 'Non spécifié'}
📊 **SEGMENTS À TRAITER:** ${step.segments.length}

${segmentsDetails}

!!!!!!  TOUTES LES INFOS PRESENTES DOIVENT ETRE PRESENTES OBLIGATOIREMENT DANS LE TEXTE GENERE. !!!!!

STRUCTURE HTML ATTENDUE (EXEMPLE) :
<div class="theme-bg rounded-lg p-6 mb-8 border theme-border">
  <h2 class="text-2xl font-bold theme-text mb-4">
    ${step.step_title}
  </h2>
  <h3 class="text-xl theme-accent mb-6 font-medium">
    ${dateRange} – Contexte géographique & thématique
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

ORDRE DES SEGMENTS :
- RESPECTE OBLIGATOIREMENT l'ordre position_in_step des segments
- Chaque segment a un rôle spécifique dans l'étape (${step.segments.map(s => s.role).filter(Boolean).join(', ')})
- Organise le récit selon la logique temporelle de l'étape

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