-- Ajouter les colonnes pour la gestion des devis dans la table trips
ALTER TABLE trips 
  ADD COLUMN output_type TEXT DEFAULT 'booklet',
  ADD COLUMN last_quote_pdf_url TEXT,
  ADD COLUMN last_quote_generated_at TIMESTAMP WITH TIME ZONE;

-- Créer un bucket pour les exports de devis
INSERT INTO storage.buckets (id, name, public)
VALUES ('quote-exports', 'quote-exports', true);

-- Politique RLS pour permettre aux utilisateurs d'uploader leurs devis
CREATE POLICY "Users can upload their own quote exports"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'quote-exports' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Politique RLS pour permettre la lecture publique des devis
CREATE POLICY "Quote exports are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'quote-exports');