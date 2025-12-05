import { supabase } from "@/integrations/supabase/client";
import { AIContentRequest, AIContentResult } from '@/types/enrichedStep';

/**
 * Save AI-generated content to the database
 */
export async function saveAIContentToDatabase(
  stepId: string, 
  aiContent: AIContentResult
): Promise<void> {
  try {
    const { error } = await supabase
      .from('travel_steps')
      .update({ 
        ai_content: {
          overview: aiContent.overview,
          tips: aiContent.tips,
          localContext: aiContent.localContext,
          generated_at: new Date().toISOString(),
          version: '1.0',
          is_custom: false
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', stepId);

    if (error) {
      console.error('❌ Error saving AI content to database:', error);
      throw error;
    }

    console.log(`✅ AI content saved to database for step ${stepId}`);
  } catch (error) {
    console.error('❌ Failed to save AI content to database:', error);
    // Ne pas bloquer la génération si la sauvegarde échoue
  }
}

export interface ParsedStepInfo {
  stepNumber: number;
  title: string;
  dates: string;
  location: string;
  description: string;
}

export interface TripMetadata {
  title: string;
  destinationZone: string;
}

/**
 * Parse trip summary text to extract step information using regex
 */
export function parseTripSummary(tripSummary: string): ParsedStepInfo[] {
  console.log('🔍 Starting to parse trip summary...');
  console.log('Input text length:', tripSummary.length);
  
  const steps: ParsedStepInfo[] = [];
  
  // Regex to match: "Etape X - [Title] (dates) {Location}"
  const stepRegex = /^Etape (\d+) - (.+?) \(([^)]+)\) \{([^}]+)\}/gm;
  
  // Split by lines to separate step titles from descriptions
  const lines = tripSummary.split('\n');
  console.log('Total lines to process:', lines.length);
  
  let currentStep: Partial<ParsedStepInfo> | null = null;
  let currentDescription: string[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (!trimmedLine) continue;
    
    // Check if this line is a step header
    const stepMatch = trimmedLine.match(/^Etape (\d+) - (.+?) \(([^)]+)\) \{([^}]+)\}/);
    
    if (stepMatch) {
      console.log('✅ Found step header:', trimmedLine);
      console.log('  - Step number:', stepMatch[1]);
      console.log('  - Title:', stepMatch[2]);
      console.log('  - Dates:', stepMatch[3]);
      console.log('  - Location:', stepMatch[4]);
      
      // Save previous step if exists
      if (currentStep) {
        const completeStep = {
          ...currentStep,
          description: currentDescription.join(' ').trim()
        } as ParsedStepInfo;
        steps.push(completeStep);
        console.log('✅ Saved previous step:', completeStep.stepNumber, completeStep.title);
      }
      
      // Start new step
      currentStep = {
        stepNumber: parseInt(stepMatch[1]),
        title: stepMatch[2].trim(),
        dates: stepMatch[3].trim(),
        location: stepMatch[4].trim()
      };
      currentDescription = [];
    } else if (currentStep && trimmedLine) {
      // This is description content for the current step
      currentDescription.push(trimmedLine);
      console.log('📝 Added description line to step', currentStep.stepNumber, ':', trimmedLine.substring(0, 50) + '...');
    }
  }
  
  // Don't forget the last step
  if (currentStep) {
    const completeStep = {
      ...currentStep,
      description: currentDescription.join(' ').trim()
    } as ParsedStepInfo;
    steps.push(completeStep);
    console.log('✅ Saved last step:', completeStep.stepNumber, completeStep.title);
  }
  
  console.log('🎉 Parsing completed! Found', steps.length, 'steps:');
  steps.forEach(step => {
    console.log(`  Step ${step.stepNumber}: ${step.title} (${step.dates}) {${step.location}}`);
  });
  
  return steps;
}

/**
 * Parse trip metadata (title and destination zone) from trip summary
 */
export function parseTripMetadata(tripSummary: string): TripMetadata | null {
  console.log('🔍 Extracting trip metadata...');
  
  const titleRegex = /^Titre du voyage\s*:\s*(.+?)$/m;
  const zoneRegex = /^Zone \/ Pays\s*:\s*(.+?)$/m;
  
  const titleMatch = tripSummary.match(titleRegex);
  const zoneMatch = tripSummary.match(zoneRegex);
  
  if (titleMatch && zoneMatch) {
    const metadata = {
      title: titleMatch[1].trim(),
      destinationZone: zoneMatch[1].trim()
    };
    console.log('✅ Metadata extracted:', metadata);
    return metadata;
  }
  
  console.warn('⚠️ Could not extract metadata from trip summary');
  return null;
}

