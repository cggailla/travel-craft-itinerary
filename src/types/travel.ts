export type SegmentType = 'flight' | 'hotel' | 'activity' | 'car' | 'other';

export interface TravelSegment {
  id: string;
  type: SegmentType;
  title: string;
  startDate: Date;
  endDate?: Date;
  provider: string;
  reference?: string;
  address?: string;
  description?: string;
  rawData: any;
  confidence: number;
}

export interface TravelTrip {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  segments: TravelSegment[];
  travelers?: string[];
  status: 'draft' | 'validated' | 'completed';
}

export interface ParsedDocument {
  id: string;
  fileName: string;
  fileType: string;
  ocrText: string;
  extractedInfo: Partial<TravelSegment>;
  processingStatus: 'processing' | 'completed' | 'error';
  error?: string;
}

export interface TimelineDay {
  date: Date;
  segments: TravelSegment[];
}