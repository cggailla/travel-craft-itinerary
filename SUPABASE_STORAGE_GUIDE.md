# 🚀 Guide de Configuration Supabase Storage

## 📋 Vue d'ensemble

Ce guide t'accompagne pour configurer Supabase Storage avec une gestion de session automatique. Les images sont organisées par session (unique par onglet/fenêtre) et se nettoient automatiquement.

---

## 🗄️ ÉTAPE 1 : Configuration du Bucket

### 1.1 - Accéder à Supabase Dashboard

1. Va sur [https://app.supabase.com](https://app.supabase.com)
2. Sélectionne ton projet
3. Dans le menu de gauche, clique sur **"Storage"**

### 1.2 - Supprimer l'ancien bucket (si nécessaire)

Si tu as déjà un bucket avec des problèmes de permissions :

1. Clique sur le bucket existant
2. En haut à droite, clique sur **"..."** → **"Delete bucket"**
3. Confirme la suppression

### 1.3 - Créer le nouveau bucket

1. Clique sur **"New bucket"**
2. Configure comme suit :
   - **Name:** `trip-images`
   - **Public bucket:** ✅ **COCHÉ** (important pour les URLs publiques)
   - **File size limit:** 10 MB (optionnel)
   - **Allowed MIME types:** `image/*` (optionnel)
3. Clique sur **"Create bucket"**

---

## 🔐 ÉTAPE 2 : Configuration des Policies RLS

Les policies RLS (Row Level Security) permettent de contrôler qui peut faire quoi sur le storage.

### 2.1 - Accéder aux Policies

1. Dans **Storage**, clique sur le bucket **"trip-images"**
2. Clique sur l'onglet **"Policies"** en haut

### 2.2 - Créer les 3 policies

#### **Policy 1 : Permettre l'upload (INSERT)**

1. Clique sur **"New policy"**
2. Sélectionne **"For full customization"**
3. Configure :
   - **Policy name:** `Allow public upload`
   - **Allowed operation:** `INSERT`
   - **Target roles:** `public`
4. Dans **"WITH CHECK expression"**, colle :
   ```sql
   bucket_id = 'trip-images'
   ```
5. Clique sur **"Review"** puis **"Save policy"**

#### **Policy 2 : Permettre la lecture (SELECT)**

1. Clique sur **"New policy"**
2. Sélectionne **"For full customization"**
3. Configure :
   - **Policy name:** `Allow public read`
   - **Allowed operation:** `SELECT`
   - **Target roles:** `public`
4. Dans **"USING expression"**, colle :
   ```sql
   bucket_id = 'trip-images'
   ```
5. Clique sur **"Review"** puis **"Save policy"**

#### **Policy 3 : Permettre la suppression (DELETE)**

1. Clique sur **"New policy"**
2. Sélectionne **"For full customization"**
3. Configure :
   - **Policy name:** `Allow public delete`
   - **Allowed operation:** `DELETE`
   - **Target roles:** `public`
4. Dans **"USING expression"**, colle :
   ```sql
   bucket_id = 'trip-images'
   ```
5. Clique sur **"Review"** puis **"Save policy"**

### 2.3 - Vérifier les policies

Tu devrais maintenant avoir 3 policies actives :

- ✅ **Allow public upload** (INSERT)
- ✅ **Allow public read** (SELECT)
- ✅ **Allow public delete** (DELETE)

---

## 🧪 ÉTAPE 3 : Tester l'Upload

### 3.1 - Lancer l'application

```bash
npm run dev
```

### 3.2 - Accéder à un voyage

1. Va sur ton application
2. Ouvre un carnet de voyage
3. Tu devrais voir une **zone violette** en haut avec le titre "🧪 Zone de test - Supabase Storage"

### 3.3 - Tester l'upload

1. **Glisse une image** dans la zone de test OU clique pour sélectionner
2. Vérifie que :
   - ✅ Un loader apparaît pendant l'upload
   - ✅ Un message de succès s'affiche
   - ✅ L'image apparaît dans la zone
   - ✅ Un badge vert "Uploadé sur Supabase" est visible
   - ✅ Les infos techniques (URL, Storage Path) sont affichées en bas

### 3.4 - Vérifier dans Supabase

1. Retourne dans **Supabase Dashboard** → **Storage** → **trip-images**
2. Tu devrais voir un dossier `session_XXXXX`
3. À l'intérieur, un dossier avec le `tripId`
4. À l'intérieur, l'image `test_1.jpg` (ou `.png`, etc.)

### 3.5 - Tester la suppression

1. **Clique sur l'image** dans la zone de test
2. Vérifie que :
   - ✅ Un message de confirmation apparaît
   - ✅ L'image disparaît de la zone
   - ✅ L'image est supprimée de Supabase (vérifie dans le dashboard)

---

## 🔧 ÉTAPE 4 : Comprendre le système de session

### Comment ça fonctionne ?

1. **Création de session** : Au premier chargement, un ID unique est généré
   ```
   session_1728123456789_abc123def
   ```

2. **Stockage** : Cet ID est stocké dans `sessionStorage` (unique par onglet)

3. **Organisation des fichiers** :
   ```
   trip-images/
   └── session_1728123456789_abc123def/
       └── trip_xyz/
           ├── test_1.jpg
           ├── cover_1.jpg
           ├── cover_2.jpg
           └── step_1234_1.jpg
   ```

4. **Nettoyage** : À la fermeture de l'onglet, la session est perdue
   - Les images restent sur Supabase
   - À la prochaine session, un nouveau dossier est créé
   - Les anciennes images peuvent être nettoyées manuellement ou via un cron job

### Avantages

✅ **Isolation** : Chaque utilisateur/onglet a ses propres images
✅ **Pas de conflit** : Deux personnes peuvent travailler en parallèle
✅ **Simplicité** : Pas besoin d'authentification complexe
✅ **Performance** : Stockage cloud, pas de limite localStorage

---

## ⚠️ Dépannage

### Erreur : "new row violates row-level security policy"

**Problème** : Les policies RLS ne sont pas correctement configurées

**Solution** :
1. Vérifie que le bucket est **public**
2. Vérifie que les 3 policies existent et sont **actives**
3. Vérifie que `bucket_id = 'trip-images'` dans chaque policy

### Erreur : "The resource you are looking for could not be found"

**Problème** : Le bucket n'existe pas ou n'est pas nommé correctement

**Solution** :
1. Vérifie que le bucket s'appelle exactement `trip-images`
2. Vérifie que tu as bien sélectionné le bon projet Supabase

### Erreur : "Failed to fetch"

**Problème** : La connexion Supabase n'est pas configurée

**Solution** :
1. Vérifie que `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont dans `.env`
2. Redémarre le serveur de dev après modification du `.env`

### Les images ne s'affichent pas

**Problème** : Le bucket n'est pas public

**Solution** :
1. Va dans **Storage** → **trip-images** → **Configuration**
2. Vérifie que **"Public bucket"** est ✅ coché
3. Si ce n'est pas le cas, tu devras recréer le bucket (on ne peut pas changer après création)

---

## 📊 Monitoring

### Voir les fichiers uploadés

1. **Supabase Dashboard** → **Storage** → **trip-images**
2. Explore les dossiers `session_XXXXX`
3. Tu peux :
   - Télécharger les images
   - Les supprimer manuellement
   - Voir leur taille et date d'upload

### Voir les logs

1. **Supabase Dashboard** → **Logs** → **Storage**
2. Tu verras tous les uploads, téléchargements et suppressions

---

## ✅ Validation du test

Avant de migrer toutes les zones d'upload, assure-toi que :

- [ ] L'upload fonctionne (image apparaît)
- [ ] L'URL publique est accessible (l'image s'affiche)
- [ ] La suppression fonctionne (image disparaît de Supabase)
- [ ] Les infos techniques sont correctes (Storage Path, URL)
- [ ] Pas d'erreur dans la console du navigateur
- [ ] Pas d'erreur dans les logs Supabase

---

## 🚀 Prochaines étapes

Une fois le test validé, on pourra :

1. Migrer `ImageUploader` pour utiliser Supabase au lieu de localStorage
2. Migrer `StepImageGallery` pour utiliser Supabase
3. Supprimer l'ancien `imageUploadService.ts` (localStorage)
4. Ajouter un bouton "Nettoyer la session" dans l'interface
5. Configurer un nettoyage automatique des anciennes sessions (Edge Function)

---

## 📞 Besoin d'aide ?

Si tu rencontres un problème :

1. Vérifie la **console du navigateur** (F12)
2. Vérifie les **logs Supabase** (Dashboard → Logs)
3. Vérifie que les 3 policies sont **actives**
4. Essaye de recréer le bucket avec **"Public bucket"** ✅

---

**Bonne chance ! 🎉**
