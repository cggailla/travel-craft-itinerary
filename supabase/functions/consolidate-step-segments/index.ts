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
    const { tripId } = await req.json();

    if (!tripId) {
      throw new Error('Trip ID is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Starting segment consolidation for trip: ${tripId}`);

    // Get all travel steps for this trip
    const { data: steps, error: stepsError } = await supabase
      .from('travel_steps')
      .select('id, step_title')
      .eq('trip_id', tripId)
      .order('step_id');

    if (stepsError) {
      throw new Error(`Failed to fetch steps: ${stepsError.message}`);
    }

    let totalConsolidated = 0;

    // Process each step
    for (const step of steps || []) {
      console.log(`Processing step: ${step.step_title} (${step.id})`);

      // Get all segments for this step with their positions
      const { data: stepSegments, error: segmentsError } = await supabase
        .from('travel_step_segments')
        .select(`
          id,
          segment_id,
          position_in_step,
          travel_segments (
            id,
            segment_type,
            title,
            provider,
            address,
            start_date,
            end_date,
            description,
            reference_number
          )
        `)
        .eq('step_id', step.id)
        .order('position_in_step');

      if (segmentsError) {
        console.error(`Error fetching segments for step ${step.id}:`, segmentsError);
        continue;
      }

      if (!stepSegments || stepSegments.length <= 1) {
        console.log(`Step ${step.step_title} has ${stepSegments?.length || 0} segments, skipping consolidation`);
        continue;
      }

      // Group consecutive duplicate segments
      const segmentsToKeep: any[] = [];
      const segmentsToDelete: string[] = [];
      let currentGroup: any[] = [];

      for (let i = 0; i < stepSegments.length; i++) {
        const current = stepSegments[i];
        const segment = current.travel_segments;

        if (!segment) continue;

        if (currentGroup.length === 0) {
          currentGroup = [current];
        } else {
          const lastInGroup = currentGroup[currentGroup.length - 1];
          const lastSegment = lastInGroup.travel_segments;

          // Check if segments are duplicates and should be merged
          if (areSegmentsDuplicate(lastSegment, segment)) {
            currentGroup.push(current);
          } else {
            // Process the current group
            if (currentGroup.length > 1) {
              const consolidated = await consolidateSegmentGroup(supabase, currentGroup);
              if (consolidated.segmentsToDelete.length > 0) {
                segmentsToDelete.push(...consolidated.segmentsToDelete);
                totalConsolidated += consolidated.segmentsToDelete.length;
              }
            }
            segmentsToKeep.push(currentGroup[0]);
            currentGroup = [current];
          }
        }
      }

      // Process the last group
      if (currentGroup.length > 1) {
        const consolidated = await consolidateSegmentGroup(supabase, currentGroup);
        if (consolidated.segmentsToDelete.length > 0) {
          segmentsToDelete.push(...consolidated.segmentsToDelete);
          totalConsolidated += consolidated.segmentsToDelete.length;
        }
      }
      if (currentGroup.length > 0) {
        segmentsToKeep.push(currentGroup[0]);
      }

      // Delete duplicate segments from travel_step_segments
      if (segmentsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('travel_step_segments')
          .delete()
          .in('id', segmentsToDelete);

        if (deleteError) {
          console.error(`Error deleting duplicate step segments:`, deleteError);
        } else {
          console.log(`Deleted ${segmentsToDelete.length} duplicate step segments for step ${step.step_title}`);
        }

        // Reorder remaining segments
        await reorderStepSegments(supabase, step.id);
      }
    }

    console.log(`Segment consolidation completed. Total segments consolidated: ${totalConsolidated}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalConsolidated,
        message: `Successfully consolidated ${totalConsolidated} duplicate segments`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in consolidate-step-segments function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        totalConsolidated: 0
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function areSegmentsDuplicate(seg1: any, seg2: any): boolean {
  if (!seg1 || !seg2) return false;
  
  const sameBasicInfo = seg1.segment_type === seg2.segment_type &&
                       seg1.title === seg2.title &&
                       seg1.provider === seg2.provider &&
                       seg1.address === seg2.address;
  
  const shouldMerge = shouldMergeByType(seg1.segment_type);
  
  // Check if dates are consecutive or close (within 2 days)
  const datesConsecutive = areDatesConsecutive(seg1.end_date, seg2.start_date);
  
  return sameBasicInfo && shouldMerge && datesConsecutive;
}

function shouldMergeByType(segmentType: string): boolean {
  const mergeable = ['hotel', 'activity', 'pass', 'service'];
  const nonMergeable = ['flight', 'transfer', 'train', 'car'];
  
  return mergeable.includes(segmentType?.toLowerCase());
}

function areDatesConsecutive(endDate: string, startDate: string): boolean {
  if (!endDate || !startDate) return true; // If no dates, consider mergeable
  
  const end = new Date(endDate);
  const start = new Date(startDate);
  
  // Allow up to 2 days gap
  const diffInDays = (start.getTime() - end.getTime()) / (1000 * 60 * 60 * 24);
  return diffInDays >= 0 && diffInDays <= 2;
}

async function consolidateSegmentGroup(supabase: any, group: any[]): Promise<{ segmentsToDelete: string[] }> {
  if (group.length <= 1) return { segmentsToDelete: [] };

  const masterSegment = group[0].travel_segments;
  const segmentsToDelete: string[] = [];

  // Calculate the consolidated date range
  let earliestStart = masterSegment.start_date;
  let latestEnd = masterSegment.end_date;

  for (let i = 1; i < group.length; i++) {
    const segment = group[i].travel_segments;
    
    if (segment.start_date && (!earliestStart || segment.start_date < earliestStart)) {
      earliestStart = segment.start_date;
    }
    
    if (segment.end_date && (!latestEnd || segment.end_date > latestEnd)) {
      latestEnd = segment.end_date;
    }

    // Mark this step segment for deletion
    segmentsToDelete.push(group[i].id);
  }

  // Update the master segment with consolidated dates
  const { error: updateError } = await supabase
    .from('travel_segments')
    .update({
      start_date: earliestStart,
      end_date: latestEnd,
      updated_at: new Date().toISOString()
    })
    .eq('id', masterSegment.id);

  if (updateError) {
    console.error('Error updating master segment:', updateError);
    return { segmentsToDelete: [] };
  }

  console.log(`Consolidated ${group.length} segments into one (${masterSegment.title})`);
  return { segmentsToDelete };
}

async function reorderStepSegments(supabase: any, stepId: string): Promise<void> {
  // Get remaining segments ordered by current position
  const { data: remainingSegments, error } = await supabase
    .from('travel_step_segments')
    .select('id')
    .eq('step_id', stepId)
    .order('position_in_step');

  if (error || !remainingSegments) {
    console.error('Error fetching remaining segments for reordering:', error);
    return;
  }

  // Update positions to be sequential (1, 2, 3, ...)
  for (let i = 0; i < remainingSegments.length; i++) {
    const { error: updateError } = await supabase
      .from('travel_step_segments')
      .update({ position_in_step: i + 1 })
      .eq('id', remainingSegments[i].id);

    if (updateError) {
      console.error('Error updating segment position:', updateError);
    }
  }

  console.log(`Reordered ${remainingSegments.length} segments for step ${stepId}`);
}