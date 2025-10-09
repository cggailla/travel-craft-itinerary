import { supabase } from '@/integrations/supabase/client'
import { requireAuth, getCurrentUserId } from '@/utils/authHelpers'
import type { Database } from '@/integrations/supabase/types'

// Supabase configuration
const SUPABASE_URL = "https://jjlhsikgczigvtdzfroa.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqbGhzaWtnY3ppZ3Z0ZHpmcm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxODQ3ODIsImV4cCI6MjA3Mzc2MDc4Mn0.RFZ7mWCxgJpy-tJt5HudvjcHnX3Hoa2HEIcqvV8uHvo"

export type Document = Database['public']['Tables']['documents']['Row'];
export type DocumentInsert = Database['public']['Tables']['documents']['Insert'];

export interface DocumentUploadResult {
  success: boolean
  document_id?: string
  job_id?: string
  error?: string
}

export interface ProcessingResult {
  success: boolean
  document_id?: string
  segment_id?: string
  extracted_data?: any
  error?: string
}

export interface TravelSegmentResponse {
  success: boolean
  segments: any[]
  timeline: { date: string; segments: any[] }[]
  undated_segments?: any[]
  total_count: number
  error?: string
}

/**
 * 🔐 NIVEAU 2 : Create a new trip (avec vérification auth)
 */
export async function createTrip(): Promise<{ success: boolean; trip_id?: string; error?: string }> {
  try {
    console.log('🔐 [NIVEAU 2] Vérification authentification pour création trip...');
    
    // ✅ NIVEAU 2 : Get current user session ID for secure access
    const userId = await requireAuth();
    console.log('✅ [NIVEAU 2] User authentifié:', userId);
    
    // ✅ NIVEAU 2 : Use Supabase client for better RLS handling
    const { data, error } = await supabase
      .from('trips')
      .insert({
        title: 'Nouveau carnet de voyage',
        status: 'draft',
        user_id: userId // ✅ NIVEAU 2 : Lié à l'utilisateur
      })
      .select()
      .single();
    // ✅ NIVEAU 3 : RLS vérifie que auth.uid() = user_id

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Failed to create trip: ${error.message}`);
    }

    return {
      success: true,
      trip_id: data.id
    };
  } catch (error) {
    console.error('Create trip error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create trip'
    };
  }
}

/**
 * 🔐 NIVEAU 2 : Upload a document to the backend for processing (avec vérification auth)
 */
export async function uploadDocument(file: File, tripId: string | null = null): Promise<DocumentUploadResult> {
  try {
    console.log('🔐 [NIVEAU 2] Vérification authentification pour upload document...');
    
    // ✅ NIVEAU 2 : Get current user session ID for secure access
    const userId = await requireAuth();
    console.log('✅ [NIVEAU 2] User authentifié:', userId);
    
    const formData = new FormData()
    formData.append('file', file)
    formData.append('user_id', userId) // ✅ NIVEAU 2 : Lié à l'utilisateur
    if (tripId) {
      formData.append('trip_id', tripId)
    }

    // ✅ NIVEAU 2 : Use fetch directly for file uploads to avoid Supabase JS issues with FormData
    const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-document`, {
      method: 'POST',
      body: formData
    })
    // ✅ NIVEAU 3 : Edge function vérifie auth via JWT

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Upload failed: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    return data as DocumentUploadResult
  } catch (error) {
    console.error('Upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

// Extract text via OCR
export const extractText = async (documentId: string): Promise<{ success: boolean; error?: string; ocrText?: string; confidence?: number }> => {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/extract-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ document_id: documentId })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to extract text')
    }

    const data = await response.json()
    return {
      success: data.success,
      ocrText: data.ocr_text,
      confidence: data.ocr_confidence
    }
  } catch (error) {
    console.error('Error extracting text:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Process a document using OCR and AI
 */
export async function processDocument(documentId: string): Promise<ProcessingResult> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/process-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ document_id: documentId })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Processing failed: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    return data as ProcessingResult
  } catch (error) {
    console.error('Process error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Processing failed'
    }
  }
}

/**
 * Get travel segments with optional filtering
 */
export async function getTravelSegments(
  tripId?: string | null,
  status?: 'all' | 'validated' | 'unvalidated'
): Promise<TravelSegmentResponse> {
  try {
    const params = new URLSearchParams()
    if (tripId) params.append('trip_id', tripId)
    if (status) params.append('status', status)

    const url = `${SUPABASE_URL}/functions/v1/get-travel-segments${params.toString() ? `?${params.toString()}` : ''}`
    
    const response = await fetch(url, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to fetch segments: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    return data as TravelSegmentResponse
  } catch (error) {
    console.error('Get segments error:', error)
    return {
      success: false,
      segments: [],
      timeline: [],
      total_count: 0,
      error: error instanceof Error ? error.message : 'Failed to fetch segments'
    }
  }
}

/**
 * Validate multiple travel segments
 */
export async function validateSegments(segmentIds: string[], tripId: string | null = null): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-segments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ segment_ids: segmentIds, trip_id: tripId })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Validation failed: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Validate segments error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Validation failed'
    }
  }
}

/**
 * Get processing status for documents
 */
export async function getProcessingStatus(documentIds: string[]): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('document_processing_jobs')
      .select('document_id, status, error_message')
      .in('document_id', documentIds)

    if (error) {
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Get processing status error:', error)
    return []
  }
}