import { supabase } from "@/integrations/supabase/client";
import { AIContentRequest, AIContentResult } from '@/types/enrichedStep';

/**
 * Generate trip summary for context
 */
async function generateTripSummary(tripId: string): Promise<string> {
  console.log(`Generating trip summary for trip: ${tripId}`);
  
  const { data, error } = await supabase.functions.invoke('generate-trip-summary', {
    body: { tripId }
  });

  if (error) {
    console.error('Error calling generate-trip-summary function:', error);
    return '';
  }

  if (!data?.success) {
    console.error('Generate-trip-summary function returned error:', data?.error);
    return '';
  }

  return data.tripSummary || '';
}

/**
 * Generate AI content for a step using targeted prompts
 */
export async function generateStepAIContent(request: AIContentRequest): Promise<AIContentResult> {
  try {
    console.log(`Generating AI content for step ${request.stepId}`);
    
    const { data, error } = await supabase.functions.invoke('generate-step-ai-content', {
      body: request
    });

    if (error) {
      console.error('Error calling generate-step-ai-content function:', error);
      return {
        stepId: request.stepId,
        overview: '',
        tips: [],
        success: false,
        error: `Function error: ${error.message}`
      };
    }

    if (!data?.success) {
      console.error('Generate-step-ai-content function returned error:', data?.error);
      return {
        stepId: request.stepId,
        overview: '',
        tips: [],
        success: false,
        error: data?.error || 'Unknown error from AI content generation'
      };
    }

    return {
      stepId: request.stepId,
      overview: data.overview || '',
      tips: data.tips || [],
      localContext: data.localContext,
      success: true
    };

  } catch (error) {
    console.error('Error in generateStepAIContent:', error);
    return {
      stepId: request.stepId,
      overview: '',
      tips: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Helper function to parse rate limit delay from error message
 */
function parseRateLimitDelay(error: string): number | null {
  const match = error.match(/try again in (\d+(\.\d+)?)s/);
  return match ? Math.ceil(parseFloat(match[1])) : null;
}

/**
 * Helper function to wait for a specified number of seconds
 */
function delay(seconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

/**
 * Generate AI content with retry logic for rate limiting
 */
async function generateStepAIContentWithRetry(
  request: AIContentRequest, 
  maxRetries: number = 3,
  onProgress?: (stepId: string, status: 'generating' | 'completed' | 'error', error?: string, result?: AIContentResult) => void
): Promise<AIContentResult> {
  onProgress?.(request.stepId, 'generating');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await generateStepAIContent(request);
      
      if (result.success) {
        onProgress?.(request.stepId, 'completed', undefined, result);
        return result;
      }

      // Check if it's a rate limit error
      const rateLimitDelay = result.error ? parseRateLimitDelay(result.error) : null;
      if (rateLimitDelay && attempt < maxRetries) {
        console.log(`Rate limited, waiting ${rateLimitDelay} seconds before retry...`);
        await delay(rateLimitDelay + 1); // Add 1 second buffer
        continue;
      }

      // If this is the last attempt or not a rate limit error, return the error
      if (attempt === maxRetries) {
        onProgress?.(request.stepId, 'error', result.error, result);
        return result;
      }

      await delay(attempt * 2);

    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorResult = {
          stepId: request.stepId,
          overview: '',
          tips: [],
          success: false,
          error: errorMessage
        };
        onProgress?.(request.stepId, 'error', errorMessage, errorResult);
        return errorResult;
      }

      await delay(attempt * 2);
    }
  }

  // This shouldn't be reached, but just in case
  const errorResult = {
    stepId: request.stepId,
    overview: '',
    tips: [],
    success: false,
    error: 'Max retries exceeded'
  };
  onProgress?.(request.stepId, 'error', 'Max retries exceeded', errorResult);
  return errorResult;
}

/**
 * Generate AI content for all steps
 */
export async function generateAllStepsAIContent(
  requests: AIContentRequest[],
  tripId: string,
  onProgress?: (stepId: string, status: 'generating' | 'completed' | 'error', error?: string, result?: AIContentResult) => void
): Promise<AIContentResult[]> {
  const results: AIContentResult[] = [];

  // Step 0: Generate trip summary for context
  onProgress?.('trip-summary', 'generating');
  const tripSummary = await generateTripSummary(tripId);
  onProgress?.('trip-summary', 'completed');

  // Process each step with trip summary context
  for (let i = 0; i < requests.length; i++) {
    const request = { ...requests[i], tripSummary };
    console.log(`Processing AI content for step ${i + 1}/${requests.length}: ${request.stepId}`);
    
    const result = await generateStepAIContentWithRetry(request, 3, onProgress);
    results.push(result);
    
    // Small delay between requests to avoid overwhelming the API
    if (i < requests.length - 1) {
      await delay(0.5);
    }
  }

  return results;
}