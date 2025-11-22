// Clean, minimal implementation
import { getBookletData } from './bookletService';

export interface PDFBookletData {
  tripTitle: string;
  startDate?: Date;
  endDate?: Date;
  destination?: string;
  coverImages?: any[];
  generalInfo?: any;
  steps: PDFStep[];
  emergencyContacts?: any[];
  thankYouMessage?: string;
}

export interface PDFStep {
  stepId: string;
  stepTitle: string;
  startDate?: Date;
  endDate?: Date;
  aiContent?: any;
  sections: PDFSection[];
  images?: any[];
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

export async function getPDFBookletData(tripId: string): Promise<PDFBookletData> {
  try {
    const booklet = await getBookletData(tripId);

    const steps: PDFStep[] = (booklet.timeline || []).map((day: any, idx: number) => ({
      stepId: `day-${idx}`,
      stepTitle: day.date ? String(day.date) : `Jour ${idx + 1}`,
      startDate: undefined,
      endDate: undefined,
      aiContent: undefined,
      sections: [
        {
          title: 'Segments',
          segments: (day.segments || []).map((s: any) => ({
            id: s.id,
            role: s.role || 'autre',
            title: s.title,
            provider: s.provider,
            description: s.description,
            address: s.address,
            startTime: s.start_time,
            endTime: s.end_time,
            phone: s.phone,
            duration: s.duration,
            isExcluded: s.is_excluded || false,
          }))
        }
      ],
      images: undefined,
    }));

    return {
      tripTitle: booklet.tripTitle || 'Carnet de voyage',
      startDate: booklet.startDate,
      endDate: booklet.endDate,
      destination: (booklet.destinations && booklet.destinations.length > 0) ? booklet.destinations[0] : undefined,
      coverImages: undefined,
      generalInfo: undefined,
      steps,
      emergencyContacts: undefined,
      thankYouMessage: undefined,
    };
  } catch (error) {
    console.warn('[pdfBookletService] Fallback minimal pdf data due to error:', error);
    return {
      tripTitle: 'Carnet de voyage',
      steps: [],
    } as PDFBookletData;
  }
}
