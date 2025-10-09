import { supabase } from '@/integrations/supabase/client';
import { requireAuth, getCurrentUserId } from '@/utils/authHelpers';
import type { Database } from '@/integrations/supabase/types';

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
 * 🔐 NIVEAU 2 : Supprimer un voyage
 */
export async function deleteTrip(tripId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔐 [NIVEAU 2] Vérification authentification pour suppression voyage...');
    
    // ✅ NIVEAU 2 : Vérifier l'authentification
    const userId = await requireAuth();
    console.log('✅ [NIVEAU 2] User authentifié:', userId);

    console.log('🗑️ [NIVEAU 2] Suppression voyage:', tripId);

    // ✅ NIVEAU 2 : Delete avec vérification user_id
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

    console.log('✅ [NIVEAU 2] Voyage supprimé avec succès');
    return { success: true };
  } catch (error) {
    console.error('💥 [NIVEAU 2] Erreur inattendue:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inattendue',
    };
  }
}
