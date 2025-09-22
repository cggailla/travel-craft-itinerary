import { supabase } from "@/integrations/supabase/client";

export interface StepContentResult {
  stepId: string;
  html: string;
  success: boolean;
  error?: string;
}

/**
 * Generate HTML content for a specific travel step using GPT
 */
export async function generateStepPageHTML(tripId: string, stepId: string): Promise<StepContentResult> {
  try {
    console.log(`Generating content for trip ${tripId}, step ${stepId}`);
    
    const { data, error } = await supabase.functions.invoke('generate-step-content', {
      body: {
        tripId,
        stepId
      }
    });

    if (error) {
      console.error('Error calling generate-step-content function:', error);
      return {
        stepId,
        html: '',
        success: false,
        error: `Function error: ${error.message}`
      };
    }

    if (!data?.success) {
      console.error('Generate-step-content function returned error:', data?.error);
      return {
        stepId,
        html: '',
        success: false,
        error: data?.error || 'Unknown error from content generation'
      };
    }

    return {
      stepId,
      html: data.html,
      success: true
    };

  } catch (error) {
    console.error('Error in generateStepPageHTML:', error);
    return {
      stepId,
      html: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Parse rate limit delay from error message
 */
function parseRateLimitDelay(error: string): number | null {
  const match = error.match(/try again in (\d+(?:\.\d+)?)(ms|s)/i);
  if (match) {
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    return unit === 'ms' ? Math.ceil(value / 1000) : Math.ceil(value);
  }
  return null;
}

/**
 * Delay execution for specified seconds
 */
function delay(seconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

/**
 * Generate content for a single step with retry logic
 */
async function generateStepWithRetry(
  tripId: string, 
  stepId: string, 
  maxRetries: number = 3,
  onProgress?: (stepId: string, status: 'generating' | 'completed' | 'error', error?: string, result?: StepContentResult) => void
): Promise<StepContentResult> {
  onProgress?.(stepId, 'generating');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await generateStepPageHTML(tripId, stepId);
      
      if (result.success) {
        onProgress?.(stepId, 'completed', undefined, result);
        return result;
      }

      // Check for rate limiting
      if (result.error?.includes('rate') || result.error?.includes('limit')) {
        const waitTime = parseRateLimitDelay(result.error) || (attempt * 5);
        console.log(`Rate limited for step ${stepId}, waiting ${waitTime} seconds...`);
        
        if (attempt < maxRetries) {
          await delay(waitTime);
          continue;
        }
      }

      // If this is the last attempt or not a rate limit error, return the error
      if (attempt === maxRetries) {
        onProgress?.(stepId, 'error', result.error, result);
        return result;
      }

      // Wait before retrying for other errors
      await delay(attempt * 2);

    } catch (error) {
      console.error(`Attempt ${attempt} failed for step ${stepId}:`, error);
      
      if (attempt === maxRetries) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorResult = {
          stepId,
          html: '',
          success: false,
          error: errorMessage
        };
        onProgress?.(stepId, 'error', errorMessage, errorResult);
        return errorResult;
      }

      await delay(attempt * 2);
    }
  }

  // This shouldn't be reached, but just in case
  const errorResult = {
    stepId,
    html: '',
    success: false,
    error: 'Max retries exceeded'
  };
  onProgress?.(stepId, 'error', 'Max retries exceeded', errorResult);
  return errorResult;
}

/**
 * Generate content for all steps of a trip
 */
export async function generateAllStepsContent(
  tripId: string,
  onProgress?: (stepId: string, status: 'generating' | 'completed' | 'error', error?: string, result?: StepContentResult) => void
): Promise<StepContentResult[]> {
  try {
    // First, fetch all steps for this trip
    const { data: steps, error: stepsError } = await supabase
      .from('travel_steps')
      .select('step_id')
      .eq('trip_id', tripId)
      .order('step_id');

    if (stepsError || !steps) {
      console.error('Error fetching steps:', stepsError);
      return [];
    }

    if (steps.length === 0) {
      console.log('No steps found for trip');
      return [];
    }

    console.log(`Generating content for ${steps.length} steps...`);

    const results: StepContentResult[] = [];

    // Generate content for each step sequentially to avoid overwhelming the API
    for (const step of steps) {
      const result = await generateStepWithRetry(tripId, step.step_id, 3, onProgress);
      results.push(result);

      // Add a small delay between steps to be respectful to the API
      if (step !== steps[steps.length - 1]) {
        await delay(1);
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Content generation completed: ${successCount}/${results.length} steps successful`);

    return results;

  } catch (error) {
    console.error('Error in generateAllStepsContent:', error);
    return [];
  }
}