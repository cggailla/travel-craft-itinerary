-- Migration: Rendre document_id nullable pour permettre les segments manuels sans document
-- Date: 2025-10-09
-- Raison: Les segments créés manuellement n'ont pas besoin d'être liés à un document PDF uploadé

-- 1. Supprimer la contrainte NOT NULL sur document_id dans travel_segments
ALTER TABLE public.travel_segments 
ALTER COLUMN document_id DROP NOT NULL;

-- 2. Modifier la contrainte de clé étrangère pour permettre ON DELETE SET NULL
-- Cela évite de supprimer le segment si le document est supprimé
ALTER TABLE public.travel_segments 
DROP CONSTRAINT IF EXISTS travel_segments_document_id_fkey;

ALTER TABLE public.travel_segments 
ADD CONSTRAINT travel_segments_document_id_fkey 
FOREIGN KEY (document_id) 
REFERENCES public.documents(id) 
ON DELETE SET NULL;

-- 3. Créer un index pour les segments sans document (pour optimiser les requêtes)
CREATE INDEX IF NOT EXISTS idx_travel_segments_no_document 
ON public.travel_segments(id) 
WHERE document_id IS NULL;

-- 4. Ajouter un commentaire pour documentation
COMMENT ON COLUMN public.travel_segments.document_id IS 
'Référence au document source (PDF). NULL pour les segments créés manuellement sans document.';

-- 5. Mettre à jour les politiques RLS pour gérer les segments sans document
-- Les politiques existantes restent valides car elles vérifient user_id, pas document_id
