import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EnrichmentStatus {
  isEnriching: boolean;
  enrichmentStatus: string;
  lastEnrichedAt?: Date;
  error?: string;
}

export function useEnrichmentStatus(tripId: string): EnrichmentStatus {
  const [status, setStatus] = useState<EnrichmentStatus>({
    isEnriching: false,
    enrichmentStatus: 'pending',
  });

  useEffect(() => {
    if (!tripId) return;

    // Fonction pour vérifier le statut
    const checkStatus = async () => {
      try {
        const { data: trip, error } = await supabase
          .from('trips')
          .select('enrichment_status, updated_at')
          .eq('id', tripId)
          .single();

        if (error) {
          setStatus(prev => ({ 
            ...prev, 
            error: error.message,
            isEnriching: false 
          }));
          return;
        }

        setStatus({
          isEnriching: trip.enrichment_status === 'in_progress',
          enrichmentStatus: trip.enrichment_status || 'pending',
          lastEnrichedAt: trip.updated_at ? new Date(trip.updated_at) : undefined,
          error: undefined,
        });
      } catch (error) {
        setStatus(prev => ({ 
          ...prev, 
          error: 'Erreur lors de la vérification du statut',
          isEnriching: false 
        }));
      }
    };

    // Vérification initiale
    checkStatus();

    // Subscription aux changements en temps réel
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
          const newTrip = payload.new as any;
          setStatus({
            isEnriching: newTrip.enrichment_status === 'in_progress',
            enrichmentStatus: newTrip.enrichment_status || 'pending',
            lastEnrichedAt: newTrip.updated_at ? new Date(newTrip.updated_at) : undefined,
            error: undefined,
          });
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  return status;
}