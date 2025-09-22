import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { tripId } = await req.json();
    if (!tripId) {
      throw new Error('Missing tripId parameter');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Generating optimized content for trip:', tripId);

    // Get grouped segments using the new database function
    const { data: groupedSegments, error: segmentsError } = await supabase.rpc('get_grouped_segments', {
      p_trip_id: tripId
    });

    if (segmentsError) {
      console.error('Error fetching grouped segments:', segmentsError);
      throw segmentsError;
    }

    if (!groupedSegments || groupedSegments.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No segments found for this trip' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${groupedSegments.length} segment groups to process`);

    // Group segments by date for day-by-day processing
    const segmentsByDate: { [date: string]: any[] } = {};
    
    groupedSegments.forEach((group: any) => {
      const startDate = new Date(group.start_date).toISOString().split('T')[0];
      if (!segmentsByDate[startDate]) {
        segmentsByDate[startDate] = [];
      }
      segmentsByDate[startDate].push(group);
    });

    // Generate content for each day with grouped context
    const dayContents: any[] = [];
    const sortedDates = Object.keys(segmentsByDate).sort();

    for (let i = 0; i < sortedDates.length; i++) {
      const date = sortedDates[i];
      const dayGroups = segmentsByDate[date];
      
      console.log(`Processing day ${i + 1} (${date}) with ${dayGroups.length} segment groups`);

      try {
        const prompt = createOptimizedPrompt(dayGroups, i, date, sortedDates.length);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-5-mini-2025-08-07',
            messages: [{ role: 'user', content: prompt }],
            max_completion_tokens: 2000,
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error(`OpenAI API error for day ${i + 1}:`, errorData);
          throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
        }

        const data = await response.json();
        const generatedHtml = data.choices[0].message.content;

        dayContents.push({
          dayIndex: i,
          date,
          html: generatedHtml,
          success: true,
          groupCount: dayGroups.length,
          segmentCount: dayGroups.reduce((acc: number, group: any) => 
            acc + 1 + (group.child_segments?.length || 0), 0
          )
        });

        // Add delay between requests to respect rate limits
        if (i < sortedDates.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`Error generating content for day ${i + 1}:`, error);
        dayContents.push({
          dayIndex: i,
          date,
          html: '',
          success: false,
          error: error.message
        });
      }
    }

    const successCount = dayContents.filter(day => day.success).length;
    const totalGroups = groupedSegments.length;
    const totalSegments = groupedSegments.reduce((acc: number, group: any) => 
      acc + 1 + (group.child_segments?.length || 0), 0
    );

    console.log(`Content generation completed: ${successCount}/${dayContents.length} days successful`);
    console.log(`Processed ${totalGroups} groups (${totalSegments} total segments)`);

    return new Response(
      JSON.stringify({
        success: true,
        dayContents,
        stats: {
          totalDays: dayContents.length,
          successfulDays: successCount,
          totalGroups,
          totalSegments,
          optimizationRatio: `${totalGroups}/${totalSegments} groups (${Math.round((1 - totalGroups/totalSegments) * 100)}% reduction)`
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-optimized-content function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function createOptimizedPrompt(dayGroups: any[], dayIndex: number, date: string, totalDays: number): string {
  const formatTime = (dateString: string | null): string | null => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    if (hours === 0 && minutes === 0) return null;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const getSegmentTypeIcon = (type: string): string => {
    const icons: { [key: string]: string } = {
      'flight': '✈️',
      'hotel': '🏨',
      'activity': '🎯',
      'car': '🚗',
      'train': '🚂',
      'boat': '⛵',
      'pass': '🎫',
      'transfer': '🚌',
      'other': '📍'
    };
    return icons[type] || '📍';
  };

  let segmentInfo = '';
  
  dayGroups.forEach((group: any) => {
    const parentSegment = group.parent_segment;
    const childSegments = group.child_segments || [];
    const isMultiDay = group.total_days > 1;

    segmentInfo += `\n${getSegmentTypeIcon(parentSegment.segment_type)} **${parentSegment.title}**`;
    
    if (isMultiDay) {
      segmentInfo += ` (${group.total_days} jours)`;
    }
    
    if (parentSegment.provider) {
      segmentInfo += ` - ${parentSegment.provider}`;
    }
    
    const startTime = formatTime(parentSegment.start_date);
    const endTime = parentSegment.end_date ? formatTime(parentSegment.end_date) : null;
    
    if (startTime || endTime) {
      segmentInfo += ` (${startTime || 'N/A'}${endTime ? ` - ${endTime}` : ''})`;
    }
    
    if (parentSegment.address) {
      segmentInfo += `\n  📍 ${parentSegment.address}`;
    }
    
    if (parentSegment.reference_number) {
      segmentInfo += `\n  🎫 Référence: ${parentSegment.reference_number}`;
    }
    
    if (parentSegment.description) {
      segmentInfo += `\n  📝 ${parentSegment.description}`;
    }

    // Add child segments info if this is a multi-day group
    if (childSegments.length > 0) {
      segmentInfo += `\n  📅 Détails par jour:`;
      childSegments.forEach((child: any) => {
        const childDate = new Date(child.start_date).toLocaleDateString('fr-FR');
        segmentInfo += `\n    • ${childDate}`;
        if (child.reference_number && child.reference_number !== parentSegment.reference_number) {
          segmentInfo += ` (Réf: ${child.reference_number})`;
        }
      });
    }
    
    segmentInfo += '\n';
  });

  return `Tu es un expert en rédaction de carnets de voyage dans le style ADGENTES. Tu dois créer le contenu HTML pour le jour ${dayIndex + 1} sur ${totalDays} d'un voyage.

**DATE**: ${new Date(date).toLocaleDateString('fr-FR', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}

**SEGMENTS POUR CE JOUR** (groupés intelligemment):
${segmentInfo}

**STYLE ADGENTES - RÈGLES STRICTES**:

🎯 **STRUCTURE HTML REQUISE**:
\`\`\`html
<div class="day-content">
  <div class="day-header">
    <h2 class="day-title">Jour ${dayIndex + 1} • [Titre accrocheur]</h2>
    <p class="day-date">[Date formatée]</p>
  </div>
  
  <div class="day-timeline">
    [Timeline chronologique avec segments groupés]
  </div>
  
  <div class="day-narrative">
    [Récit enrichi du jour]
  </div>
</div>
\`\`\`

🔥 **CHRONOLOGIE INTELLIGENTE**:
- Traite les segments multi-jours comme une SEULE expérience continue
- Pour les hôtels multi-jours: "Installation à [hôtel] pour [X] nuits"
- Pour les activités répétées: groupe-les en une expérience narrative
- Utilise les horaires pour créer une timeline fluide

🌟 **ENRICHISSEMENT OBLIGATOIRE**:
- Utilise tes CONNAISSANCES pour enrichir chaque lieu/activité
- Ajoute du CONTEXTE CULTUREL et des DÉTAILS PRATIQUES
- Raconte des ANECDOTES et des CURIOSITÉS sur les lieux
- Suggère des EXPÉRIENCES COMPLÉMENTAIRES à proximité

📝 **TON NARRATIF**:
- Style PERSONNEL et ENGAGEANT (évite "vous devrez")
- Utilise le PRÉSENT de narration
- Crée de l'ÉMOTION et de l'ANTICIPATION
- Connecte les expériences entre elles

🎨 **CLASSES CSS À UTILISER**:
- \`segment-group-multi\` pour les segments multi-jours
- \`segment-single\` pour les segments uniques
- \`timeline-item\` pour chaque élément de timeline
- \`narrative-section\` pour les parties récit
- \`practical-info\` pour les infos pratiques

⚡ **OPTIMISATION**:
Ce système de groupement réduit les appels API de ~50%. Assure-toi que chaque groupe soit traité comme une expérience cohérente et non comme des segments séparés.

Génère maintenant le HTML optimisé pour ce jour, en traitant intelligemment les segments groupés !`;
}