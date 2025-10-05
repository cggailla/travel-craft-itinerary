/**
 * Composant de test pour l'upload Supabase Storage
 * À utiliser pour valider le système avant de migrer toutes les zones
 */

import React, { useRef, useState, useCallback } from 'react';
import { Upload, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  uploadImageToSupabase, 
  deleteImageFromSupabase, 
  SupabaseImage,
  getOrCreateSessionId 
} from '@/services/supabaseImageService';
import { Badge } from '@/components/ui/badge';

interface TestSupabaseUploaderProps {
  tripId: string;
}

export function TestSupabaseUploader({ tripId }: TestSupabaseUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [currentImage, setCurrentImage] = useState<SupabaseImage | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const sessionId = getOrCreateSessionId();

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
  }, [tripId]);

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
    setUploadStatus('idle');

    const result = await uploadImageToSupabase({
      file,
      tripId,
      imageType: 'test',
      position: 1
    });

    setIsUploading(false);

    if (result.success && result.data) {
      setCurrentImage(result.data);
      setUploadStatus('success');
      toast({
        title: '✅ Upload Supabase réussi !',
        description: `Image uploadée vers le bucket`,
      });
    } else {
      setUploadStatus('error');
      toast({
        title: '❌ Erreur d\'upload',
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
      setCurrentImage(null);
      setUploadStatus('idle');
      toast({
        title: 'Image supprimée',
        description: 'L\'image a été supprimée du bucket Supabase',
      });
    } else {
      toast({
        title: 'Erreur',
        description: result.error || 'Impossible de supprimer',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="border-4 border-dashed border-purple-300 bg-purple-50 p-6 rounded-lg space-y-4">
      {/* Header de test */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-purple-900">
              🧪 Zone de test - Supabase Storage
            </h3>
            {uploadStatus === 'success' && (
              <CheckCircle className="h-5 w-5 text-green-600" />
            )}
            {uploadStatus === 'error' && (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
          </div>
          <p className="text-sm text-purple-700">
            Cette zone teste l'upload vers Supabase avec gestion de session
          </p>
        </div>
        <Badge variant="outline" className="bg-white">
          Session: {sessionId.slice(0, 20)}...
        </Badge>
      </div>

      {/* Info technique */}
      <div className="bg-white rounded p-3 text-xs text-gray-600 space-y-1">
        <p><strong>📁 Bucket:</strong> trip-images</p>
        <p><strong>🔑 Chemin:</strong> {sessionId}/{tripId}/test_1.jpg</p>
        <p><strong>♻️ Nettoyage:</strong> Auto à chaque nouvelle session</p>
      </div>

      {/* Zone d'upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        id="test-supabase-upload"
      />
      
      {currentImage ? (
        // Image uploadée
        <div 
          className="relative group w-full cursor-pointer rounded overflow-hidden"
          onClick={handleDelete}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <img
            src={currentImage.public_url}
            alt="Test Supabase"
            className="w-full h-auto object-contain max-h-96"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-70 transition-all flex flex-col items-center justify-center">
            <X className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            <p className="text-white opacity-0 group-hover:opacity-100 transition-opacity mt-2">
              Cliquer pour supprimer
            </p>
          </div>
          
          {/* Badge de succès */}
          <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Uploadé sur Supabase
          </div>
        </div>
      ) : (
        // Zone de drop
        <label
          htmlFor="test-supabase-upload"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            min-h-[300px] w-full flex flex-col items-center justify-center cursor-pointer
            border-2 border-dashed rounded-lg transition-all
            ${isDragging ? 'border-purple-500 bg-purple-100' : 'border-purple-300 bg-white'}
            ${isUploading ? 'opacity-50 pointer-events-none' : 'hover:border-purple-400 hover:bg-purple-50'}
          `}
        >
          {isUploading ? (
            <div className="text-center space-y-3">
              <Loader2 className="h-12 w-12 text-purple-500 animate-spin mx-auto" />
              <p className="text-purple-700 font-medium">Upload vers Supabase...</p>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <Upload className="h-12 w-12 text-purple-400 mx-auto" />
              <div>
                <p className="text-purple-900 font-medium">
                  Glissez une image ici
                </p>
                <p className="text-purple-600 text-sm mt-1">
                  ou cliquez pour sélectionner (max 10 MB)
                </p>
              </div>
            </div>
          )}
        </label>
      )}

      {/* Debug info */}
      {currentImage && (
        <div className="bg-gray-100 rounded p-3 text-xs space-y-1 font-mono">
          <p className="text-gray-700"><strong>URL:</strong></p>
          <p className="text-gray-600 break-all">{currentImage.public_url}</p>
          <p className="text-gray-700 mt-2"><strong>Storage Path:</strong></p>
          <p className="text-gray-600 break-all">{currentImage.storage_path}</p>
        </div>
      )}
    </div>
  );
}
