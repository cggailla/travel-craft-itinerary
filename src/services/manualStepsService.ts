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