/**
 * Generate and parse trip summary in one operation
 */
export async function generateAndParseTripSummary(tripId: string): Promise<ParsedStepInfo[]> {
  // 1. Check if summary already exists
  const { data: existingTrip } = await supabase
    .from('trips')
    .select('trip_summary')
    .eq('id', tripId)
    .single();

  let tripSummary = existingTrip?.trip_summary;

  if (!tripSummary) {
    console.log('📝 No existing trip summary found, generating new one...');
    tripSummary = await generateTripSummary(tripId);
    
    // Save the generated summary
    if (tripSummary) {
      const { error: saveError } = await supabase
        .from('trips')
        .update({ trip_summary: tripSummary } as any)
        .eq('id', tripId);
        
      if (saveError) {
        console.error('❌ Failed to save trip summary:', saveError);
      } else {
        console.log('✅ Trip summary saved to database');
      }
    }
  } else {
    console.log('✅ Using existing trip summary from database');
  }
  
  if (!tripSummary) return [];

  // Extract and save metadata (title + destination zone)
  const metadata = parseTripMetadata(tripSummary);
  if (metadata) {
    const { error } = await supabase
      .from('trips')
      .update({
        title: metadata.title,
        destination_zone: metadata.destinationZone
      })
      .eq('id', tripId);
    
    if (error) {
      console.error('❌ Failed to save trip metadata:', error);
    } else {
      console.log('✅ Trip metadata saved to database');
    }
  }
  
  return parseTripSummary(tripSummary);
}

/**
 * Consolidate duplicate segments within trip steps
 */
async function consolidateStepSegments(tripId: string): Promise<void> {
  console.log(`Consolidating duplicate segments for trip: ${tripId}`);
  // Diagnostic: log session presence and invocation details
  try {
    const s = await supabase.auth.getSession();
    console.log('[ai] consolidate-step-segments - session present?', !!s?.data?.session, { user: s?.data?.session?.user?.email });
  } catch (e) {
    console.warn('[ai] consolidate-step-segments - could not read session', e);
  }
  console.log('[ai] Invoking consolidate-step-segments', { tripId });

  const { data, error } = await supabase.functions.invoke('consolidate-step-segments', {
    body: { tripId }
  });

  if (error) {
    console.error('Error consolidating segments:', error);
    try {
      console.error('Error details:', { name: (error as any)?.name, message: (error as any)?.message, status: (error as any)?.status, body: (error as any)?.body });
    } catch (er) {
      // ignore
    }
    throw new Error(`Failed to consolidate segments: ${error.message}`);
  }

  if (!data?.success) {
    console.error('Consolidation function returned error:', data?.error);
    throw new Error(data?.error || 'Unknown consolidation error');
  }

  console.log(`Consolidation completed: ${data.totalConsolidated} segments merged`);
}

/**
 * Generate trip summary for context
 */
export async function generateTripSummary(tripId: string): Promise<string> {
  console.log(`Generating trip summary for trip: ${tripId}`);
  // Diagnostic: log session presence and invocation details
  try {
    const s = await supabase.auth.getSession();
    console.log('[ai] generate-trip-summary - session present?', !!s?.data?.session, { user: s?.data?.session?.user?.email });
  } catch (e) {
    console.warn('[ai] generate-trip-summary - could not read session', e);
  }
  console.log('[ai] Invoking generate-trip-summary', { tripId });

  const { data, error } = await supabase.functions.invoke('generate-trip-summary', {
    body: { tripId }
  });

  if (error) {
    console.error('Error calling generate-trip-summary function:', error);
    try {
      console.error('Error details:', { name: (error as any)?.name, message: (error as any)?.message, status: (error as any)?.status, body: (error as any)?.body });
    } catch (er) {
      // ignore
    }
    return '';
  }

  if (!data?.success) {
    console.error('Generate-trip-summary function returned error:', data?.error);
    return '';
  }

  const tripSummary = data.tripSummary || '';
  console.log('✅ Raw trip summary received:');
  console.log('--- START TRIP SUMMARY ---');
  console.log(tripSummary);
  console.log('--- END TRIP SUMMARY ---');

  return tripSummary;
}

/**
 * Generate AI content for a step using targeted prompts
 */
