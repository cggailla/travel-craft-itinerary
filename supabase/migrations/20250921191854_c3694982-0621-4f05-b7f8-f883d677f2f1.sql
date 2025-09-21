-- Fix RLS policies to support both authenticated users and anonymous session-based users
-- This allows users with session IDs to access their data even without being authenticated

-- First, create a function to extract session ID from headers for anonymous users
CREATE OR REPLACE FUNCTION public.get_user_session_id()
RETURNS uuid AS $$
DECLARE
  session_id text;
BEGIN
  -- Try to get session ID from custom header (for anonymous users)
  session_id := current_setting('request.headers', true)::json->>'x-session-id';
  
  -- If session ID exists in header, return it as UUID
  IF session_id IS NOT NULL AND session_id != '' THEN
    RETURN session_id::uuid;
  END IF;
  
  -- Fallback to auth.uid() for authenticated users
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update trips table RLS policies
DROP POLICY IF EXISTS "Users can only access their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can view their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can insert their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can update their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can delete their own trips" ON public.trips;

CREATE POLICY "Users can access their own trips" 
ON public.trips FOR ALL 
USING (user_id = public.get_user_session_id());

-- Update documents table RLS policies
DROP POLICY IF EXISTS "Users can only access their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;

CREATE POLICY "Users can access their own documents" 
ON public.documents FOR ALL 
USING (user_id = public.get_user_session_id());

-- Update travel_segments table RLS policies
DROP POLICY IF EXISTS "Users can only access their own travel segments" ON public.travel_segments;
DROP POLICY IF EXISTS "Users can view their own travel segments" ON public.travel_segments;
DROP POLICY IF EXISTS "Users can insert their own travel segments" ON public.travel_segments;
DROP POLICY IF EXISTS "Users can update their own travel segments" ON public.travel_segments;
DROP POLICY IF EXISTS "Users can delete their own travel segments" ON public.travel_segments;

CREATE POLICY "Users can access their own travel segments" 
ON public.travel_segments FOR ALL 
USING (user_id = public.get_user_session_id());

-- Update document_processing_jobs table RLS policies
DROP POLICY IF EXISTS "Users can only access processing jobs for their documents" ON public.document_processing_jobs;
DROP POLICY IF EXISTS "Users can view processing jobs for their documents" ON public.document_processing_jobs;
DROP POLICY IF EXISTS "Users can insert processing jobs for their documents" ON public.document_processing_jobs;
DROP POLICY IF EXISTS "Users can update processing jobs for their documents" ON public.document_processing_jobs;
DROP POLICY IF EXISTS "Users can delete processing jobs for their documents" ON public.document_processing_jobs;

CREATE POLICY "Users can access processing jobs for their documents" 
ON public.document_processing_jobs FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.documents 
  WHERE documents.id = document_processing_jobs.document_id 
    AND documents.user_id = public.get_user_session_id()
));