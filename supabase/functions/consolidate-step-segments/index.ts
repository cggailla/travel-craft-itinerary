import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
};

serve(async (req) => {
  console.log("⚙️ Segment consolidation function called");

  // --- 1️⃣ Handle CORS preflight ---
  if (req.method === "OPTIONS") {
    console.log("🟡 OPTIONS preflight → returning CORS headers");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- 2️⃣ Parse request body ---
    const { tripId } = await req.json();
    console.log("🔧 Consolidating segments for trip:", tripId);

    if (!tripId) {
      console.warn("❌ Missing tripId in request");
      return new Response(
        JSON.stringify({ success: false, error: "Trip ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- 3️⃣ Auth + secure Supabase client setup ---
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("❌ Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ success: false, error: "Server misconfiguration: missing Supabase keys" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- 4️⃣ Verify Authorization header ---
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn("❌ Missing or malformed Authorization header");
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");

    // --- 5️⃣ Validate token with base client ---
    const baseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: userData, error: authError } = await baseClient.auth.getUser(token);

    if (authError || !userData?.user) {
      console.error("❌ Invalid or expired token:", authError);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = userData.user;
    console.log("✅ Authenticated user:", user.id);

    // --- 6️⃣ Create RLS-aware client ---
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // --- 7️⃣ Verify trip ownership ---
    console.log("🔍 Verifying trip ownership...");
    const { data: tripOwner, error: tripErr } = await supabase
      .from("trips")
      .select("user_id")
      .eq("id", tripId)
      .single();

    if (tripErr || !tripOwner) {
      console.error("❌ Trip not found or DB error:", tripErr);
      return new Response(
        JSON.stringify({ success: false, error: "Trip not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (tripOwner.user_id !== user.id) {
      console.warn("🚫 Trip ownership mismatch → Forbidden");
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Trip ownership verified for user:", user.id);

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

      // Group duplicate segments globally by key (type|title|provider|address)
      const segmentsToDeleteSet = new Set<string>();

      const groups = new Map<string, any[]>();
      for (const item of stepSegments) {
        const seg = item.travel_segments;
        if (!seg) continue;
        const key = buildGroupKey(seg);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(item);
      }

      for (const [key, groupItems] of groups.entries()) {
        const sampleSeg = groupItems[0].travel_segments;
        if (!shouldMergeByType(sampleSeg?.segment_type)) continue;
        if (groupItems.length <= 1) continue;

        // Sort by date (fallback to position)
        const sorted = [...groupItems].sort((a, b) => {
          const aDate = a.travel_segments?.start_date ? new Date(a.travel_segments.start_date).getTime() : Number.MAX_SAFE_INTEGER;
          const bDate = b.travel_segments?.start_date ? new Date(b.travel_segments.start_date).getTime() : Number.MAX_SAFE_INTEGER;
          if (aDate !== bDate) return aDate - bDate;
          return (a.position_in_step ?? 0) - (b.position_in_step ?? 0);
        });

        // Partition into consecutive-date subgroups and consolidate each subgroup separately
        let currentSubgroup: any[] = [];
        for (let i = 0; i < sorted.length; i++) {
          const current = sorted[i];
          const currSeg = current.travel_segments;
          if (!currSeg) continue;

          if (currentSubgroup.length === 0) {
            currentSubgroup = [current];
            continue;
          }

          const prev = currentSubgroup[currentSubgroup.length - 1];
          const prevSeg = prev.travel_segments;
          if (areDatesConsecutive(prevSeg?.end_date, currSeg?.start_date)) {
            currentSubgroup.push(current);
          } else {
            if (currentSubgroup.length > 1) {
              const consolidated = await consolidateSegmentGroup(supabase, currentSubgroup);
              consolidated.segmentsToDelete.forEach(id => segmentsToDeleteSet.add(id));
              totalConsolidated += consolidated.segmentsToDelete.length;
            }
            currentSubgroup = [current];
          }
        }
        // Flush last subgroup
        if (currentSubgroup.length > 1) {
          const consolidated = await consolidateSegmentGroup(supabase, currentSubgroup);
          consolidated.segmentsToDelete.forEach(id => segmentsToDeleteSet.add(id));
          totalConsolidated += consolidated.segmentsToDelete.length;
        }
      }

      const segmentsToDelete = Array.from(segmentsToDeleteSet);

      // Delete duplicate segments from travel_step_segments and reorder
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

function normalizeText(val: any): string {
  return (val ?? '').toString().trim().toLowerCase();
}

function buildGroupKey(seg: any): string {
  return [
    normalizeText(seg?.segment_type),
    normalizeText(seg?.title),
    normalizeText(seg?.provider),
    normalizeText(seg?.address)
  ].join('|');
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

  // Phase 1: move to a safe temporary range to avoid unique conflicts
  for (let i = 0; i < remainingSegments.length; i++) {
    const { error: tmpError } = await supabase
      .from('travel_step_segments')
      .update({ position_in_step: 1000 + i + 1 })
      .eq('id', remainingSegments[i].id);
    if (tmpError) {
      console.error('Error setting temporary position:', tmpError);
      // Continue to try updating others
    }
  }

  // Phase 2: normalize to 1..N
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