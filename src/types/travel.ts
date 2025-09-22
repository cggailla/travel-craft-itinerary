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
  created_at: string;
  updated_at: string;
  // New grouping columns
  segment_group_id?: string;
  is_multi_day?: boolean;
  parent_segment_id?: string;
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