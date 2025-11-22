import { supabase } from '@/integrations/supabase/client';
import { requireAuth } from '@/utils/authHelpers';
import type { TravelSegment } from '@/types/travel';

export interface CreateSegmentData {
  segment_type: string;
  title: string;
  description: string;
  start_date: string;
  address: string;
  end_date?: string;
  provider?: string;
  reference_number?: string;
  phone?: string;
  website?: string;
  star_rating?: number;
  checkin_time?: string;
  checkout_time?: string;
  opening_hours?: string;
  activity_price?: string;
  ticket_price?: string;
  duration?: string;
  booking_required?: boolean;
  iata_code?: string;
  icao_code?: string;
  terminals?: string[];
  facilities?: string[];
  departure_times?: string[];
  route?: string;
}

export async function createManualSegment(
  tripId: string,
  segmentData: CreateSegmentData
): Promise<{ success: boolean; segment?: TravelSegment; error?: string }> {
  try {
    console.log('🔧 createManualSegment called');
    console.log('  - tripId:', tripId);
    console.log('  - segmentData:', segmentData);
    
    // 1. Vérifier l'authentification et obtenir l'user_id
    console.log('🔐 Checking authentication...');
    const userId = await requireAuth();
    console.log('✅ User authenticated:', userId);

    // 2. Préparer les données du segment SANS document (segment manuel)
    console.log('📦 Preparing manual segment data (no document)...');
    const segmentToInsert = {
      trip_id: tripId,
      document_id: null, // ✅ NULL pour les segments manuels (pas de document source)
      user_id: userId, // ✅ Utilisateur authentifié (plus de NULL)
      segment_type: segmentData.segment_type,
      title: segmentData.title,
      description: segmentData.description,
      start_date: segmentData.start_date,
      address: segmentData.address,
      end_date: segmentData.end_date || null,
      provider: segmentData.provider || null,
      reference_number: segmentData.reference_number || null,
      phone: segmentData.phone || null,
      website: segmentData.website || null,
      star_rating: segmentData.star_rating || null,
      checkin_time: segmentData.checkin_time || null,
      checkout_time: segmentData.checkout_time || null,
      opening_hours: segmentData.opening_hours || null,
      activity_price: segmentData.activity_price || null,
      ticket_price: segmentData.ticket_price || null,
      duration: segmentData.duration || null,
      booking_required: segmentData.booking_required || null,
      iata_code: segmentData.iata_code || null,
      icao_code: segmentData.icao_code || null,
      terminals: segmentData.terminals || null,
      facilities: segmentData.facilities || null,
      departure_times: segmentData.departure_times || null,
      route: segmentData.route || null,
      validated: false,
      confidence: 1.0, // Haute confiance car créé manuellement
      raw_data: {
        source: 'manual_creation',
        created_at: new Date().toISOString(),
      },
    };
    console.log('  - segmentToInsert:', segmentToInsert);

    // 3. Insérer le segment directement (sans document)
    console.log('💾 Inserting manual segment into database...');
    const { data: segment, error: segmentError } = await supabase
      .from('travel_segments')
      .insert(segmentToInsert)
      .select()
      .single();

    if (segmentError || !segment) {
      console.error('❌ Error creating segment:', segmentError);
      console.error('  - Error details:', {
        code: segmentError?.code,
        message: segmentError?.message,
        details: segmentError?.details,
        hint: segmentError?.hint,
      });
      return {
        success: false,
        error: 'Erreur lors de la création du segment: ' + (segmentError?.message || 'Unknown error'),
      };
    }

    console.log('✅ Manual segment created successfully:', segment.id);
    console.log('  - Full segment data:', segment);

    return {
      success: true,
      segment: segment as TravelSegment,
    };
  } catch (error) {
    console.error('💥 Unexpected error in createManualSegment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inattendue',
    };
  }
}
