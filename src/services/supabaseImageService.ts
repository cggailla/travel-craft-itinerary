/**
 * Service to manage images with Supabase Storage
 * Simplified for a PUBLIC bucket (no signed URLs, no HEAD checks)
 */

import { supabase } from '@/integrations/supabase/client';
import { requireAuth } from '@/utils/authHelpers';

export interface SupabaseImage {
  storage_path: string;    // Path in the bucket (ex: "userId/trip_xyz/cover_1.jpg")
  public_url: string;      // Publicly accessible image URL
  file_name: string;       // Original file name
  uploaded_at: string;     // Upload timestamp
}

/**
 * Build the storage path inside the bucket
 * Format: {userId}/{tripId}/{imageType}_{position/stepId}.{extension}
 */
function buildStoragePath(
  userId: string,
  tripId: string,
  imageType: 'cover' | 'step' | 'test' | 'quote' | 'quote-step',
  fileName: string,
  position?: number,
  stepId?: string
): string {
  const extension = fileName.split('.').pop();
  
  let baseName: string;
  if (imageType === 'quote') {
    // Image de couverture du devis
    baseName = `quote_cover_${position || Date.now()}.${extension}`;
  } else if (imageType === 'quote-step' && stepId) {
    // Images des étapes du devis
    baseName = `quote_step_${stepId}_${position || Date.now()}.${extension}`;
  } else if (imageType === 'step' && stepId) {
    // Images des étapes du booklet
    baseName = `step_${stepId}_${position || Date.now()}.${extension}`;
  } else if (position !== undefined) {
    baseName = `${imageType}_${position}.${extension}`;
  } else {
    baseName = `${imageType}_${Date.now()}.${extension}`;
  }
  
  return `${userId}/${tripId}/${baseName}`;
}

/**
 * Upload an image to Supabase Storage
 * → Works directly with public bucket
 */
export async function uploadImageToSupabase(params: {
  file: File;
  tripId: string;
  imageType: 'cover' | 'step' | 'test' | 'quote' | 'quote-step';
  position?: number;
  stepId?: string;
}): Promise<{ success: boolean; data?: SupabaseImage; error?: string }> {
  try {
    const { file, tripId, imageType, position, stepId } = params;

    // Verify user authentication
    const userId = await requireAuth();

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'The file must be an image.' };
    }

    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSize) {
      return { success: false, error: 'Image size must not exceed 10 MB.' };
    }

    const storagePath = buildStoragePath(userId, tripId, imageType, file.name, position, stepId);
    console.log('📤 Uploading to Supabase:', storagePath);

    // Upload to Supabase Storage (public bucket)
    const { error: uploadError } = await supabase.storage
      .from('trip-images')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // Directly get public URL (bucket is public)
    const { data: urlData } = supabase.storage
      .from('trip-images')
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

    const image: SupabaseImage = {
      storage_path: storagePath,
      public_url: publicUrl,
      file_name: file.name,
      uploaded_at: new Date().toISOString(),
    };

    console.log('✅ Upload successful:', image);
    return { success: true, data: image };

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Delete an image from Supabase Storage
 */
export async function deleteImageFromSupabase(
  storagePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🗑️ Deleting image:', storagePath);

    const { error } = await supabase.storage
      .from('trip-images')
      .remove([storagePath]);

    if (error) {
      console.error('❌ Delete error:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Delete successful');
    return { success: true };

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Clean up all images of a specific trip for the current user
 * Useful when deleting or resetting a trip
 */
export async function cleanupTripImages(
  tripId: string
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    const userId = await requireAuth();
    const prefix = `${userId}/${tripId}`;

    console.log('🧹 Cleaning images for trip:', prefix);

    const { data: files, error: listError } = await supabase.storage
      .from('trip-images')
      .list(prefix, { limit: 1000, offset: 0 });

    if (listError) {
      console.error('❌ Listing error:', listError);
      return { success: false, deletedCount: 0, error: listError.message };
    }

    if (!files || files.length === 0) {
      console.log('✅ No images to delete');
      return { success: true, deletedCount: 0 };
    }

    const pathsToDelete = files.map(file => `${prefix}/${file.name}`);

    const { error: deleteError } = await supabase.storage
      .from('trip-images')
      .remove(pathsToDelete);

    if (deleteError) {
      console.error('❌ Batch delete error:', deleteError);
      return { success: false, deletedCount: 0, error: deleteError.message };
    }

    console.log(`✅ ${pathsToDelete.length} files deleted`);
    return { success: true, deletedCount: pathsToDelete.length };

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { 
      success: false, 
      deletedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * List all images of a specific trip for the current user
 */
export async function listSessionImages(
  tripId: string
): Promise<{ success: boolean; data?: SupabaseImage[]; error?: string }> {
  try {
    const userId = await requireAuth();
    const prefix = `${userId}/${tripId}`;

    const { data: files, error } = await supabase.storage
      .from('trip-images')
      .list(prefix);

    if (error) {
      console.error('❌ Listing error:', error);
      return { success: false, error: error.message };
    }

    if (!files || files.length === 0) {
      return { success: true, data: [] };
    }

    const images: SupabaseImage[] = files.map(file => {
      const storagePath = `${prefix}/${file.name}`;
      const { data: urlData } = supabase.storage
        .from('trip-images')
        .getPublicUrl(storagePath);

      return {
        storage_path: storagePath,
        public_url: urlData.publicUrl,
        file_name: file.name,
        uploaded_at: file.created_at || new Date().toISOString(),
      };
    });

    return { success: true, data: images };

  } catch (error) {
    console.error('❌ Unexpected error while listing images:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
