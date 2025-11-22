import React, { useRef, useState, useCallback } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  uploadImageToSupabase, 
  deleteImageFromSupabase, 
  SupabaseImage 
} from '@/services/supabaseImageService';

interface ImageUploaderProps {
  tripId: string;
  stepId?: string;
  imageType: 'cover' | 'step' | 'quote' | 'quote-step' | 'quote-pricing';
  position?: number;
  currentImage?: SupabaseImage;
  onImageUploaded?: (image: SupabaseImage) => void;
  onImageDeleted?: () => void;
  label?: string;
  className?: string;
  height?: string;
}

export function ImageUploader({
  tripId,
  stepId,
  imageType,
  position,
  currentImage,
  onImageUploaded,
  onImageDeleted,
  label,
  className = '',
  height = 'h-80'
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
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
  }, [tripId, stepId, imageType, position]);

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
      imageType,
      position,
      stepId
    });

    setIsUploading(false);

    if (result.success && result.data) {
      onImageUploaded?.(result.data);
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

  const handleDelete = async () => {
    if (!currentImage) return;

    const result = await deleteImageFromSupabase(currentImage.storage_path);

    if (result.success) {
      onImageDeleted?.();
    } else {
      toast({
        title: 'Erreur',
        description: result.error || 'Impossible de supprimer',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className={`no-print w-full ${className}`} data-has-image={currentImage ? "true" : "false"}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        id={`file-upload-${imageType}-${position || stepId || 'default'}`}
      />
      
      {currentImage ? (
        // Image uploaded - show image with delete on hover
        <div 
          className="relative group w-full cursor-pointer"
          onClick={handleDelete}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <img
            src={currentImage.public_url}
            alt="Image uploadée"
            className={`w-full object-cover ${height}`}
            onError={(e) => {
              console.error('❌ Échec du chargement de l\'image:', currentImage.public_url, e);
              // fallback to placeholder
              const target = e.currentTarget as HTMLImageElement;
              target.src = '/placeholder.svg';
            }}
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex items-center justify-center">
            <X className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      ) : (
        // Drop zone
        <label
          htmlFor={`file-upload-${imageType}-${position || stepId || 'default'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            ${height} w-full flex items-center justify-center cursor-pointer
            border-2 border-dashed transition-all
            ${isDragging ? 'border-primary bg-primary/10' : 'border-border bg-muted/30'}
            ${isUploading ? 'opacity-50 pointer-events-none' : 'hover:border-primary/50 hover:bg-muted/50'}
          `}
        >
          {isUploading ? (
            <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
          ) : (
            <Upload className="h-10 w-10 text-muted-foreground" />
          )}
        </label>
      )}
    </div>
  );
}

