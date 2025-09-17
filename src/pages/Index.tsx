import React, { useState } from 'react';
import { Plane, FileText, Calendar, CheckCircle } from 'lucide-react';
import { FileUpload } from '@/components/ui/file-upload';
import { ProcessingTracker } from '@/components/ProcessingTracker';
import { TravelTimeline } from '@/components/TravelTimeline';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { extractTextFromImage, extractTextFromPDF } from '@/services/ocrService';
import { parseDocumentText } from '@/services/travelParser';
import { ParsedDocument, TravelSegment } from '@/types/travel';
import { cn } from '@/lib/utils';

const Index = () => {
  const [documents, setDocuments] = useState<ParsedDocument[]>([]);
  const [segments, setSegments] = useState<TravelSegment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<'upload' | 'processing' | 'timeline' | 'validated'>('upload');
  const { toast } = useToast();

  const handleFilesAdded = (files: File[]) => {
    if (files.length === 0) return;

    const newDocuments: ParsedDocument[] = files.map(file => ({
      id: crypto.randomUUID(),
      fileName: file.name,
      fileType: file.type,
      ocrText: '',
      extractedInfo: {},
      processingStatus: 'processing'
    }));

    setDocuments(prev => [...prev, ...newDocuments]);
    setCurrentPhase('processing');
  };

  const startProcessing = async () => {
    if (documents.length === 0) {
      toast({
        title: "Aucun document",
        description: "Veuillez d'abord ajouter des documents à traiter.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    const newSegments: TravelSegment[] = [];

    for (const doc of documents) {
      try {
        // Simulate file processing with mock data for now
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        let extractedText = '';
        
        if (doc.fileType.startsWith('image/')) {
          // For demo purposes, using mock data
          extractedText = `BOARDING PASS\nFlight: ${doc.fileName.toUpperCase()}\nFrom: Paris CDG (CDG)\nTo: New York JFK (JFK)\nDate: ${new Date().toLocaleDateString()}\nTime: 14:30\nPassenger: John Doe\nSeat: 12A\nConfirmation: ABC123`;
        } else if (doc.fileType === 'application/pdf') {
          // For demo purposes, using mock data
          extractedText = `HOTEL RESERVATION\nHotel: ${doc.fileName}\nCheck-in: ${new Date().toLocaleDateString()}\nCheck-out: ${new Date(Date.now() + 86400000).toLocaleDateString()}\nGuest: John Doe\nRoom: Deluxe Suite\nConfirmation: HTL456`;
        }

        const extractedInfo = parseDocumentText(extractedText, doc.fileName);
        
        const updatedDoc: ParsedDocument = {
          ...doc,
          ocrText: extractedText,
          extractedInfo,
          processingStatus: 'completed'
        };

        setDocuments(prev => prev.map(d => d.id === doc.id ? updatedDoc : d));

        // Create travel segment
        if (extractedInfo.type && extractedInfo.startDate) {
          const segment: TravelSegment = {
            id: crypto.randomUUID(),
            type: extractedInfo.type,
            title: extractedInfo.title || doc.fileName,
            startDate: extractedInfo.startDate,
            endDate: extractedInfo.endDate,
            provider: extractedInfo.provider || 'Unknown',
            reference: extractedInfo.reference,
            address: extractedInfo.address,
            description: extractedInfo.description,
            rawData: { ocrText: extractedText, fileName: doc.fileName },
            confidence: extractedInfo.confidence || 0.5
          };

          newSegments.push(segment);
          setSegments(prev => [...prev, segment]);
        }

        toast({
          title: "Document traité",
          description: `${doc.fileName} a été analysé avec succès.`,
        });

      } catch (error) {
        console.error('Error processing document:', error);
        
        setDocuments(prev => prev.map(d => 
          d.id === doc.id 
            ? { ...d, processingStatus: 'error', error: 'Erreur lors du traitement' }
            : d
        ));

        toast({
          title: "Erreur de traitement",
          description: `Impossible de traiter ${doc.fileName}.`,
          variant: "destructive",
        });
      }
    }

    setIsProcessing(false);
    setCurrentPhase('timeline');

    toast({
      title: "Traitement terminé",
      description: `${newSegments.length} segment(s) de voyage détecté(s).`,
    });
  };

  const handleValidation = () => {
    setCurrentPhase('validated');
    toast({
      title: "Voyage validé !",
      description: "Votre itinéraire de voyage a été validé avec succès.",
    });
  };

  const resetApp = () => {
    setDocuments([]);
    setSegments([]);
    setCurrentPhase('upload');
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-travel-sky/30 via-background to-travel-ocean/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Plane className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground">Travel Booklet Builder</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Transformez vos documents de réservation en itinéraire de voyage organisé. 
            Uploadez, analysez et créez votre carnet de voyage professionnel.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-4 mb-8">
          <div className={cn(
            'flex items-center space-x-2 px-4 py-2 rounded-full transition-all',
            currentPhase === 'upload' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}>
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">Upload</span>
          </div>
          
          <div className={cn(
            'w-8 h-0.5 transition-colors',
            ['processing', 'timeline', 'validated'].includes(currentPhase) ? 'bg-primary' : 'bg-border'
          )} />
          
          <div className={cn(
            'flex items-center space-x-2 px-4 py-2 rounded-full transition-all',
            ['processing', 'timeline', 'validated'].includes(currentPhase) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}>
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">Analyse</span>
          </div>
          
          <div className={cn(
            'w-8 h-0.5 transition-colors',
            ['timeline', 'validated'].includes(currentPhase) ? 'bg-primary' : 'bg-border'
          )} />
          
          <div className={cn(
            'flex items-center space-x-2 px-4 py-2 rounded-full transition-all',
            ['timeline', 'validated'].includes(currentPhase) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}>
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">Itinéraire</span>
          </div>
          
          <div className={cn(
            'w-8 h-0.5 transition-colors',
            currentPhase === 'validated' ? 'bg-secondary' : 'bg-border'
          )} />
          
          <div className={cn(
            'flex items-center space-x-2 px-4 py-2 rounded-full transition-all',
            currentPhase === 'validated' ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'
          )}>
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Validation</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Upload Phase */}
          {currentPhase === 'upload' && (
            <div className="grid grid-cols-1 gap-8">
              <FileUpload
                onFilesAdded={handleFilesAdded}
                className="mx-auto max-w-2xl"
              />
              
              {documents.length > 0 && (
                <div className="text-center">
                  <Button
                    onClick={startProcessing}
                    disabled={isProcessing}
                    size="lg"
                    className="bg-primary hover:bg-primary-hover text-primary-foreground px-8 py-3"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    {isProcessing ? 'Traitement en cours...' : 'Parser les documents'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Processing Phase */}
          {currentPhase === 'processing' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <FileUpload
                onFilesAdded={handleFilesAdded}
                className="lg:max-w-lg"
                disabled={isProcessing}
              />
              
              <ProcessingTracker documents={documents} />
            </div>
          )}

          {/* Timeline Phase */}
          {currentPhase === 'timeline' && (
            <div className="space-y-6">
              <TravelTimeline 
                segments={segments}
                onValidate={handleValidation}
              />
              
              <div className="text-center">
                <Button
                  onClick={resetApp}
                  variant="outline"
                  className="mr-4"
                >
                  Nouveau voyage
                </Button>
              </div>
            </div>
          )}

          {/* Validated Phase */}
          {currentPhase === 'validated' && (
            <div className="text-center space-y-6">
              <div className="p-8 bg-secondary/10 border border-secondary/30 rounded-xl max-w-2xl mx-auto">
                <CheckCircle className="w-16 h-16 text-secondary mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Voyage validé avec succès !
                </h2>
                <p className="text-muted-foreground mb-6">
                  Votre itinéraire de voyage est maintenant prêt. Vous pouvez maintenant 
                  procéder à la génération du carnet de voyage final.
                </p>
                
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    <strong>{segments.length}</strong> étapes planifiées
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>{documents.length}</strong> documents traités
                  </p>
                </div>
              </div>
              
              <div className="space-x-4">
                <Button
                  onClick={resetApp}
                  variant="outline"
                >
                  Nouveau voyage
                </Button>
                <Button disabled className="bg-accent hover:bg-accent-hover text-accent-foreground">
                  Générer le carnet (bientôt disponible)
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;