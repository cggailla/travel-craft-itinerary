import { supabase } from "@/integrations/supabase/client";
import { TimelineDay } from "@/types/travel";

export interface DayContentResult {
  dayIndex: number;
  html: string;
  success: boolean;
  error?: string;
}

export async function generateDayPageHTML(tripId: string, dayIndex: number): Promise<DayContentResult> {
  try {
    console.log(`Génération du contenu GPT pour le voyage ${tripId}, jour ${dayIndex + 1}`);

    const { data, error } = await supabase.functions.invoke('generate-day-content', {
      body: {
        tripId,
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

    if (!data?.success) {
      console.error('Réponse invalide de l\'edge function:', data);
      return {
        dayIndex,
        html: '',
        success: false,
        error: data?.error || 'Réponse invalide du service GPT'
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

//Parse rate limit errors to extract wait time 
function parseRateLimitDelay(error: string): number | null {
  const match = error.match(/try again in (\d+(?:\.\d+)?)(ms|s)/i);
  if (match) {
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    return unit === 'ms' ? Math.ceil(value / 1000) : Math.ceil(value);
  }
  return null;
}

// Attendre avec un délai spécifique
function delay(seconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

// Génération d'un jour avec retry intelligent
async function generateDayWithRetry(
  tripId: string, 
  dayIndex: number, 
  maxRetries: number = 3,
  onProgress?: (dayIndex: number, status: string) => void
): Promise<DayContentResult> {
  for (let retryCount = 0; retryCount <= maxRetries; retryCount++) {
    try {
      onProgress?.(dayIndex, retryCount === 0 ? 'generating' : `retry-${retryCount}`);
      
      const result = await generateDayPageHTML(tripId, dayIndex);
      
      if (result.success) {
        onProgress?.(dayIndex, 'completed');
        return result;
      }
      
      // Check for rate limiting errors
      if (result.error?.includes('Rate limit') || result.error?.includes('429')) {
        const waitTime = parseRateLimitDelay(result.error) || (retryCount * 5 + 5);
        if (retryCount < maxRetries) {
          console.log(`Rate limit pour jour ${dayIndex + 1}, attente de ${waitTime}s...`);
          onProgress?.(dayIndex, `waiting-${waitTime}`);
          await delay(waitTime + 1); // +1s de marge
          continue; // Continue to next retry
        }
      }
      
      // If not a rate limit error or final attempt, return the error
      onProgress?.(dayIndex, 'failed');
      return result;
      
    } catch (error) {
      console.error(`Erreur génération jour ${dayIndex + 1}, tentative ${retryCount + 1}:`, error);
      
      if (retryCount < maxRetries) {
        onProgress?.(dayIndex, `error-retry-${retryCount}`);
        await delay(2); // Délai standard entre les tentatives
        continue; // Continue to next retry
      }
      
      onProgress?.(dayIndex, 'failed');
      return {
        dayIndex,
        html: '',
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
  
  // This should not be reached, but just in case
  onProgress?.(dayIndex, 'failed');
  return {
    dayIndex,
    html: '',
    success: false,
    error: 'Nombre maximum de tentatives atteint'
  };
}

export async function generateAllDaysContent(
  tripId: string, 
  totalDays: number,
  onProgress?: (completedDays: number, currentDay: number, status: string) => void
): Promise<DayContentResult[]> {
  console.log(`Génération séquentielle du contenu pour ${totalDays} jours du voyage ${tripId}`);
  
  const results: DayContentResult[] = [];
  
  for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
    console.log(`Génération jour ${dayIndex + 1}/${totalDays}...`);
    
    const result = await generateDayWithRetry(
      tripId, 
      dayIndex, 
      3, // 3 tentatives max
      (day, status) => onProgress?.(results.length, day, status)
    );
    
    results.push(result);
    onProgress?.(results.length, dayIndex, result.success ? 'completed' : 'failed');
    
    // Délai entre chaque jour pour éviter le rate limiting
    if (dayIndex < totalDays - 1) {
      console.log('Attente 3s avant le jour suivant...');
      await delay(3);
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log(`Génération séquentielle terminée: ${successCount}/${totalDays} jours réussis`);
  
  return results;
}