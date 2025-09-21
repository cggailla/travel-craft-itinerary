import { supabase } from "@/integrations/supabase/client";
import { TimelineDay } from "@/types/travel";

export interface DayContentResult {
  dayIndex: number;
  html: string;
  success: boolean;
  error?: string;
}

export async function generateDayPageHTML(day: TimelineDay, dayIndex: number): Promise<DayContentResult> {
  try {
    console.log(`Génération du contenu GPT pour le jour ${dayIndex + 1}:`, day);

    const { data, error } = await supabase.functions.invoke('generate-day-content', {
      body: {
        day,
        dayIndex,
      }
    });

    if (error) {
      console.error('Erreur lors de l\'appel à l\'edge function:', error);
      return {
        dayIndex,
        html: '',
        success: false,
        error: error.message
      };
    }

    if (!data?.html) {
      console.error('Réponse invalide de l\'edge function:', data);
      return {
        dayIndex,
        html: '',
        success: false,
        error: 'Réponse invalide du service GPT'
      };
    }

    console.log(`Contenu généré avec succès pour le jour ${dayIndex + 1}`);
    return {
      dayIndex,
      html: data.html,
      success: true
    };

  } catch (error) {
    console.error('Erreur lors de la génération du contenu:', error);
    return {
      dayIndex,
      html: '',
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

export async function generateAllDaysContent(timeline: TimelineDay[]): Promise<DayContentResult[]> {
  console.log(`Génération parallèle du contenu pour ${timeline.length} jours`);
  
  const promises = timeline.map((day, index) => 
    generateDayPageHTML(day, index)
  );

  const results = await Promise.allSettled(promises);
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.error(`Échec de génération pour le jour ${index + 1}:`, result.reason);
      return {
        dayIndex: index,
        html: '',
        success: false,
        error: result.reason?.message || 'Erreur inconnue'
      };
    }
  });
}