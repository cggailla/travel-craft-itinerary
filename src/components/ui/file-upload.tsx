import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFilesAdded: (files: File[]) => void;
  maxFiles?: number;
  accept?: Record<string, string[]>;
  className?: string;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFilesAdded,
  maxFiles = 10,
  accept = {
    'application/pdf': ['.pdf'],
    'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
  },
  className,
  disabled = false,
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = [...uploadedFiles, ...acceptedFiles].slice(0, maxFiles);
    setUploadedFiles(newFiles);
    onFilesAdded(acceptedFiles);
  }, [uploadedFiles, maxFiles, onFilesAdded]);

  const removeFile = (fileToRemove: File) => {
    const newFiles = uploadedFiles.filter(file => file !== fileToRemove);
    setUploadedFiles(newFiles);
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    disabled,
    multiple: true,
  });

  return (
    <div className={cn('w-full space-y-4', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300',
          'hover:border-primary hover:bg-primary/5',
          isDragActive && 'border-primary bg-primary/10 scale-105',
          isDragReject && 'border-destructive bg-destructive/10',
          disabled && 'cursor-not-allowed opacity-50',
          'bg-gradient-to-br from-travel-sky/20 to-primary/10'
        )}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              {isDragActive ? 'Déposez vos documents ici' : 'Glissez-déposez vos documents de voyage'}
            </h3>
            <p className="text-muted-foreground">
              Billets d'avion, réservations d'hôtel, vouchers d'activités...
            </p>
            <p className="text-sm text-muted-foreground">
              PDF, JPG, PNG acceptés • Maximum {maxFiles} fichiers
            </p>
          </div>
          
          <button
            type="button"
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors"
            disabled={disabled}
          >
            Parcourir les fichiers
          </button>
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-foreground">Documents sélectionnés :</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-card border border-border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <File className="w-5 h-5 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => removeFile(file)}
                  className="p-1 hover:bg-destructive/10 rounded-full transition-colors"
                  disabled={disabled}
                >
                  <X className="w-4 h-4 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};