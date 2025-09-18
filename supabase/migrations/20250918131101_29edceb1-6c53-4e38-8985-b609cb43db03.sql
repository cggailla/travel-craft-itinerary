-- Create trips table to group documents
CREATE TABLE public.trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'validated', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on trips table
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for trips
CREATE POLICY "Allow all operations on trips" 
ON public.trips 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add trip_id to documents table
ALTER TABLE public.documents 
ADD COLUMN trip_id UUID REFERENCES public.trips(id);

-- Create trigger for trips updated_at
CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_documents_trip_id ON public.documents(trip_id);
CREATE INDEX idx_trips_user_id ON public.trips(user_id);
CREATE INDEX idx_trips_status ON public.trips(status);