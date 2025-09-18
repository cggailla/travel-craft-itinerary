import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  Cpu, 
  Calendar, 
  CheckCircle, 
  RefreshCw,
  FileText,
  Settings,
  MapPin
} from 'lucide-react';
import FileUploadNew from '@/components/FileUploadNew';
import TravelTimelineNew from '@/components/TravelTimelineNew';
import { TripManager } from '@/components/TripManager';
import { useToast } from '@/hooks/use-toast';

type AppPhase = 'upload' | 'processing' | 'timeline' | 'validated';

interface PhaseConfig {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const phases: Record<AppPhase, PhaseConfig> = {
  upload: {
    title: 'Upload de documents',
    description: 'Glissez-déposez vos documents de voyage',
    icon: <Upload className="h-5 w-5" />,
    color: 'bg-muted'
  },
  processing: {
    title: 'Traitement IA',
    description: 'Extraction des informations de voyage',
    icon: <Cpu className="h-5 w-5" />,
    color: 'bg-primary'
  },
  timeline: {
    title: 'Chronologie',
    description: 'Visualisation de votre itinéraire',
    icon: <Calendar className="h-5 w-5" />,
    color: 'bg-accent'
  },
  validated: {
    title: 'Validé',
    description: 'Carnet de voyage finalisé',
    icon: <CheckCircle className="h-5 w-5" />,
    color: 'bg-secondary'
  }
};

export default function IndexNew() {
  const [currentPhase, setCurrentPhase] = useState<AppPhase>('upload');
  const [processedDocuments, setProcessedDocuments] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFilesProcessed = (documentIds: string[]) => {
    setProcessedDocuments(prev => [...prev, ...documentIds]);
    setCurrentPhase('timeline');
    
    toast({
      title: "Documents traités",
      description: `${documentIds.length} documents analysés avec succès`,
    });
  };

  const handleValidated = () => {
    setCurrentPhase('validated');
    
    toast({
      title: "Carnet validé",
      description: "Votre carnet de voyage est maintenant finalisé",
    });
  };

  const resetApp = () => {
    setCurrentPhase('upload');
    setProcessedDocuments([]);
    setIsProcessing(false);
  };

  const getPhaseProgress = (): number => {
    const phaseOrder: AppPhase[] = ['upload', 'processing', 'timeline', 'validated'];
    const currentIndex = phaseOrder.indexOf(currentPhase);
    return ((currentIndex + 1) / phaseOrder.length) * 100;
  };

  const isPhaseCompleted = (phase: AppPhase): boolean => {
    const phaseOrder: AppPhase[] = ['upload', 'processing', 'timeline', 'validated'];
    const currentIndex = phaseOrder.indexOf(currentPhase);
    const phaseIndex = phaseOrder.indexOf(phase);
    return phaseIndex < currentIndex || (phase === currentPhase && currentPhase === 'validated');
  };

  const isPhaseActive = (phase: AppPhase): boolean => {
    return phase === currentPhase;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-accent text-white">
              <FileText className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Travel Booklet Builder
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transformez vos documents de voyage en carnet organisé grâce à l'intelligence artificielle
          </p>
        </header>

        {/* Navigation Tabs */}
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Documents
            </TabsTrigger>
            <TabsTrigger value="trips" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Manage Trips
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Travel Timeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="h-5 w-5" />
                  <span>Upload Travel Documents</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FileUploadNew
                  onFilesProcessed={handleFilesProcessed}
                  onProcessingUpdate={setIsProcessing}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trips">
            <TripManager />
          </TabsContent>

          <TabsContent value="timeline">
            <TravelTimelineNew
              documentIds={processedDocuments}
              onValidated={handleValidated}
            />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <footer className="mt-16 text-center text-sm text-muted-foreground">
          <p>
            Propulsé par l'intelligence artificielle • Vos documents restent privés et sécurisés
          </p>
        </footer>
      </div>
    </div>
  );
}