import { supabase } from '@/integrations/supabase/client';
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
    
    // 1. Vérifier et récupérer la session Supabase active
    console.log('🔐 Getting Supabase session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
      return {
        success: false,
        error: 'Erreur de session: ' + sessionError.message,
      };
    }
    
    if (!session || !session.user) {
      console.error('❌ No active session found');
      return {
        success: false,
        error: 'Vous devez être connecté pour créer un segment. Veuillez vous reconnecter.',
      };
    }
    
    const userId = session.user.id;
    console.log('✅ Session valid, user:', userId);
    console.log('  - User email:', session.user.email);
    console.log('  - Access token present:', !!session.access_token);

    
    // 1. Créer un document virtuel pour "Création manuelle"
    console.log('📄 Creating virtual document...');
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
      console.error('❌ Error creating virtual document:', docError);
      return {
        success: false,
        error: 'Erreur lors de la création du document virtuel: ' + (docError?.message || 'Unknown error'),
      };
    }
    
    console.log('✅ Virtual document created:', virtualDoc.id);

    // 2. Préparer les données du segment
    console.log('📦 Preparing segment data...');
    const segmentToInsert = {
      trip_id: tripId,
      document_id: virtualDoc.id,
      user_id: userId, // ✅ Ajout du user_id pour la sécurité RLS
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

    // 3. Insérer le segment
    console.log('💾 Inserting segment into database...');
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
