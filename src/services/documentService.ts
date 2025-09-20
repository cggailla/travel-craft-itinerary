import { supabase } from '@/integrations/supabase/client'

// Supabase configuration
const SUPABASE_URL = "https://jjlhsikgczigvtdzfroa.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqbGhzaWtnY3ppZ3Z0ZHpmcm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxODQ3ODIsImV4cCI6MjA3Mzc2MDc4Mn0.RFZ7mWCxgJpy-tJt5HudvjcHnX3Hoa2HEIcqvV8uHvo"

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
 * Create a new trip
 */
export async function createTrip(): Promise<{ success: boolean; trip_id?: string; error?: string }> {
  try {
    // Use direct SQL query since trips table might not be in generated types
    const response = await fetch(`${SUPABASE_URL}/rest/v1/trips`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        title: 'Nouveau carnet de voyage',
        status: 'draft'
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to create trip: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const trip = Array.isArray(data) ? data[0] : data

    return {
      success: true,
      trip_id: trip.id
    }
  } catch (error) {
    console.error('Create trip error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create trip'
    }
  }
}

/**
 * Upload a document to the backend for processing
 */
export async function uploadDocument(file: File, tripId: string | null = null): Promise<DocumentUploadResult> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    if (tripId) {
      formData.append('trip_id', tripId)
    }

    // Use fetch directly for file uploads to avoid Supabase JS issues with FormData
    const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-document`, {
      method: 'POST',
      body: formData
    })

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