export async function generateStepAIContent(request: AIContentRequest): Promise<AIContentResult> {
  try {
    console.log(`Generating AI content for step ${request.stepId}`);
    // Diagnostic: session presence and payload summary
    try {
      const s = await supabase.auth.getSession();
      console.log('[ai] generate-step-ai-content - session present?', !!s?.data?.session, { user: s?.data?.session?.user?.email });
    } catch (e) {
      console.warn('[ai] generate-step-ai-content - could not read session', e);
    }
  console.log('[ai] Invoking generate-step-ai-content', { stepId: request.stepId, payloadSummary: { keys: Object.keys(request || {}) } });

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

    // Images removed - manual upload only
    
    return {
      stepId: request.stepId,
      overview: data.overview || '',
      tips: data.tips || [],
      localContext: data.localContext,
      success: true
    };

  } catch (error) {
    console.error('Error in generateStepAIContent:', error);
    try {
      console.error('Error details:', { name: (error as any)?.name, message: (error as any)?.message, stack: (error as any)?.stack });
    } catch (er) {
      // ignore
    }
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
        // ✅ Sauvegarder le contenu en base de données
        await saveAIContentToDatabase(request.stepId, result);
        
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
 * Generate general travel information for a trip using Perplexity AI
 */
export async function generateTripGeneralInfo(tripId: string): Promise<void> {
  console.log(`🌍 Generating general info for trip ${tripId}`);
  
  const { data, error } = await supabase.functions.invoke('generate-trip-general-info', {
    body: { tripId }
  });
  
  if (error) {
    console.error('Error generating trip general info:', error);
    throw new Error(`Failed to generate general info: ${error.message}`);
  }
  
  if (!data.success) {
    throw new Error(data.error || 'Unknown error generating general info');
  }
  
  console.log('✅ Trip general info generated successfully');
}

/**
 * Enrich timeline with location data and recommendations
 */
export async function enrichTimeline(tripId: string): Promise<{ success: boolean; enrichedSegments: number; recommendations: number; error?: string }> {
  try {
    console.log('Enriching timeline for trip:', tripId);
    
    const { data, error } = await supabase.functions.invoke('enrich-timeline', {
      body: { tripId }
    });

    if (error) {
      console.error('Error calling enrich-timeline function:', error);
      return { success: false, enrichedSegments: 0, recommendations: 0, error: error.message };
    }

    return data;
  } catch (error) {
    console.error('Error in enrichTimeline:', error);
    return { 
      success: false, 
      enrichedSegments: 0, 
      recommendations: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Generate AI content for all steps
 */
export async function generateAllStepsAIContent(
  requests: AIContentRequest[],
  tripId: string,
  onProgress?: (type: 'consolidation' | 'trip-summary' | 'enrichment' | 'step', stepId?: string, status?: 'generating' | 'completed' | 'error', error?: string, result?: AIContentResult) => void
): Promise<AIContentResult[]> {
  const results: AIContentResult[] = [];

  try {
    // Step 0: Consolidate duplicate segments first
    onProgress?.('consolidation', undefined, 'generating');
    await consolidateStepSegments(tripId);
    onProgress?.('consolidation', undefined, 'completed');

    // Step 1: Generate trip summary first
    onProgress?.('trip-summary', undefined, 'generating');
    const tripSummary = await generateTripSummary(tripId);
    onProgress?.('trip-summary', undefined, 'completed');

    // Step 2: Generate trip general information
    console.log('🌍 Step 2: Generating general information for destination...');
    try {
      await generateTripGeneralInfo(tripId);
      console.log('✅ General information generated');
    } catch (error) {
      console.error('Error generating general info:', error);
      // Continue even if this fails - it's not critical
    }

    // Step 3: Enrich timeline with location data
    console.log('📍 Step 3: Enriching timeline with location data...');
    onProgress?.('enrichment', undefined, 'generating');
    const enrichmentResult = await enrichTimeline(tripId);
    onProgress?.('enrichment', undefined, enrichmentResult.success ? 'completed' : 'error', enrichmentResult.error);

    console.log('Enrichment result:', enrichmentResult);

    // Step 4: Process each step with trip summary context
    console.log(`🎨 Step 4: Generating AI content for ${requests.length} steps...`);
    for (let i = 0; i < requests.length; i++) {
      const request = { ...requests[i], tripSummary };
      console.log(`Processing AI content for step ${i + 1}/${requests.length}: ${request.stepId}`);
      
      const result = await generateStepAIContentWithRetry(
        request, 
        3, 
        (stepId, status, error, result) => onProgress?.('step', stepId, status, error, result)
      );
      results.push(result);
      
      // Small delay between requests to avoid overwhelming the API
      if (i < requests.length - 1) {
        await delay(0.5);
      }
    }

    return results;
  } catch (error) {
    console.error('Error in generateAllStepsAIContent:', error);
    throw error;
  }
}