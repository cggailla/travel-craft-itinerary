import { supabase } from '@/integrations/supabase/client';
import { requireAuth, getCurrentUserId } from '@/utils/authHelpers';
import type { Database } from '@/integrations/supabase/types';
import { cleanupTripImages } from './supabaseImageService';

// Utiliser le type de la base de données
export type Trip = Database['public']['Tables']['trips']['Row'];
export type TripInsert = Database['public']['Tables']['trips']['Insert'];
export type TripUpdate = Database['public']['Tables']['trips']['Update'];

/**
 * 🔐 NIVEAU 2 : Créer un voyage (avec vérification auth)
 */
export async function createTrip(tripData: {
  title: string;
  destination_zone?: string;
  price?: number;
  participants?: string;
  number_of_people?: number;
}): Promise<{ success: boolean; trip?: Trip; error?: string }> {
  try {
    console.log('🔐 [NIVEAU 2] Vérification authentification pour création voyage...');
    
    // ✅ NIVEAU 2 : Vérifier l'authentification
    const userId = await requireAuth();
    console.log('✅ [NIVEAU 2] User authentifié:', userId);

    console.log('💾 [NIVEAU 2] Création voyage en base...');
    
    // ✅ NIVEAU 2 : Insérer avec user_id
    const { data: trip, error } = await supabase
      .from('trips')
      .insert({
        user_id: userId, // ✅ NIVEAU 2 : Lié à l'utilisateur
        title: tripData.title,
        destination_zone: tripData.destination_zone,
        price: tripData.price,
        participants: tripData.participants,
        number_of_people: tripData.number_of_people,
        status: 'draft',
      })
      .select()
      .single();
    // ✅ NIVEAU 3 : RLS vérifie que auth.uid() = user_id

    if (error) {
      console.error('❌ [NIVEAU 2] Erreur création voyage:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log('✅ [NIVEAU 2] Voyage créé avec succès:', trip.id);
    return {
      success: true,
      trip,
    };
  } catch (error) {
    console.error('💥 [NIVEAU 2] Erreur inattendue:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inattendue',
    };
  }
}

/**
 * 🔐 NIVEAU 2 : Récupérer tous les voyages de l'utilisateur
 */
export async function getUserTrips(): Promise<Trip[]> {
  try {
    console.log('🔐 [NIVEAU 2] Vérification authentification pour listing voyages...');
    
    // ✅ NIVEAU 2 : Vérifier l'authentification
    const userId = await getCurrentUserId();
    
    if (!userId) {
      console.log('⚠️ [NIVEAU 2] Utilisateur non connecté');
      return [];
    }

    console.log('✅ [NIVEAU 2] User authentifié:', userId);
    console.log('📋 [NIVEAU 2] Récupération voyages en base...');

    // ✅ NIVEAU 2 : Filtrer par user_id (redondant avec RLS mais explicite)
    const { data: trips, error } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', userId) // ✅ NIVEAU 2 : Filtre explicite
      .order('created_at', { ascending: false });
    // ✅ NIVEAU 3 : RLS filtre automatiquement aussi

    if (error) {
      console.error('❌ [NIVEAU 2] Erreur récupération voyages:', error);
      throw new Error(error.message);
    }

    console.log(`✅ [NIVEAU 2] ${trips?.length || 0} voyages récupérés`);
    return trips || [];
  } catch (error) {
    console.error('💥 [NIVEAU 2] Erreur inattendue:', error);
    return [];
  }
}

/**
 * 🔐 NIVEAU 2 : Récupérer un voyage spécifique
 */
export async function getTripById(tripId: string): Promise<Trip | null> {
  try {
    console.log('🔐 [NIVEAU 2] Vérification authentification pour récupération voyage...');
    
    // ✅ NIVEAU 2 : Vérifier l'authentification
    const userId = await requireAuth();
    console.log('✅ [NIVEAU 2] User authentifié:', userId);

    console.log('📋 [NIVEAU 2] Récupération voyage:', tripId);

    // ✅ NIVEAU 2 : Filtrer par user_id ET trip_id
    const { data: trip, error } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .eq('user_id', userId) // ✅ NIVEAU 2 : Double vérification
      .single();
    // ✅ NIVEAU 3 : RLS vérifie aussi

    if (error) {
      if (error.code === 'PGRST116') {
        console.error('❌ [NIVEAU 2] Voyage non trouvé ou accès refusé');
        return null;
      }
      console.error('❌ [NIVEAU 2] Erreur récupération voyage:', error);
      throw new Error(error.message);
    }

    console.log('✅ [NIVEAU 2] Voyage récupéré:', trip.title);
    return trip;
  } catch (error) {
    console.error('💥 [NIVEAU 2] Erreur inattendue:', error);
    return null;
  }
}

/**
 * 🔐 NIVEAU 2 : Mettre à jour un voyage
 */
export async function updateTrip(
  tripId: string,
  updates: TripUpdate
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔐 [NIVEAU 2] Vérification authentification pour mise à jour voyage...');
    
    // ✅ NIVEAU 2 : Vérifier l'authentification
    const userId = await requireAuth();
    console.log('✅ [NIVEAU 2] User authentifié:', userId);

    console.log('📝 [NIVEAU 2] Mise à jour voyage:', tripId);

    // ✅ NIVEAU 2 : Update avec vérification user_id
    const { error } = await supabase
      .from('trips')
      .update(updates)
      .eq('id', tripId)
      .eq('user_id', userId); // ✅ NIVEAU 2 : Sécurité
    // ✅ NIVEAU 3 : RLS vérifie aussi

    if (error) {
      console.error('❌ [NIVEAU 2] Erreur mise à jour voyage:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log('✅ [NIVEAU 2] Voyage mis à jour avec succès');
    return { success: true };
  } catch (error) {
    console.error('💥 [NIVEAU 2] Erreur inattendue:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inattendue',
    };
  }
}

/**
 * 🧹 Nettoyer tous les fichiers du storage associés à un voyage
 */
async function cleanupTripStorage(
  tripId: string,
  userId: string
): Promise<{
  success: boolean;
  deletedFiles: {
    images: number;
    documents: number;
    htmlExports: number;
    pdfBooklet: boolean;
  };
  errors: string[];
}> {
  const result = {
    success: true,
    deletedFiles: {
      images: 0,
      documents: 0,
      htmlExports: 0,
      pdfBooklet: false,
    },
    errors: [] as string[],
  };

  console.log('🧹 [STORAGE] Début du nettoyage complet du storage...');

  // 1. Nettoyer les images du bucket 'trip-images'
  try {
    console.log('📸 [STORAGE] Nettoyage des images...');
    const imagesResult = await cleanupTripImages(tripId);
    
    if (imagesResult.success) {
      result.deletedFiles.images = imagesResult.deletedCount;
      console.log(`✅ ${imagesResult.deletedCount} image(s) supprimée(s)`);
    } else {
      result.errors.push(`Images: ${imagesResult.error}`);
      console.warn('⚠️ Erreur nettoyage images:', imagesResult.error);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
    result.errors.push(`Images: ${errorMsg}`);
    console.error('💥 Erreur inattendue lors du nettoyage des images:', error);
  }

  // 2. Nettoyer les documents du bucket 'travel-documents'
  try {
    console.log('📄 [STORAGE] Nettoyage des documents...');
    
    const { data: documents, error: fetchError } = await supabase
      .from('documents')
      .select('storage_path, id')
      .eq('trip_id', tripId);

    if (fetchError) {
      throw fetchError;
    }

    if (documents && documents.length > 0) {
      const storagePaths = documents.map(doc => doc.storage_path);
      
      const { error: deleteError } = await supabase.storage
        .from('travel-documents')
        .remove(storagePaths);

      if (deleteError) {
        throw deleteError;
      }

      result.deletedFiles.documents = documents.length;
      console.log(`✅ ${documents.length} document(s) supprimé(s)`);
    } else {
      console.log('ℹ️ Aucun document à supprimer');
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
    result.errors.push(`Documents: ${errorMsg}`);
    console.error('💥 Erreur lors du nettoyage des documents:', error);
  }

  // 3. Nettoyer les exports HTML du bucket 'booklet-exports'
  try {
    console.log('📋 [STORAGE] Nettoyage des exports HTML...');
    
    const { data: files, error: listError } = await supabase.storage
      .from('booklet-exports')
      .list('', { 
        search: `booklet-${tripId}-`
      });

    if (listError) {
      throw listError;
    }

    if (files && files.length > 0) {
      const filePaths = files.map(file => file.name);
      
      const { error: deleteError } = await supabase.storage
        .from('booklet-exports')
        .remove(filePaths);

      if (deleteError) {
        throw deleteError;
      }

      result.deletedFiles.htmlExports = files.length;
      console.log(`✅ ${files.length} export(s) HTML supprimé(s)`);
    } else {
      console.log('ℹ️ Aucun export HTML à supprimer');
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
    result.errors.push(`Exports HTML: ${errorMsg}`);
    console.error('💥 Erreur lors du nettoyage des exports HTML:', error);
  }

  // 4. Nettoyer le PDF du booklet du bucket 'travel-booklets'
  try {
    console.log('📕 [STORAGE] Nettoyage du PDF booklet...');
    
    const { error: deleteError } = await supabase.storage
      .from('travel-booklets')
      .remove([`booklets/${tripId}.pdf`]);

    if (deleteError && deleteError.message !== 'Not found') {
      throw deleteError;
    }

    result.deletedFiles.pdfBooklet = true;
    console.log('✅ PDF booklet supprimé');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
    result.errors.push(`PDF Booklet: ${errorMsg}`);
    console.error('💥 Erreur lors du nettoyage du PDF:', error);
  }

  // Résumé du nettoyage
  const totalDeleted = 
    result.deletedFiles.images + 
    result.deletedFiles.documents + 
    result.deletedFiles.htmlExports + 
    (result.deletedFiles.pdfBooklet ? 1 : 0);

  console.log(`📊 [STORAGE] Résumé: ${totalDeleted} fichier(s) supprimé(s)`);
  
  if (result.errors.length > 0) {
    console.warn(`⚠️ ${result.errors.length} erreur(s) lors du nettoyage:`, result.errors);
    result.success = false;
  }

  return result;
}

/**
 * 🔐 NIVEAU 2 : Supprimer un voyage
 */
export async function deleteTrip(tripId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔐 [NIVEAU 2] Vérification authentification pour suppression voyage...');
    
    // ✅ NIVEAU 2 : Vérifier l'authentification
    const userId = await requireAuth();
    console.log('✅ [NIVEAU 2] User authentifié:', userId);

    console.log('🗑️ [NIVEAU 2] Suppression complète du voyage:', tripId);

    // 1. Nettoyer TOUS les fichiers du storage AVANT la suppression DB
    console.log('🧹 [STORAGE] Nettoyage des fichiers du voyage...');
    const cleanupResult = await cleanupTripStorage(tripId, userId);
    
    if (!cleanupResult.success) {
      console.warn('⚠️ Erreurs lors du nettoyage du storage:', cleanupResult.errors);
      // On continue quand même la suppression de la base
    } else {
      console.log('✅ Fichiers supprimés:', cleanupResult.deletedFiles);
    }

    // 2. Supprimer le voyage (CASCADE supprimera automatiquement les données liées)
    console.log('🗑️ [DB] Suppression du voyage de la base...');
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', tripId)
      .eq('user_id', userId); // ✅ NIVEAU 2 : Sécurité
    // ✅ NIVEAU 3 : RLS vérifie aussi

    if (error) {
      console.error('❌ [NIVEAU 2] Erreur suppression voyage:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log('✅ [NIVEAU 2] Voyage et toutes ses données supprimés avec succès');
    return { success: true };
  } catch (error) {
    console.error('💥 [NIVEAU 2] Erreur inattendue:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inattendue',
    };
  }
}
