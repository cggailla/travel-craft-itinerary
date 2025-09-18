import { supabase } from '@/integrations/supabase/client'

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
  total_count: number
  error?: string
}

/**
 * Upload a document to the backend for processing
 */
export async function uploadDocument(file: File): Promise<DocumentUploadResult> {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const { data, error } = await supabase.functions.invoke('upload-document', {
      body: formData
    })

    if (error) {
      throw new Error(error.message)
    }

    return data as DocumentUploadResult
  } catch (error) {
    console.error('Upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

/**
 * Process a document using OCR and AI
 */
export async function processDocument(documentId: string): Promise<ProcessingResult> {
  try {
    const { data, error } = await supabase.functions.invoke('process-document', {
      body: { document_id: documentId }
    })

    if (error) {
      throw new Error(error.message)
    }

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
  userId?: string,
  status?: 'all' | 'validated' | 'unvalidated'
): Promise<TravelSegmentResponse> {
  try {
    const params = new URLSearchParams()
    if (userId) params.append('user_id', userId)
    if (status) params.append('status', status)

    const { data, error } = await supabase.functions.invoke(
      `get-travel-segments?${params.toString()}`,
      { method: 'GET' }
    )

    if (error) {
      throw new Error(error.message)
    }

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
export async function validateSegments(segmentIds: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('validate-segments', {
      body: { segment_ids: segmentIds }
    })

    if (error) {
      throw new Error(error.message)
    }

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