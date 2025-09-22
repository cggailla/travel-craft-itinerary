import { supabase } from "@/integrations/supabase/client";

export interface OptimizedContentResult {
  success: boolean;
  dayContents: {
    dayIndex: number;
    date: string;
    html: string;
    success: boolean;
    error?: string;
    groupCount?: number;
    segmentCount?: number;
  }[];
  stats?: {
    totalDays: number;
    successfulDays: number;
    totalGroups: number;
    totalSegments: number;
    optimizationRatio: string;
  };
  error?: string;
}

/**
 * Generate optimized content for all days of a trip using segment grouping
 */
export async function generateOptimizedContent(tripId: string): Promise<OptimizedContentResult> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-optimized-content', {
      body: { tripId }
    });

    if (error) {
      console.error('Error generating optimized content:', error);
      throw error;
    }

    return data as OptimizedContentResult;
  } catch (error) {
    console.error('Failed to generate optimized content:', error);
    return {
      success: false,
      dayContents: [],
      error: error instanceof Error ? error.message : 'Failed to generate content'
    };
  }
}

/**
 * Generate content for a single day with optimization
 */
export async function generateOptimizedDayContent(tripId: string, dayIndex: number): Promise<{
  dayIndex: number;
  html: string;
  success: boolean;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-day-content', {
      body: { tripId, dayIndex }
    });

    if (error) {
      console.error('Error generating day content:', error);
      throw error;
    }

    return {
      dayIndex,
      html: data.html || '',
      success: data.success || false,
      error: data.error
    };
  } catch (error) {
    console.error('Failed to generate day content:', error);
    return {
      dayIndex,
      html: '',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate content'
    };
  }
}