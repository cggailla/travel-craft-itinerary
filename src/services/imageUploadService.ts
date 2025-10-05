// LOCAL IMAGE MANAGEMENT - No Supabase Storage required
// Images are stored as base64 in localStorage for persistence across sessions

export interface TripImage {
  public_url: string; // base64 data URL or blob URL
  storage_path: string; // local identifier
  file_name: string;
}

export interface UploadImageParams {
  file: File;
  tripId: string;
  stepId?: string;
  imageType: 'cover' | 'step';
  position?: number; // For cover images only (1 or 2)
}

/**
 * Convert File to base64 data URL
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Get localStorage key for images
 */
function getStorageKey(tripId: string, stepId?: string, imageType?: string): string {
  if (imageType === 'cover') {
    return `trip_images_${tripId}_covers`;
  } else if (stepId) {
    return `trip_images_${tripId}_step_${stepId}`;
  }
  return `trip_images_${tripId}`;
}

/**
 * Upload an image (store locally as base64)
 */
export async function uploadTripImage(params: UploadImageParams): Promise<{ success: boolean; data?: TripImage; error?: string }> {
  try {
    const { file, tripId, stepId, imageType, position } = params;
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Le fichier doit être une image' };
    }
    
    // Max 5MB for localStorage (base64 is larger than binary)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return { success: false, error: 'L\'image ne doit pas dépasser 5MB' };
    }

    console.log('📤 Converting image to base64...');

    // Convert to base64
    const base64Data = await fileToBase64(file);

    // Generate local identifier
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop() || 'jpg';
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    let storagePath: string;
    if (imageType === 'cover') {
      storagePath = `${tripId}/cover-${position || 1}`;
    } else {
      storagePath = `${tripId}/steps/${stepId}/image-${timestamp}`;
    }

    const imageData: TripImage = {
      public_url: base64Data,
      storage_path: storagePath,
      file_name: sanitizedFileName
    };

    // Store in localStorage
    const storageKey = getStorageKey(tripId, stepId, imageType);
    const existingData = localStorage.getItem(storageKey);
    let images: TripImage[] = existingData ? JSON.parse(existingData) : [];

    if (imageType === 'cover' && position) {
      // Replace cover image at specific position
      images = images.filter(img => !img.storage_path.includes(`cover-${position}`));
      images.push(imageData);
    } else {
      // Add new step image
      images.push(imageData);
    }

    localStorage.setItem(storageKey, JSON.stringify(images));
    
    console.log('✅ Image stored locally:', storagePath);

    return { 
      success: true, 
      data: imageData
    };

  } catch (error) {
    console.error('💥 Unexpected error in uploadTripImage:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    };
  }
}

/**
 * Get cover images for a trip (returns URLs for position 1 and 2)
 */
export async function getCoverImages(tripId: string): Promise<{ cover1?: string; cover2?: string }> {
  try {
    const storageKey = getStorageKey(tripId, undefined, 'cover');
    const data = localStorage.getItem(storageKey);
    
    if (!data) {
      return {};
    }

    const images: TripImage[] = JSON.parse(data);
    const result: { cover1?: string; cover2?: string } = {};

    const cover1 = images.find(img => img.storage_path.includes('cover-1'));
    const cover2 = images.find(img => img.storage_path.includes('cover-2'));

    if (cover1) result.cover1 = cover1.public_url;
    if (cover2) result.cover2 = cover2.public_url;

    return result;
  } catch (error) {
    console.error('💥 Error getting cover images:', error);
    return {};
  }
}

/**
 * Get all images for a specific step
 */
export async function getStepImages(tripId: string, stepId: string): Promise<TripImage[]> {
  try {
    const storageKey = getStorageKey(tripId, stepId);
    const data = localStorage.getItem(storageKey);
    
    if (!data) {
      return [];
    }

    return JSON.parse(data);
  } catch (error) {
    console.error('💥 Unexpected error in getStepImages:', error);
    return [];
  }
}

/**
 * Delete an image from local storage
 */
export async function deleteTripImage(storagePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Parse storage path to get tripId, stepId, and image type
    const parts = storagePath.split('/');
    const tripId = parts[0];
    const isCover = storagePath.includes('cover-');
    const stepId = !isCover && parts.length > 2 ? parts[2] : undefined;

    const storageKey = getStorageKey(tripId, stepId, isCover ? 'cover' : 'step');
    const data = localStorage.getItem(storageKey);
    
    if (!data) {
      return { success: false, error: 'Image introuvable' };
    }

    let images: TripImage[] = JSON.parse(data);
    images = images.filter(img => img.storage_path !== storagePath);
    
    localStorage.setItem(storageKey, JSON.stringify(images));

    console.log('✅ Image deleted successfully');
    return { success: true };

  } catch (error) {
    console.error('💥 Unexpected error in deleteTripImage:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    };
  }
}
