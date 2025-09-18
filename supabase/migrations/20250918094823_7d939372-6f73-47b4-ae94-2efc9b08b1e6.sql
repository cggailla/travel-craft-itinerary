-- Create document processing system schema

-- Documents table to track uploaded files
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Document processing jobs table
CREATE TABLE IF NOT EXISTS public.document_processing_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  processing_type TEXT NOT NULL DEFAULT 'ocr_and_ai' CHECK (processing_type IN ('ocr_only', 'ai_only', 'ocr_and_ai')),
  ocr_text TEXT,
  ocr_confidence REAL,
  ai_extracted_data JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Travel segments table for structured data
CREATE TABLE IF NOT EXISTS public.travel_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID,
  segment_type TEXT NOT NULL CHECK (segment_type IN ('flight', 'hotel', 'activity', 'car', 'other')),
  title TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  provider TEXT,
  reference_number TEXT,
  address TEXT,
  description TEXT,
  confidence REAL NOT NULL DEFAULT 0.0,
  raw_data JSONB,
  validated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_segments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public access (no auth required for now)
CREATE POLICY "Allow all operations on documents" 
ON public.documents 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all operations on processing jobs" 
ON public.document_processing_jobs 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all operations on travel segments" 
ON public.travel_segments 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('travel-documents', 'travel-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for document uploads
CREATE POLICY "Allow document uploads" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'travel-documents');

CREATE POLICY "Allow document access" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'travel-documents');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_processing_jobs_updated_at
  BEFORE UPDATE ON public.document_processing_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_travel_segments_updated_at
  BEFORE UPDATE ON public.travel_segments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_document_id ON public.document_processing_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON public.document_processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_travel_segments_document_id ON public.travel_segments(document_id);
CREATE INDEX IF NOT EXISTS idx_travel_segments_user_id ON public.travel_segments(user_id);
CREATE INDEX IF NOT EXISTS idx_travel_segments_start_date ON public.travel_segments(start_date);