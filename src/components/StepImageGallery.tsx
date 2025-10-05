import React, { useState, useRef, useCallback } from 'react';
import { Plus, X, Loader2, Upload } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  uploadImageToSupabase, 
  deleteImageFromSupabase, 
  SupabaseImage 
} from '@/services/supabaseImageService';

interface StepImageGalleryProps {
  tripId: string;
  stepId: string;
  images: SupabaseImage[];
  onImagesChange: () => void;
}

export function StepImageGallery({ tripId, stepId, images, onImagesChange }: StepImageGalleryProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFileUpload(files[0]);
    }
  }, [tripId, stepId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner une image',
        variant: 'destructive'
      });
      return;
    }

    setIsUploading(true);

    const result = await uploadImageToSupabase({
      file,
      tripId,
      imageType: 'step',
      position: images.length + 1,
      stepId
    });

    setIsUploading(false);

    if (result.success && result.data) {
      onImagesChange();
    } else {
      toast({
        title: 'Erreur d\'upload',
        description: result.error || 'Une erreur est survenue',
        variant: 'destructive'
      });
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (storagePath: string) => {
    setDeletingPath(storagePath);

    const result = await deleteImageFromSupabase(storagePath);

    setDeletingPath(null);

    if (result.success) {
      onImagesChange();
    } else {
      toast({
        title: 'Erreur',
        description: result.error || 'Impossible de supprimer l\'image',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-0 mt-4 w-full" data-upload-zone="step-images">
      {/* Display uploaded images - minimal style, natural size */}
      {images.map((image) => (
        <div key={image.storage_path} className="relative w-full group cursor-pointer" onClick={() => handleDelete(image.storage_path)} data-has-image="true">
          <img
            src={image.public_url}
            alt="Image d'étape"
            className="w-full h-auto object-contain"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex items-center justify-center">
            {deletingPath === image.storage_path ? (
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            ) : (
              <X className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        </div>
      ))}

      {/* Add image zone - minimal drop zone with fixed height */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        id={`step-image-upload-${stepId}`}
      />
      
      <label
        htmlFor={`step-image-upload-${stepId}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-has-image="false"
        className={`
          no-print h-48 w-full flex items-center justify-center cursor-pointer
          border-2 border-dashed transition-all
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'}
          ${isUploading ? 'opacity-50 pointer-events-none' : 'hover:border-gray-400 hover:bg-gray-100'}
        `}
      >
        {isUploading ? (
          <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
        ) : (
          <Plus className="h-8 w-8 text-gray-400" />
        )}
      </label>
    </div>
  );
}

