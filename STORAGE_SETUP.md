# ~~Instructions pour configurer le Storage des images~~ (OBSOLÈTE)

## ✅ Nouvelle solution : Stockage local (localStorage + base64)

### Pourquoi ce changement ?
Pour éviter les complications avec Supabase Storage et les policies RLS, nous avons implémenté une **solution 100% frontend** qui stocke les images localement.

### Comment ça marche ?

1. **Upload** : Les images sont converties en base64 et stockées dans le localStorage du navigateur
2. **Affichage** : Les images base64 sont affichées directement via les data URLs
3. **PDF** : Les images base64 sont embarquées dans le PDF généré
4. **Persistance** : Les images restent disponibles tant que le localStorage n'est pas vidé

### Avantages

✅ Aucune configuration Supabase requise  
✅ Fonctionne immédiatement  
✅ Pas de problèmes de permissions  
✅ Les images sont embarquées dans le PDF  
✅ Pas de dépendance externe  

### Limites

⚠️ **Limite de taille** : 5MB par image (localStorage a une limite totale de ~5-10MB par domaine)  
⚠️ **Persistance locale** : Les images sont stockées dans le navigateur, pas sur un serveur  
⚠️ **Pas de synchronisation** : Si l'utilisateur change d'appareil, les images ne suivent pas  

### Structure de stockage

```
localStorage keys:
- trip_images_{tripId}_covers : Images de couverture (position 1 et 2)
- trip_images_{tripId}_step_{stepId} : Images d'une étape spécifique
```

### Migration future vers Supabase Storage (optionnel)

Si vous souhaitez plus tard migrer vers Supabase Storage pour :
- Partager les carnets entre appareils
- Gérer des images plus volumineuses
- Avoir une sauvegarde cloud

Vous pouvez utiliser les migrations fournies dans :
- `20251005000001_create_trip_images_storage.sql`
- `20251005000002_fix_trip_images_storage_policies.sql`

Et remplacer les fonctions dans `imageUploadService.ts` pour utiliser `supabase.storage` au lieu de `localStorage`.

---

## ~~Ancienne documentation (Supabase Storage)~~ - Archive

<details>
<summary>Cliquez pour voir l'ancienne documentation</summary>

### Étape 1 : Créer le bucket via l'interface
1. Allez sur https://supabase.com/dashboard/project/[votre-projet]/storage/buckets
2. Cliquez sur "New bucket"
3. Nom : `trip-images`
4. **Cochez "Public bucket"** (important !)
5. File size limit : 10 MB
6. Allowed MIME types : `image/jpeg, image/jpg, image/png, image/webp`
7. Créer

### Étape 2 : Configurer les policies via SQL Editor
1. Allez sur SQL Editor
2. Exécutez ce script :

```sql
-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Anyone can upload trip images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update trip images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete trip images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view trip images" ON storage.objects;

-- Créer les nouvelles policies (permissives pour le développement)
CREATE POLICY "Anyone can upload trip images"
ON storage.objects 
FOR INSERT
WITH CHECK (bucket_id = 'trip-images');

CREATE POLICY "Anyone can update trip images"
ON storage.objects 
FOR UPDATE
USING (bucket_id = 'trip-images')
WITH CHECK (bucket_id = 'trip-images');

CREATE POLICY "Anyone can delete trip images"
ON storage.objects 
FOR DELETE
USING (bucket_id = 'trip-images');

CREATE POLICY "Public can view trip images"
ON storage.objects 
FOR SELECT
USING (bucket_id = 'trip-images');
```

### Étape 3 : Vérifier
Retournez dans l'application et essayez d'uploader une image. Ça devrait fonctionner maintenant !

## Alternative : Via les migrations

Si vous préférez utiliser les migrations Supabase CLI :

```bash
# Appliquer toutes les migrations
supabase db push

# Ou appliquer manuellement la migration spécifique
supabase migration up 20251005000002_fix_trip_images_storage_policies.sql
```

## Pour la production

⚠️ **IMPORTANT** : Les policies actuelles sont permissives (anyone can upload/delete). 

Pour la production, remplacez par des policies authentifiées :

```sql
-- Production policies (plus sécurisées)
DROP POLICY IF EXISTS "Anyone can upload trip images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete trip images" ON storage.objects;

CREATE POLICY "Authenticated users can upload trip images"
ON storage.objects 
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'trip-images');

CREATE POLICY "Authenticated users can delete trip images"
ON storage.objects 
FOR DELETE
TO authenticated
USING (bucket_id = 'trip-images');
```

## Vérification

Pour vérifier que tout est bien configuré :

```sql
-- Vérifier que le bucket existe
SELECT * FROM storage.buckets WHERE id = 'trip-images';

-- Vérifier les policies
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%trip-images%';
```
