export type SegmentType = 'flight' | 'hotel' | 'activity' | 'car' | 'train' | 'boat' | 'pass' | 'transfer' | 'other';

// Database-aligned types
export interface TravelSegment {
  id: string;
  document_id: string;
  user_id?: string;
  segment_type: SegmentType;
  title: string;
  start_date?: string; // ISO string from database
  end_date?: string; // ISO string from database
  provider?: string;
  reference_number?: string;
  address?: string;
  description?: string;
  confidence: number;
  raw_data?: any;
  validated: boolean;
  enriched?: EnrichedSegmentData; // New enriched data from Perplexity
  created_at: string;
  updated_at: string;
  // Related data
  documents?: {
    id: string;
    file_name: string;
    file_type: string;
    created_at: string;
  };
  document_processing_jobs?: {
    status: string;
    error_message?: string;
  }[];
}

// Enriched data structure for different segment types
export interface EnrichedSegmentData {
  // Common fields
  address?: string;
  phone?: string;
  website?: string;
  description?: string;
  
  // Hotel-specific
  checkin_time?: string;
  checkout_time?: string;
  amenities?: string[];
  star_rating?: number;
  
  // Museum-specific
  opening_hours?: string;
  museum_ticket_price?: string;
  main_exhibitions?: string[];
  
  // Airport-specific
  terminals?: string[];
  facilities?: string[];
  iata_code?: string;
  icao_code?: string;
  
  // Boat-specific
  departure_times?: string[];
  route?: string;
  duration?: string;
  boat_ticket_price?: string;
}

export interface TravelRecommendation {
  id: string;
  step_id: string;
  trip_id: string;
  recommendation_type: 'restaurant' | 'activity' | 'site';
  name: string;
  description?: string;
  address?: string;
  rating?: number;
  price_level?: number; // 1-4 scale
  opening_hours?: string;
  website?: string;
  phone?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  source_data?: any; // raw Perplexity response
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  user_id?: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  created_at: string;
  updated_at: string;
}

export interface ProcessingJob {
  id: string;
  document_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processing_type: 'ocr_only' | 'ai_only' | 'ocr_and_ai';
  ocr_text?: string;
  ocr_confidence?: number;
  ai_extracted_data?: any;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

// Legacy types for compatibility
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