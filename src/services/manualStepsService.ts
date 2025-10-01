import { supabase } from '@/integrations/supabase/client';

export async function getManualSteps(tripId: string) {
  try {
    // Récupérer les étapes et leurs segments
    const { data: steps, error: stepsError } = await supabase
      .from('travel_steps')
      .select(`
        *,
        travel_step_segments (
          position_in_step,
          role,
          travel_segments (
            id,
            segment_type,
            title,
            provider,
            address,
            description,
            reference_number,
            start_date,
            end_date,
            confidence,
            validated,
            phone,
            website,
            star_rating,
            checkin_time,
            checkout_time,
            opening_hours,
            activity_price,
            duration,
            booking_required,
            iata_code,
            icao_code,
            route,
            ticket_price,
            documents (
              file_name
            )
          )
        )
      `)
      .eq('trip_id', tripId)
      .order('step_id');

    if (stepsError) throw stepsError;

    return {
      success: true,
      steps: steps || []
    };
  } catch (error) {
    console.error('Error fetching manual steps:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      steps: []
    };
  }
}

export async function deleteManualSteps(tripId: string) {
  try {
    // Supprimer d'abord les segments des étapes
    const { data: steps } = await supabase
      .from('travel_steps')
      .select('id')
      .eq('trip_id', tripId);

    if (steps && steps.length > 0) {
      const stepIds = steps.map(s => s.id);
      
      await supabase
        .from('travel_step_segments')
        .delete()
        .in('step_id', stepIds);
    }

    // Puis supprimer les étapes
    const { error } = await supabase
      .from('travel_steps')
      .delete()
      .eq('trip_id', tripId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting manual steps:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function hasManualSteps(tripId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('travel_steps')
      .select('id')
      .eq('trip_id', tripId)
      .limit(1);

    if (error) throw error;
    return (data?.length || 0) > 0;
  } catch (error) {
    console.error('Error checking manual steps:', error);
    return false;
  }
}

export async function validateManualSteps(tripId: string) {
  try {
    // Récupérer tous les segments associés aux étapes manuelles
    const { data: steps, error: stepsError } = await supabase
      .from('travel_steps')
      .select(`
        id,
        travel_step_segments (
          travel_segments (
            id
          )
        )
      `)
      .eq('trip_id', tripId);

    if (stepsError) throw stepsError;

    // Extraire tous les IDs des segments
    const segmentIds: string[] = [];
    steps?.forEach(step => {
      step.travel_step_segments?.forEach((tss: any) => {
        if (tss.travel_segments?.id) {
          segmentIds.push(tss.travel_segments.id);
        }
      });
    });

    // Valider tous les segments associés aux étapes
    if (segmentIds.length > 0) {
      const { error: updateError } = await supabase
        .from('travel_segments')
        .update({ validated: true })
        .in('id', segmentIds);

      if (updateError) throw updateError;
    }

    // Marquer le trip comme validé
    const { error: tripError } = await supabase
      .from('trips')
      .update({ status: 'validated' })
      .eq('id', tripId);

    if (tripError) throw tripError;

    return {
      success: true,
      validatedSegments: segmentIds.length
    };
  } catch (error) {
    console.error('Error validating manual steps:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      validatedSegments: 0
    };
  }
}