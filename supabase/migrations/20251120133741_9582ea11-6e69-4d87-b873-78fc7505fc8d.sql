-- Fix cascade deletion for documents when trips are deleted
-- This ensures that when a trip is deleted, all associated documents are automatically deleted

-- Drop the existing foreign key constraint
ALTER TABLE public.documents 
DROP CONSTRAINT IF EXISTS documents_trip_id_fkey;

-- Recreate the constraint with ON DELETE CASCADE
ALTER TABLE public.documents 
ADD CONSTRAINT documents_trip_id_fkey 
FOREIGN KEY (trip_id) 
REFERENCES public.trips(id) 
ON DELETE CASCADE;