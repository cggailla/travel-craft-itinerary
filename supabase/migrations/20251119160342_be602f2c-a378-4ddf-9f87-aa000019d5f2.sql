-- Add columns to track last generated PDF
ALTER TABLE trips 
ADD COLUMN last_pdf_url TEXT,
ADD COLUMN last_pdf_generated_at TIMESTAMP WITH TIME ZONE;