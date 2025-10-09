-- Fix RLS policies to allow anonymous segment creation with user_id = NULL
-- Date: 2025-10-09
-- Problem: Previous policy blocked inserts when auth.uid() IS NULL AND user_id IS NULL

-- Drop the incorrect policy
DROP POLICY IF EXISTS "Users can access their own travel segments or anonymous segments" ON public.travel_segments;

-- Create correct policies with proper NULL handling
CREATE POLICY "Users can view their own travel segments or anonymous segments"
ON public.travel_segments
FOR SELECT
USING (
  user_id IS NULL OR           -- ✅ Allow anonymous segments (user_id = NULL)
  user_id = auth.uid()         -- ✅ Allow authenticated users to see their own
);

CREATE POLICY "Users can insert their own travel segments or anonymous segments"
ON public.travel_segments
FOR INSERT
WITH CHECK (
  user_id IS NULL OR           -- ✅ Allow creation of anonymous segments
  user_id = auth.uid()         -- ✅ Allow authenticated users to insert their own
);

CREATE POLICY "Users can update their own travel segments or anonymous segments"
ON public.travel_segments
FOR UPDATE
USING (
  user_id IS NULL OR           -- ✅ Allow updates to anonymous segments
  user_id = auth.uid()         -- ✅ Allow authenticated users to update their own
);

CREATE POLICY "Users can delete their own travel segments or anonymous segments"
ON public.travel_segments
FOR DELETE
USING (
  user_id IS NULL OR           -- ✅ Allow deletion of anonymous segments
  user_id = auth.uid()         -- ✅ Allow authenticated users to delete their own
);

-- Add comment for future reference
COMMENT ON TABLE public.travel_segments IS 
'Table with RLS policies supporting both authenticated users and anonymous segments (user_id = NULL). Anonymous segments are accessible to all users.';
