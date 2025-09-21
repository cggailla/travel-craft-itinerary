-- Fix security warning for function search_path
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;