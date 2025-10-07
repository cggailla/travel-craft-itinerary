import { supabase } from '@/integrations/supabase/client';
import type { TravelSegment } from '@/types/travel';
import { sessionManager } from '@/utils/sessionManager';

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
    // Get current user session ID for secure access
    const userId = await sessionManager.getCurrentUserId();
    
    // 1. Créer un document virtuel pour "Création manuelle"
    const { data: virtualDoc, error: docError } = await supabase
      .from('documents')
      .insert({
        trip_id: tripId,
        user_id: userId,
        file_name: 'Création manuelle',
        file_type: 'manual',
        file_size: 0,
        storage_path: 'manual/virtual',
      })
      .select()
      .single();

    if (docError || !virtualDoc) {
      console.error('Error creating virtual document:', docError);
      return {
        success: false,
        error: 'Erreur lors de la création du document virtuel',
      };
    }

    // 2. Préparer les données du segment
    const segmentToInsert = {
      trip_id: tripId,
      document_id: virtualDoc.id,
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

    // 3. Insérer le segment
    const { data: segment, error: segmentError } = await supabase
      .from('travel_segments')
      .insert(segmentToInsert)
      .select()
      .single();

    if (segmentError || !segment) {
      console.error('Error creating segment:', segmentError);
      return {
        success: false,
        error: 'Erreur lors de la création du segment',
      };
    }

    console.log('Manual segment created successfully:', segment.id);

    return {
      success: true,
      segment: segment as TravelSegment,
    };
  } catch (error) {
    console.error('Unexpected error in createManualSegment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inattendue',
    };
  }
}
