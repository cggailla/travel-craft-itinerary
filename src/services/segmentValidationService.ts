import { supabase } from '@/integrations/supabase/client';
import { requireAuth, getCurrentUserId } from '@/utils/authHelpers';
import type { Database } from '@/integrations/supabase/types';

export type TravelSegment = Database['public']['Tables']['travel_segments']['Row'];
export type TravelSegmentUpdate = Database['public']['Tables']['travel_segments']['Update'];

/**
 * 🔐 NIVEAU 2 : Valider un segment (avec vérification auth)
 */
export async function validateSegment(segmentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔐 [NIVEAU 2] Vérification authentification pour validation segment...');
    console.log('  - Segment ID:', segmentId);
    
    // ✅ NIVEAU 2 : Vérifier l'authentification
    const userId = await requireAuth();
    console.log('✅ [NIVEAU 2] User authentifié:', userId);

    console.log('✅ [NIVEAU 2] Validation segment en base...');

    // ✅ NIVEAU 2 : Update avec vérification user_id
    const { error } = await supabase
      .from('travel_segments')
      .update({ validated: true })
      .eq('id', segmentId)
      .eq('user_id', userId); // ✅ NIVEAU 2 : Sécurité
    // ✅ NIVEAU 3 : RLS vérifie aussi

    if (error) {
      console.error('❌ [NIVEAU 2] Validation error:', error);
      
      // Si erreur car segment n'appartient pas à l'utilisateur
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: "Ce segment ne vous appartient pas",
        };
      }
      
      return {
        success: false,
        error: error.message,
      };
    }

    console.log('✅ [NIVEAU 2] Segment validé');
    return { success: true };
  } catch (error) {
    console.error('💥 [NIVEAU 2] Error in validateSegment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inattendue',
    };
  }
}

/**
 * 🔐 NIVEAU 2 : Invalider un segment (avec vérification auth)
 */
