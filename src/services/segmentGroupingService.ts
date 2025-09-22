import { supabase } from "@/integrations/supabase/client";
import { TravelSegment } from "@/types/travel";

export interface SegmentGroup {
  group_id: string;
  parent_segment: any; // JSONB data from database
  child_segments: any; // JSONB data from database
  start_date: string;
  end_date: string;
  total_days: number;
}

/**
 * Groups similar consecutive segments for a trip
 */
export async function groupSimilarSegments(tripId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('group_similar_segments', {
      p_trip_id: tripId
    });

    if (error) {
      console.error('Error grouping segments:', error);
      throw error;
    }

    console.log('Successfully grouped segments for trip:', tripId);
  } catch (error) {
    console.error('Failed to group segments:', error);
    throw error;
  }
}

/**
 * Gets grouped segments for efficient processing
 */
export async function getGroupedSegments(tripId: string): Promise<SegmentGroup[]> {
  try {
    const { data, error } = await supabase.rpc('get_grouped_segments', {
      p_trip_id: tripId
    });

    if (error) {
      console.error('Error fetching grouped segments:', error);
      throw error;
    }

    // Type assertion to handle Supabase RPC return type
    return (data as any[]) || [];
  } catch (error) {
    console.error('Failed to fetch grouped segments:', error);
    throw error;
  }
}

/**
 * Automatically groups segments when creating a new trip or validating segments
 */
export async function autoGroupSegmentsOnValidation(tripId: string): Promise<void> {
  try {
    // First group similar segments
    await groupSimilarSegments(tripId);
    
    console.log('Auto-grouping completed for trip:', tripId);
  } catch (error) {
    console.error('Auto-grouping failed:', error);
    // Don't throw error to avoid breaking the validation flow
  }
}

/**
 * Checks if a segment is part of a multi-day group
 */
export function isMultiDaySegment(segment: TravelSegment): boolean {
  return segment.is_multi_day === true;
}

/**
 * Checks if a segment is a parent segment (main segment of a group)
 */
export function isParentSegment(segment: TravelSegment): boolean {
  return segment.is_multi_day === true && !segment.parent_segment_id;
}

/**
 * Checks if a segment is a child segment (instance of a parent)
 */
export function isChildSegment(segment: TravelSegment): boolean {
  return !!segment.parent_segment_id;
}

/**
 * Gets the timeline organized by groups for more efficient processing
 */
export async function getOptimizedTimeline(tripId: string) {
  try {
    const groupedSegments = await getGroupedSegments(tripId);
    
    // Organize by date for timeline display
    const timelineByDate: { [date: string]: SegmentGroup[] } = {};
    
    groupedSegments.forEach(group => {
      const startDate = new Date(group.start_date).toISOString().split('T')[0];
      if (!timelineByDate[startDate]) {
        timelineByDate[startDate] = [];
      }
      timelineByDate[startDate].push(group);
    });

    // Convert to sorted array
    const timeline = Object.entries(timelineByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, groups]) => ({
        date: new Date(date),
        groups: groups.sort((a, b) => 
          new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
        )
      }));

    return timeline;
  } catch (error) {
    console.error('Failed to get optimized timeline:', error);
    throw error;
  }
}