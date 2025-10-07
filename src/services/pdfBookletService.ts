/**
 * Service pour préparer les données du carnet de voyage pour le PDF
 * Adapté spécifiquement pour react-pdf avec toutes les règles de pagination
 */

import { supabase } from '@/integrations/supabase/client';
import { listSessionImages, SupabaseImage } from './supabaseImageService';
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

// Types pour le PDF
export interface PDFBookletData {
  tripTitle: string;
  startDate?: Date;
  endDate?: Date;
  destination?: string;
  coverImages?: SupabaseImage[];
  generalInfo?: {
    description?: string;
    accommodation?: string;
    transportation?: string;
    tips?: string[];
  };
  steps: PDFStep[];
  emergencyContacts?: EmergencyContact[];
  thankYouMessage?: string;
}

export interface PDFStep {
  stepId: string;
  stepTitle: string;
  startDate: Date;
  endDate: Date;
  aiContent?: {
    overview?: string;
    tips?: string[];
    localContext?: string;
  };
  sections: PDFSection[];
  images?: SupabaseImage[];
}

export interface PDFSection {
  title: string;
  segments: PDFSegment[];
}

export interface PDFSegment {
  id: string;
  role: string;
  title?: string;
  provider?: string;
  description?: string;
  address?: string;
  startTime?: string;
  endTime?: string;
  phone?: string;
  duration?: string;
  isExcluded?: boolean;
}

export interface EmergencyContact {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

/**
 * Récupère et prépare toutes les données pour le PDF
 */
export async function getPDFBookletData(tripId: string): Promise<PDFBookletData> {
  try {
    // 1. Récupérer les infos du voyage
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('title')
      .eq('id', tripId)
      .single();

    if (tripError) throw tripError;

    // 2. Récupérer tous les segments validés et groupés
    const { data: segments, error: segmentsError } = await supabase
      .from('travel_segments')
      .select('*')
      .eq('trip_id', tripId)
      .eq('validated', true)
      .order('start_date', { ascending: true })
      .order('sequence_order', { ascending: true });

    if (segmentsError) throw segmentsError;

    // 3. Récupérer les images (couverture et étapes)
    const imagesResult = await listSessionImages(tripId);
    const allImages = imagesResult.success ? imagesResult.data || [] : [];

    const coverImages = allImages.filter(img => img.storage_path.includes('cover_'));

    // 4. Grouper les segments par étape (step_group)
    const stepGroups = groupSegmentsByStep(segments || []);

    // 5. Construire les étapes pour le PDF
    const steps: PDFStep[] = stepGroups.map(group => {
      const stepId = group.stepId;

      // Récupérer les images de cette étape
      const stepImages = allImages.filter(img =>
        img.file_name.includes(`step_${stepId}`)
      );

      // Grouper les segments par section
      const sections = groupSegmentsBySection(group.segments);

      return {
        stepId,
        stepTitle: group.title,
        startDate: group.startDate,
        endDate: group.endDate,
        aiContent: undefined, // TODO: Récupérer depuis le storage ou metadata si besoin
        sections,
        images: stepImages.length > 0 ? stepImages : undefined,
      };
    });

    // 6. Calculer les dates globales
    const allDates = (segments || [])
      .map(s => s.start_date)
      .filter((date): date is string => Boolean(date))
      .map(date => parseISO(date))
      .filter(date => isValid(date));

    const startDate = allDates.length > 0 ? new Date(Math.min(...allDates.map(d => d.getTime()))) : undefined;
    const endDate = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => d.getTime()))) : undefined;

    // 7. Destination (première ville trouvée)
    const firstLocation = (segments?.[0] as any)?.location_name || (segments?.[0] as any)?.provider;

    return {
      tripTitle: trip.title || 'Carnet de Voyage',
      startDate,
      endDate,
      destination: firstLocation,
      coverImages: coverImages.length > 0 ? coverImages : undefined,
      generalInfo: undefined, // TODO: À remplir depuis le frontend ou metadata
      steps,
      emergencyContacts: undefined, // TODO: À remplir depuis le frontend
      thankYouMessage: undefined, // TODO: À remplir depuis le frontend
    };
  } catch (error) {
    console.error('Erreur lors de la préparation des données PDF:', error);
    throw error;
  }
}

/**
 * Groupe les segments par étape (step_group)
 */
function groupSegmentsByStep(segments: any[]): Array<{
  stepId: string;
  title: string;
  startDate: Date;
  endDate: Date;
  segments: any[];
}> {
  const grouped = new Map<string, any>();

  segments.forEach(segment => {
    const stepGroup = segment.step_group || 'default';

    if (!grouped.has(stepGroup)) {
      grouped.set(stepGroup, {
        stepId: stepGroup,
        title: segment.location_name || segment.provider || 'Étape',
        startDate: parseISO(segment.start_date),
        endDate: parseISO(segment.end_date || segment.start_date),
        segments: [],
      });
    }

    grouped.get(stepGroup)!.segments.push(segment);

    // Mettre à jour les dates min/max
    const current = grouped.get(stepGroup)!;
    const segmentStart = parseISO(segment.start_date);
    const segmentEnd = parseISO(segment.end_date || segment.start_date);

    if (segmentStart < current.startDate) {
      current.startDate = segmentStart;
    }
    if (segmentEnd > current.endDate) {
      current.endDate = segmentEnd;
    }
  });

  return Array.from(grouped.values()).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

/**
 * Groupe les segments par section (ex: Transport, Hébergement, etc.)
 */
function groupSegmentsBySection(segments: any[]): PDFSection[] {
  const sections = new Map<string, PDFSegment[]>();

  segments.forEach(segment => {
    const sectionTitle = segment.role || 'Autre';

    if (!sections.has(sectionTitle)) {
      sections.set(sectionTitle, []);
    }

    sections.get(sectionTitle)!.push({
      id: segment.id,
      role: segment.role || 'autre',
      title: segment.title,
      provider: segment.provider,
      description: segment.description,
      address: segment.address,
      startTime: segment.start_time,
      endTime: segment.end_time,
      phone: segment.phone,
      duration: segment.duration,
      isExcluded: segment.is_excluded || false,
    });
  });

  return Array.from(sections.entries()).map(([title, segments]) => ({
    title,
    segments: segments.filter(s => !s.isExcluded),
  }));
}
