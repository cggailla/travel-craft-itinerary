import { supabase } from "@/integrations/supabase/client";

export interface StepGroupingResult {
  success: boolean;
  steps_created?: number;
  message?: string;
  error?: string;
}

/**
 * Group travel segments into semantic steps using LLM
 */
export async function groupTravelSegments(tripId: string): Promise<StepGroupingResult> {
  try {
    console.log(`Grouping segments for trip: ${tripId}`);

    const { data, error } = await supabase.functions.invoke('group-travel-segments', {
      body: {
        trip_id: tripId
      }
    });

    if (error) {
      console.error('Error calling group-travel-segments function:', error);
      return {
        success: false,
        error: `Function error: ${error.message}`
      };
    }

    if (!data?.success) {
      console.error('Group-travel-segments function returned error:', data?.error);
      return {
        success: false,
        error: data?.error || 'Unknown error from segment grouping'
      };
    }

    console.log(`Successfully created ${data.steps_created} travel steps`);

    return {
      success: true,
      steps_created: data.steps_created,
      message: data.message
    };

  } catch (error) {
    console.error('Error in groupTravelSegments:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get travel steps for a trip
 */
export async function getTravelSteps(tripId: string) {
  try {
    const { data: steps, error } = await supabase
      .from('travel_steps')
      .select(`
        *,
        travel_step_segments(
          position_in_step,
          role,
          travel_segments(*)
        )
      `)
      .eq('trip_id', tripId)
      .order('step_id');

    if (error) {
      console.error('Error fetching travel steps:', error);
      return { success: false, error: error.message, steps: [] };
    }

    return { success: true, steps: steps || [] };

  } catch (error) {
    console.error('Error in getTravelSteps:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      steps: []
    };
  }
}