export async function invalidateSegment(segmentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔐 [NIVEAU 2] Vérification authentification pour invalidation segment...');
    
    // ✅ NIVEAU 2 : Vérifier l'authentification
    const userId = await requireAuth();
    console.log('✅ [NIVEAU 2] User authentifié:', userId);

    console.log('❌ [NIVEAU 2] Invalidation segment en base...');

    // ✅ NIVEAU 2 : Update avec vérification user_id
    const { error } = await supabase
      .from('travel_segments')
      .update({ validated: false })
      .eq('id', segmentId)
      .eq('user_id', userId); // ✅ NIVEAU 2 : Sécurité
    // ✅ NIVEAU 3 : RLS vérifie aussi

    if (error) {
      console.error('❌ [NIVEAU 2] Invalidation error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log('✅ [NIVEAU 2] Segment invalidé');
    return { success: true };
  } catch (error) {
    console.error('💥 [NIVEAU 2] Error in invalidateSegment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inattendue',
    };
  }
}

/**
 * 🔐 NIVEAU 2 : Supprimer un segment (avec vérification auth)
 */
export async function deleteSegment(segmentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔐 [NIVEAU 2] Vérification authentification pour suppression segment...');
    
    // ✅ NIVEAU 2 : Vérifier l'authentification
    const userId = await requireAuth();
    console.log('✅ [NIVEAU 2] User authentifié:', userId);

    console.log('🗑️ [NIVEAU 2] Suppression segment en base...');

    // ✅ NIVEAU 2 : Delete avec vérification user_id
    const { error } = await supabase
      .from('travel_segments')
      .delete()
      .eq('id', segmentId)
      .eq('user_id', userId); // ✅ NIVEAU 2 : Sécurité
    // ✅ NIVEAU 3 : RLS vérifie aussi

    if (error) {
      console.error('❌ [NIVEAU 2] Deletion error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log('✅ [NIVEAU 2] Segment supprimé');
    return { success: true };
  } catch (error) {
    console.error('💥 [NIVEAU 2] Error in deleteSegment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inattendue',
    };
  }
}

/**
 * 🔐 NIVEAU 2 : Mettre à jour un segment (avec vérification auth)
 */
export async function updateSegment(
  segmentId: string,
  updates: TravelSegmentUpdate
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔐 [NIVEAU 2] Vérification authentification pour mise à jour segment...');
    
    // ✅ NIVEAU 2 : Vérifier l'authentification
    const userId = await requireAuth();
    console.log('✅ [NIVEAU 2] User authentifié:', userId);

    console.log('📝 [NIVEAU 2] Mise à jour segment en base...');

    // ✅ NIVEAU 2 : Update avec vérification user_id
    const { error } = await supabase
      .from('travel_segments')
      .update(updates)
      .eq('id', segmentId)
      .eq('user_id', userId); // ✅ NIVEAU 2 : Sécurité
    // ✅ NIVEAU 3 : RLS vérifie aussi

    if (error) {
      console.error('❌ [NIVEAU 2] Update error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log('✅ [NIVEAU 2] Segment mis à jour');
    return { success: true };
  } catch (error) {
    console.error('💥 [NIVEAU 2] Error in updateSegment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inattendue',
    };
  }
}

/**
 * 🔐 NIVEAU 2 : Récupérer les segments d'un voyage (avec vérification auth)
 */
export async function getTripSegments(tripId: string): Promise<TravelSegment[]> {
  try {
    console.log('🔐 [NIVEAU 2] Vérification authentification pour listing segments...');
    
    // ✅ NIVEAU 2 : Vérifier l'authentification
    const userId = await getCurrentUserId();
    
    if (!userId) {
      console.log('⚠️ [NIVEAU 2] Utilisateur non connecté');
      return [];
    }

    console.log('✅ [NIVEAU 2] User authentifié:', userId);
    console.log('📋 [NIVEAU 2] Récupération segments en base...');

    // ✅ NIVEAU 2 : Filtrer par user_id ET trip_id
    const { data: segments, error } = await supabase
      .from('travel_segments')
      .select('*')
      .eq('trip_id', tripId)
      .eq('user_id', userId) // ✅ NIVEAU 2 : Sécurité
      .order('start_date', { ascending: true });
    // ✅ NIVEAU 3 : RLS filtre aussi

    if (error) {
      console.error('❌ [NIVEAU 2] Error fetching segments:', error);
      return [];
    }

    console.log(`✅ [NIVEAU 2] ${segments?.length || 0} segments récupérés`);
    return segments || [];
  } catch (error) {
    console.error('💥 [NIVEAU 2] Error in getTripSegments:', error);
    return [];
  }
}

/**
 * 🔐 NIVEAU 2 : Récupérer un segment spécifique (avec vérification auth)
 */
export async function getSegmentById(segmentId: string): Promise<TravelSegment | null> {
  try {
    console.log('🔐 [NIVEAU 2] Vérification authentification pour récupération segment...');
    
    // ✅ NIVEAU 2 : Vérifier l'authentification
    const userId = await requireAuth();
    console.log('✅ [NIVEAU 2] User authentifié:', userId);

    console.log('📋 [NIVEAU 2] Récupération segment:', segmentId);

    // ✅ NIVEAU 2 : Filtrer par user_id ET segment_id
    const { data: segment, error } = await supabase
      .from('travel_segments')
      .select('*')
      .eq('id', segmentId)
      .eq('user_id', userId) // ✅ NIVEAU 2 : Sécurité
      .single();
    // ✅ NIVEAU 3 : RLS vérifie aussi

    if (error) {
      if (error.code === 'PGRST116') {
        console.error('❌ [NIVEAU 2] Segment non trouvé ou accès refusé');
        return null;
      }
      console.error('❌ [NIVEAU 2] Erreur récupération segment:', error);
      throw new Error(error.message);
    }

    console.log('✅ [NIVEAU 2] Segment récupéré:', segment.title);
    return segment;
  } catch (error) {
    console.error('💥 [NIVEAU 2] Erreur inattendue:', error);
    return null;
  }
}
