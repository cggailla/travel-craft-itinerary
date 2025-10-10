import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
};

Deno.serve(async (req) => {
  console.log("⚙️ Validate segments function called");

  // --- 1️⃣ Handle CORS preflight ---
  if (req.method === "OPTIONS") {
    console.log("🟡 OPTIONS preflight → returning CORS headers");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- 2️⃣ Parse JSON body ---
    const { segment_ids, trip_id } = await req.json();
    console.log("📦 Received payload:", { segment_count: segment_ids?.length, trip_id });

    if (!segment_ids || !Array.isArray(segment_ids)) {
      console.warn("❌ Missing or invalid segment_ids array");
      return new Response(
        JSON.stringify({ success: false, error: "Segment IDs array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- 3️⃣ Load environment variables ---
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("❌ Missing Supabase configuration");
      return new Response(
        JSON.stringify({ success: false, error: "Server misconfiguration: missing Supabase keys" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- 4️⃣ Auth verification ---
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn("❌ Missing or malformed Authorization header");
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");

    // --- 5️⃣ Validate token using base client ---
    const baseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: userData, error: authError } = await baseClient.auth.getUser(token);

    if (authError || !userData?.user) {
      console.error("❌ Invalid or expired token:", authError);
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = userData.user;
    console.log("✅ Authenticated user:", user.id);

    // --- 6️⃣ Create RLS-aware client ---
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // --- 7️⃣ Verify trip ownership (if trip_id provided) ---
    if (trip_id) {
      console.log("🔍 Verifying trip ownership...");
      const { data: trip, error: tripErr } = await supabase
        .from("trips")
        .select("user_id")
        .eq("id", trip_id)
        .single();

      if (tripErr || !trip) {
        console.error("❌ Trip not found or DB error:", tripErr);
        return new Response(
          JSON.stringify({ success: false, error: "Trip not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (trip.user_id !== user.id) {
        console.warn("🚫 Trip ownership mismatch → Forbidden");
        return new Response(
          JSON.stringify({ success: false, error: "Forbidden" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("✅ Trip ownership verified for user:", user.id);
    }

    // --- ✅ Auth complete: continue business logic ---
    console.log(`🧩 Validating ${segment_ids.length} segments...`);

    // Update segments as validated
    const { data: updatedSegments, error } = await supabase
      .from('travel_segments')
      .update({ 
        validated: true,
        updated_at: new Date().toISOString()
      })
      .in('id', segment_ids)
      .select('id, trip_id')

    if (error) {
      console.error('Database error:', error)
      throw new Error(`Failed to validate segments: ${error.message}`)
    }

    console.log(`Successfully validated ${updatedSegments?.length || 0} segments`)

    // Update trip status - use trip_id from segments if not provided
    const tripIdToUpdate = trip_id || updatedSegments?.[0]?.trip_id;
    
    if (tripIdToUpdate) {
      const { error: tripError } = await supabase
        .from('trips')
        .update({ 
          status: 'validated',
          updated_at: new Date().toISOString()
        })
        .eq('id', tripIdToUpdate)

      if (tripError) {
        console.error('Failed to update trip status:', tripError)
        // Don't throw error for trip update failure
      } else {
        console.log(`Trip ${tripIdToUpdate} status updated to validated`)
        
        // Trigger cleanup after trip validation
        try {
          await supabase.rpc('cleanup_abandoned_data')
          console.log('Cleanup triggered after trip validation')
        } catch (cleanupError) {
          console.error('Cleanup failed:', cleanupError)
          // Don't fail the main operation if cleanup fails
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        validated_count: updatedSegments?.length || 0,
        message: 'Segments validated successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Validate segments function error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})