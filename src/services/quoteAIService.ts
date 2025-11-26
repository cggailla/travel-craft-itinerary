import { supabase } from "@/integrations/supabase/client";

export interface QuoteStepDescriptionRequest {
  stepId: string;
  stepTitle: string;
  primaryLocation: string;
  segments?: any[];
  tripSummary?: string;
}

export interface QuoteStepDescriptionResult {
  stepId: string;
  quoteDescription: string;
  success: boolean;
  error?: string;
}

/**
 * Generate commercial description for a quote step
 */
export async function generateQuoteStepDescription(
  request: QuoteStepDescriptionRequest
): Promise<QuoteStepDescriptionResult> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-quote-step-description', {
      body: request
    });

    if (error) throw error;
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to generate description');
    }

    return {
      stepId: data.stepId,
      quoteDescription: data.quoteDescription,
      success: true
    };
  } catch (error) {
    console.error('Error generating quote step description:', error);
    return {
      stepId: request.stepId,
      quoteDescription: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate descriptions for all steps in a trip
 */
export async function generateAllQuoteDescriptions(
  tripId: string,
  onProgress?: (stepId: string, status: 'generating' | 'completed' | 'error', error?: string) => void
): Promise<QuoteStepDescriptionResult[]> {
  try {
    // Fetch trip summary for context
    const { data: trip } = await supabase
      .from('trips')
      .select('title, destination_zone')
      .eq('id', tripId)
      .single();

    const tripSummary = trip ? `${trip.title} - ${trip.destination_zone}` : undefined;

    // Fetch all steps with segments
    const { data: steps, error: stepsError } = await supabase
      .from('travel_steps')
      .select(`
        id,
        step_title,
        primary_location,
        ai_content,
        travel_step_segments (
          position_in_step,
          role,
          segment:travel_segments (
            id,
            title,
            segment_type,
            description
          )
        )
      `)
      .eq('trip_id', tripId)
      .order('start_date', { ascending: true });

    if (stepsError) throw stepsError;
    if (!steps || steps.length === 0) {
      return [];
    }

    const results: QuoteStepDescriptionResult[] = [];

    // Generate descriptions sequentially with delay
    for (const step of steps) {
      // Skip if already has quote description
      const aiContent = step.ai_content as { quoteDescription?: string } | null;
      if (aiContent?.quoteDescription) {
        console.log(`Step ${step.id} already has quote description, skipping`);
        results.push({
          stepId: step.id,
          quoteDescription: aiContent.quoteDescription,
          success: true
        });
        continue;
      }

      onProgress?.(step.id, 'generating');

      // Group segments by role
      const groupedSegments = step.travel_step_segments?.reduce((acc: any, tss: any) => {
        if (!tss.segment) return acc;
        
        const role = tss.role || 'other';
        if (!acc[role]) {
          acc[role] = [];
        }
        acc[role].push(tss.segment);
        return acc;
      }, {});

      const segments = groupedSegments ? Object.entries(groupedSegments).map(([role, segs]) => ({
        title: role,
        segments: segs
      })) : [];

      const result = await generateQuoteStepDescription({
        stepId: step.id,
        stepTitle: step.step_title,
        primaryLocation: step.primary_location || 'Destination',
        segments,
        tripSummary
      });

      results.push(result);

      if (result.success) {
        onProgress?.(step.id, 'completed');
      } else {
        onProgress?.(step.id, 'error', result.error);
      }

      // Delay between requests to avoid rate limiting
      if (steps.indexOf(step) < steps.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return results;
  } catch (error) {
    console.error('Error generating all quote descriptions:', error);
    throw error;
  }
}