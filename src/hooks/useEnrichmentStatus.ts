import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type EnrichmentStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export function useEnrichmentStatus(tripId: string | null) {
  const [status, setStatus] = useState<EnrichmentStatus>('pending');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tripId) {
      setIsLoading(false);
      return;
    }

    const checkEnrichmentStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('trips')
          .select('enrichment_status')
          .eq('id', tripId)
          .single();

        if (error) {
          console.error('Error fetching enrichment status:', error);
          setStatus('failed');
        } else {
          setStatus((data?.enrichment_status as EnrichmentStatus) || 'pending');
        }
      } catch (error) {
        console.error('Error checking enrichment status:', error);
        setStatus('failed');
      } finally {
        setIsLoading(false);
      }
    };

    checkEnrichmentStatus();

    // Set up real-time subscription to listen for status changes
    const channel = supabase
      .channel('enrichment-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${tripId}`,
        },
        (payload) => {
          const newStatus = payload.new.enrichment_status as EnrichmentStatus;
          console.log('Enrichment status updated:', newStatus);
          setStatus(newStatus);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  return { status, isLoading };
}