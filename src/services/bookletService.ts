import { supabase } from "@/integrations/supabase/client";
import { TravelSegment, TimelineDay } from "@/types/travel";
import { format, parseISO, isValid } from "date-fns";
import { fr } from "date-fns/locale";

export interface BookletData {
  tripTitle: string;
  startDate?: Date;
  endDate?: Date;
  totalDays: number;
  segments: TravelSegment[];
  timeline: TimelineDay[];
  destinations: string[];
  segmentsByType: Record<string, TravelSegment[]>;
}

export interface BookletOptions {
  includeDocuments: boolean;
  includeMaps: boolean;
  includeNotes: boolean;
  colorTheme: 'blue' | 'green' | 'orange';
  template: 'classic' | 'modern' | 'minimal';
}

export const defaultBookletOptions: BookletOptions = {
  includeDocuments: true,
  includeMaps: false,
  includeNotes: true,
  colorTheme: 'blue',
  template: 'classic',
};

export async function getBookletData(tripId: string): Promise<BookletData> {
  try {
    // Récupérer tous les segments validés du voyage
    const { data: segments, error } = await supabase
      .from('travel_segments')
      .select(`
        *,
        documents (
          id,
          file_name,
          file_type,
          created_at
        )
      `)
      .eq('trip_id', tripId)
      .eq('validated', true)
      .order('start_date', { ascending: true })
      .order('sequence_order', { ascending: true });

    if (error) {
      throw new Error(`Erreur lors de la récupération des segments: ${error.message}`);
    }

    const typedSegments = (segments || []) as TravelSegment[];
    
    // Récupérer les infos du voyage
    const { data: trip } = await supabase
      .from('trips')
      .select('title, created_at')
      .eq('id', tripId)
      .single();

    // Calculer les dates de début et fin
    const validDates = typedSegments
      .map(s => s.start_date)
      .filter((date): date is string => Boolean(date))
      .map(date => parseISO(date))
      .filter(date => isValid(date));

    const startDate = validDates.length > 0 ? new Date(Math.min(...validDates.map(d => d.getTime()))) : undefined;
    const endDate = validDates.length > 0 ? new Date(Math.max(...validDates.map(d => d.getTime()))) : undefined;
    
    const totalDays = startDate && endDate 
      ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      : 1;

    // Grouper par type
    const segmentsByType = typedSegments.reduce((acc, segment) => {
      const type = segment.segment_type || 'other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(segment);
      return acc;
    }, {} as Record<string, TravelSegment[]>);

    // Créer la timeline par jour
    const timeline: TimelineDay[] = [];
    const segmentsByDate = new Map<string, TravelSegment[]>();

    typedSegments.forEach(segment => {
      if (segment.start_date) {
        const date = parseISO(segment.start_date);
        if (isValid(date)) {
          const dateKey = format(date, 'yyyy-MM-dd');
          if (!segmentsByDate.has(dateKey)) {
            segmentsByDate.set(dateKey, []);
          }
          segmentsByDate.get(dateKey)!.push(segment);
        }
      }
    });

    // Trier par date et créer la timeline
    const sortedDates = Array.from(segmentsByDate.keys()).sort();
    sortedDates.forEach(dateKey => {
      const date = parseISO(dateKey);
      const segments = segmentsByDate.get(dateKey) || [];
      timeline.push({ date, segments });
    });

    // Extraire les destinations uniques
    const destinations = [...new Set(
      typedSegments
        .map(s => s.address)
        .filter((addr): addr is string => Boolean(addr))
    )];

    return {
      tripTitle: trip?.title || 'Mon Voyage',
      startDate,
      endDate,
      totalDays,
      segments: typedSegments,
      timeline,
      destinations,
      segmentsByType,
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des données du carnet:', error);
    throw error;
  }
}

export function formatSegmentType(type: string): string {
  const types: Record<string, string> = {
    flight: 'Vol',
    hotel: 'Hébergement',
    activity: 'Activité',
    car: 'Voiture',
    train: 'Train',
    boat: 'Bateau',
    pass: 'Pass/Billet',
    transfer: 'Transfert',
    other: 'Autre',
  };
  return types[type] || type;
}

export function getSegmentIcon(type: string): string {
  const icons: Record<string, string> = {
    flight: '✈️',
    hotel: '🏨',
    activity: '🎯',
    car: '🚗',
    train: '🚂',
    boat: '🚢',
    pass: '🎫',
    transfer: '🚌',
    other: '📍',
  };
  return icons[type] || '📍';
}