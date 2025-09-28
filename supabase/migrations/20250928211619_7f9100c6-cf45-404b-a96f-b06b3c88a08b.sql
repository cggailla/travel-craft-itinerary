-- Add enrichment tracking columns to trips table
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS last_enriched_at timestamp with time zone;

-- Update enrichment_status column to have better default
ALTER TABLE public.trips ALTER COLUMN enrichment_status SET DEFAULT 'pending';