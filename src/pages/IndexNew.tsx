import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  Cpu, 
  Calendar, 
  CheckCircle, 
  RefreshCw,
  FileText,
  Settings
} from 'lucide-react';
import FileUploadNew from '@/components/FileUploadNew';
import TravelTimelineNew from '@/components/TravelTimelineNew';
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

        {/* Progress Bar */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Progression</h3>
                <span className="text-sm text-muted-foreground">
                  {Math.round(getPhaseProgress())}% completé
                </span>
              </div>
              
              <Progress value={getPhaseProgress()} className="h-2" />
              
              {/* Phase Indicators */}
              <div className="flex items-center justify-between">
                {Object.entries(phases).map(([key, phase]) => {
                  const phaseKey = key as AppPhase;
                  const completed = isPhaseCompleted(phaseKey);
                  const active = isPhaseActive(phaseKey);
                  
                  return (
                    <div
                      key={key}
                      className={`flex flex-col items-center space-y-2 p-4 rounded-lg transition-all ${
                        active
                          ? 'bg-primary/10 border-2 border-primary'
                          : completed
                          ? 'bg-secondary/10 border border-secondary'
                          : 'bg-muted border border-transparent'
                      }`}
                    >
                      <div
                        className={`p-3 rounded-full transition-colors ${
                          completed
                            ? 'bg-secondary text-secondary-foreground'
                            : active
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted-foreground/20 text-muted-foreground'
                        }`}
                      >
                        {completed && !active ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          phase.icon
                        )}
                      </div>
                      <div className="text-center">
                        <h4 className="text-sm font-medium text-foreground">
                          {phase.title}
                        </h4>
                        <p className="text-xs text-muted-foreground hidden sm:block">
                          {phase.description}
                        </p>
                      </div>
                      {active && (
                        <Badge variant="default" className="bg-primary">
                          En cours
                        </Badge>
                      )}
                      {completed && !active && (
                        <Badge variant="default" className="bg-secondary">
                          Terminé
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Phase Content */}
        <div className="space-y-8">
          {currentPhase === 'upload' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Upload className="h-5 w-5" />
                    <span>Upload de documents</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FileUploadNew
                    onFilesProcessed={handleFilesProcessed}
                    onProcessingUpdate={setIsProcessing}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {(currentPhase === 'processing' || isProcessing) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Cpu className="h-5 w-5 animate-spin" />
                  <span>Traitement en cours...</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
                    <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
                  </div>
                  <p className="text-muted-foreground mt-4">
                    Extraction des informations de voyage en cours...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {(currentPhase === 'timeline' || currentPhase === 'validated') && (
            <div className="space-y-6">
              <TravelTimelineNew
                documentIds={processedDocuments}
                onValidated={handleValidated}
              />

              {currentPhase === 'validated' && (
                <Card className="border-secondary bg-secondary/5">
                  <CardContent className="p-6 text-center">
                    <CheckCircle className="h-16 w-16 text-secondary mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      Carnet de voyage validé !
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Votre itinéraire est maintenant organisé et prêt à être utilisé.
                    </p>
                    <Button
                      onClick={resetApp}
                      variant="outline"
                      className="mr-4"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Nouveau carnet
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

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