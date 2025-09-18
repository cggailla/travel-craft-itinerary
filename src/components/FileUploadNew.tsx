import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, Image, X, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { uploadDocument, processDocument, deleteTrip } from '@/services/documentService';
import { useToast } from '@/hooks/use-toast';

interface UploadedFile {
  file: File;
  id?: string;
  status: 'uploading' | 'uploaded' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  documentId?: string;
}

interface FileUploadNewProps {
  onFilesProcessed: (documentIds: string[], tripId?: string) => void;
  onProcessingUpdate: (processing: boolean) => void;
}

export default function FileUploadNew({ onFilesProcessed, onProcessingUpdate }: FileUploadNewProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);
  const { toast } = useToast();

  // Cleanup incomplete trip on component unmount
  useEffect(() => {
    return () => {
      if (currentTripId && uploadedFiles.length > 0 && !uploadedFiles.some(f => f.status === 'completed')) {
        // Cleanup incomplete trip in background
        deleteTrip(currentTripId).catch(console.error);
      }
    };
  }, [currentTripId, uploadedFiles]);

  const startNewTrip = () => {
    setUploadedFiles([]);
    setCurrentTripId(null);
    toast({
      title: "Nouveau voyage",
      description: "Prêt à créer un nouveau carnet de voyage",
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      file,
      status: 'uploading',
      progress: 0
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
    
    // Upload files sequentially
    for (let i = 0; i < newFiles.length; i++) {
      const fileIndex = uploadedFiles.length + i;
      
      try {
        // Update progress during upload
        setUploadedFiles(prev => prev.map((f, idx) => 
          idx === fileIndex ? { ...f, progress: 50 } : f
        ));

        const result = await uploadDocument(newFiles[i].file, currentTripId);
        
        if (result.success && result.document_id) {
          // Store trip ID if this is the first file
          if (!currentTripId && result.trip_id) {
            setCurrentTripId(result.trip_id);
          }
          
          setUploadedFiles(prev => prev.map((f, idx) => 
            idx === fileIndex ? { 
              ...f, 
              status: 'uploaded', 
              progress: 100,
              documentId: result.document_id 
            } : f
          ));
        } else {
          throw new Error(result.error || 'Upload failed');
        }
      } catch (error) {
        console.error('Upload error:', error);
        setUploadedFiles(prev => prev.map((f, idx) => 
          idx === fileIndex ? { 
            ...f, 
            status: 'error', 
            progress: 100,
            error: error instanceof Error ? error.message : 'Upload failed'
          } : f
        ));
        
        toast({
          title: "Erreur d'upload",
          description: `Impossible d'uploader ${newFiles[i].file.name}`,
          variant: "destructive",
        });
      }
    }
  }, [uploadedFiles.length, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.tiff']
    },
    multiple: true,
    maxSize: 20 * 1024 * 1024 // 20MB
  });

  const startProcessing = async () => {
    const documentIds = uploadedFiles
      .filter(f => f.status === 'uploaded' && f.documentId)
      .map(f => f.documentId!);

    if (documentIds.length === 0) {
      toast({
        title: "Aucun document à traiter",
        description: "Veuillez d'abord uploader des documents",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    onProcessingUpdate(true);

    try {
      // Process each document
      for (let i = 0; i < documentIds.length; i++) {
        const documentId = documentIds[i];
        
        // Update status to processing
        setUploadedFiles(prev => prev.map(f => 
          f.documentId === documentId ? { ...f, status: 'processing' } : f
        ));

        try {
          const result = await processDocument(documentId);
          
          if (result.success) {
            setUploadedFiles(prev => prev.map(f => 
              f.documentId === documentId ? { ...f, status: 'completed' } : f
            ));
          } else {
            throw new Error(result.error || 'Processing failed');
          }
        } catch (error) {
          console.error('Processing error:', error);
          setUploadedFiles(prev => prev.map(f => 
            f.documentId === documentId ? { 
              ...f, 
              status: 'error',
              error: error instanceof Error ? error.message : 'Processing failed'
            } : f
          ));
        }
      }

      // Notify parent of completed processing
      const completedDocuments = uploadedFiles
        .filter(f => f.status === 'completed' && f.documentId)
        .map(f => f.documentId!);
      
      onFilesProcessed(completedDocuments, currentTripId);
      
      toast({
        title: "Traitement terminé",
        description: `${completedDocuments.length} documents traités avec succès`,
      });
      
    } finally {
      setIsProcessing(false);
      onProcessingUpdate(false);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = async () => {
    // If there's an active trip that hasn't been validated, delete it
    if (currentTripId) {
      try {
        await deleteTrip(currentTripId);
        toast({
          title: "Voyage annulé",
          description: "Le voyage en cours a été supprimé",
        });
      } catch (error) {
        console.error('Error deleting incomplete trip:', error);
      }
    }
    setUploadedFiles([]);
    setCurrentTripId(null);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-4 w-4 text-accent" />;
    }
    return <FileText className="h-4 w-4 text-primary" />;
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-secondary" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const readyToProcess = uploadedFiles.some(f => f.status === 'uploaded');
  const hasCompletedFiles = uploadedFiles.some(f => f.status === 'completed');

  return (
    <div className="space-y-6">
      <Card className="border-2 border-dashed border-border hover:border-primary transition-colors">
        <CardContent className="p-8">
          <div
            {...getRootProps()}
            className={`cursor-pointer text-center space-y-4 ${
              isDragActive ? 'opacity-75' : ''
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <p className="text-lg font-medium text-foreground">
                {isDragActive
                  ? 'Déposez les fichiers ici...'
                  : 'Glissez-déposez vos documents de voyage'}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                PDF, PNG, JPG, TIFF - Maximum 20MB par fichier
              </p>
            </div>
            <Button variant="outline" type="button" className="mt-4">
              Parcourir les fichiers
            </Button>
          </div>
        </CardContent>
      </Card>

      {uploadedFiles.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-foreground">
                  Fichiers uploadés ({uploadedFiles.length})
                </h3>
                {currentTripId && (
                  <Badge variant="outline" className="text-xs">
                    Voyage: {currentTripId.slice(-8)}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {readyToProcess && (
                  <Button 
                    onClick={startProcessing} 
                    disabled={isProcessing}
                    className="bg-primary hover:bg-primary-hover"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Traitement...
                      </>
                    ) : (
                      'Commencer le traitement'
                    )}
                  </Button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <Button variant="outline" onClick={startNewTrip} size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Nouveau voyage
                  </Button>
                  <Button variant="outline" onClick={clearAll} size="sm">
                    <X className="h-4 w-4 mr-2" />
                    Tout effacer
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {uploadedFiles.map((uploadedFile, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-4 p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    {getFileIcon(uploadedFile.file)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {uploadedFile.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(uploadedFile.file.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 w-32">
                    {uploadedFile.status === 'uploading' || uploadedFile.status === 'processing' ? (
                      <Progress value={uploadedFile.progress} className="flex-1" />
                    ) : (
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(uploadedFile.status)}
                        <span className="text-xs text-muted-foreground capitalize">
                          {uploadedFile.status === 'uploaded' ? 'Prêt' : 
                           uploadedFile.status === 'completed' ? 'Traité' :
                           uploadedFile.status === 'error' ? 'Erreur' : uploadedFile.status}
                        </span>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}