/**
 * Service pour gérer les images avec Supabase Storage
 * Version sécurisée avec authentification utilisateur
 */

import { supabase } from '@/integrations/supabase/client';
import { requireAuth } from '@/utils/authHelpers';

export interface SupabaseImage {
  storage_path: string;      // Chemin dans le bucket (ex: "userId/trip_xyz/cover_1.jpg")
  public_url: string;         // URL publique de l'image
  file_name: string;          // Nom du fichier original
  uploaded_at: string;        // Timestamp d'upload
}

/**
 * Construit le chemin de stockage dans le bucket
 * Format: {userId}/{tripId}/{imageType}_{position/stepId}.{extension}
 */
function buildStoragePath(
  userId: string,
  tripId: string,
  imageType: 'cover' | 'step' | 'test',
  fileName: string,
  position?: number,
  stepId?: string
): string {
  const extension = fileName.split('.').pop();
  
  let baseName: string;
  if (imageType === 'step' && stepId) {
    // Pour les images d'étapes, inclure le stepId
    baseName = `step_${stepId}_${position || Date.now()}.${extension}`;
  } else if (position !== undefined) {
    baseName = `${imageType}_${position}.${extension}`;
  } else {
    baseName = `${imageType}_${Date.now()}.${extension}`;
  }
  
  return `${userId}/${tripId}/${baseName}`;
}

/**
 * Upload une image vers Supabase Storage
 */
export async function uploadImageToSupabase(params: {
  file: File;
  tripId: string;
  imageType: 'cover' | 'step' | 'test';
  position?: number;
  stepId?: string;
}): Promise<{ success: boolean; data?: SupabaseImage; error?: string }> {
  try {
    const { file, tripId, imageType, position, stepId } = params;
    
    // Vérifier l'authentification
    const userId = await requireAuth();
    
    // Valider le fichier
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Le fichier doit être une image' };
    }

    // Limiter la taille (10 MB max)
    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSize) {
      return { success: false, error: 'L\'image ne doit pas dépasser 10 MB' };
    }

    const storagePath = buildStoragePath(userId, tripId, imageType, file.name, position, stepId);

    console.log('📤 Upload vers Supabase:', storagePath);

    // Upload vers Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('trip-images')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: true, // Remplacer si existe déjà
      });

    if (uploadError) {
      console.error('❌ Erreur upload Supabase:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // Obtenir l'URL publique
    const { data: urlData } = supabase.storage
      .from('trip-images')
      .getPublicUrl(storagePath);

    if (!urlData?.publicUrl) {
      return { success: false, error: 'Impossible d\'obtenir l\'URL publique' };
    }

    const image: SupabaseImage = {
      storage_path: storagePath,
      public_url: urlData.publicUrl,
      file_name: file.name,
      uploaded_at: new Date().toISOString(),
    };

    console.log('✅ Upload réussi:', image);
    return { success: true, data: image };

  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    };
  }
}

/**
 * Supprime une image de Supabase Storage
 */
export async function deleteImageFromSupabase(
  storagePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🗑️ Suppression:', storagePath);

    const { error } = await supabase.storage
      .from('trip-images')
      .remove([storagePath]);

    if (error) {
      console.error('❌ Erreur suppression:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Suppression réussie');
    return { success: true };

  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    };
  }
}

/**
 * Nettoie toutes les images d'un voyage pour l'utilisateur connecté
 * À appeler quand on ferme le booklet ou supprime un voyage
 */
export async function cleanupTripImages(tripId: string): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    const userId = await requireAuth();
    const prefix = `${userId}/${tripId}`;

    console.log('🧹 Nettoyage des images du voyage:', prefix);

    // Lister tous les fichiers du voyage
    const { data: files, error: listError } = await supabase.storage
      .from('trip-images')
      .list(prefix, {
        limit: 1000,
        offset: 0,
      });

    if (listError) {
      console.error('❌ Erreur listage:', listError);
      return { success: false, deletedCount: 0, error: listError.message };
    }

    if (!files || files.length === 0) {
      console.log('✅ Aucune image à nettoyer');
      return { success: true, deletedCount: 0 };
    }

    // Supprimer tous les fichiers
    const pathsToDelete = files.map(file => `${prefix}/${file.name}`);
    
    const { error: deleteError } = await supabase.storage
      .from('trip-images')
      .remove(pathsToDelete);

    if (deleteError) {
      console.error('❌ Erreur suppression batch:', deleteError);
      return { success: false, deletedCount: 0, error: deleteError.message };
    }

    console.log(`✅ ${pathsToDelete.length} fichiers supprimés`);

    return { success: true, deletedCount: pathsToDelete.length };

  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
    return { 
      success: false, 
      deletedCount: 0,
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    };
  }
}

/**
 * Liste toutes les images d'un voyage pour l'utilisateur connecté
 */
export async function listSessionImages(tripId: string): Promise<{ success: boolean; data?: SupabaseImage[]; error?: string }> {
  try {
    const userId = await requireAuth();
    const prefix = `${userId}/${tripId}`;

    const { data: files, error } = await supabase.storage
      .from('trip-images')
      .list(prefix);

    if (error) {
      return { success: false, error: error.message };
    }

    if (!files || files.length === 0) {
      return { success: true, data: [] };
    }

    const images: SupabaseImage[] = files.map(file => {
      const storagePath = `${prefix}/${file.name}`;
      const { data: urlData } = supabase.storage
        .from('trip-images')
        .getPublicUrl(storagePath);

      return {
        storage_path: storagePath,
        public_url: urlData.publicUrl,
        file_name: file.name,
        uploaded_at: file.created_at || new Date().toISOString(),
      };
    });

    return { success: true, data: images };

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    };
  }
}
