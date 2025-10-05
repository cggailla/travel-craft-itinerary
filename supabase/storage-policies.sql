-- ============================================
-- Configuration Supabase Storage pour trip-images
-- ============================================

-- ÉTAPE 1 : Créer le bucket (via l'interface Supabase)
-- Nom: trip-images
-- Public: OUI (cocher la case)

-- ============================================
-- ÉTAPE 2 : Policies RLS
-- ============================================

-- Policy 1: Permettre l'upload
CREATE POLICY "Allow public upload"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'trip-images'
);

-- Policy 2: Permettre la lecture
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'trip-images'
);

-- Policy 3: Permettre la suppression
CREATE POLICY "Allow public delete"
ON storage.objects FOR DELETE
TO public
USING (
  bucket_id = 'trip-images'
);

-- ============================================
-- VÉRIFICATION
-- ============================================

-- Vérifier que les policies sont créées
SELECT * FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%public%';

-- Lister les fichiers dans le bucket (depuis l'application)
SELECT * FROM storage.objects 
WHERE bucket_id = 'trip-images'
ORDER BY created_at DESC;

-- ============================================
-- NETTOYAGE (optionnel)
-- ============================================

-- Supprimer toutes les images d'une session spécifique
-- (À exécuter depuis l'application via cleanupSessionImages())

-- Supprimer toutes les images du bucket (ATTENTION!)
-- DELETE FROM storage.objects WHERE bucket_id = 'trip-images';
