import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

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
import { createTrip } from '@/services/documentService';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

type AppPhase = 'create-trip' | 'upload' | 'processing' | 'timeline' | 'validated';

interface PhaseConfig {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const phases: Record<AppPhase, PhaseConfig> = {
  'create-trip': {
    title: 'Nouveau voyage',
    description: 'Créer votre carnet de voyage',
    icon: <Settings className="h-5 w-5" />,
    color: 'bg-muted'
  },
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
  const [currentPhase, setCurrentPhase] = useState<AppPhase>('create-trip');
  const [processedDocuments, setProcessedDocuments] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tripId, setTripId] = useState<string | null>(null);
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [isLoadingLatestTrip, setIsLoadingLatestTrip] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadLatestTrip = async () => {
    setIsLoadingLatestTrip(true);
    try {
      const { data: trips, error } = await supabase
        .from('trips')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (trips && trips.length > 0) {
        const latestTripId = trips[0].id;
        navigate(`/booklet?tripId=${latestTripId}`);
        toast({
          title: "Mode Dev activé",
          description: "Redirection vers le dernier voyage créé",
        });
      } else {
        toast({
          title: "Aucun voyage trouvé",
          description: "Créez d'abord un voyage pour utiliser le mode dev",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to load latest trip:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le dernier voyage",
        variant: "destructive",
      });
    } finally {
      setIsLoadingLatestTrip(false);
    }
  };

  const createNewTrip = async () => {
    setIsCreatingTrip(true);
    try {
      const result = await createTrip();
      if (result.success && result.trip_id) {
        setTripId(result.trip_id);
        setCurrentPhase('upload');
        console.log('New trip created:', result.trip_id);
        
        toast({
          title: "Voyage créé",
          description: "Vous pouvez maintenant uploader vos documents",
        });
      } else {
        throw new Error(result.error || 'Failed to create trip');
      }
    } catch (error) {
      console.error('Failed to create trip:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le voyage",
        variant: "destructive",
      });
    } finally {
      setIsCreatingTrip(false);
    }
  };

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
    setCurrentPhase('create-trip');
    setProcessedDocuments([]);
    setIsProcessing(false);
    setTripId(null);
  };

  const getPhaseProgress = (): number => {
    const phaseOrder: AppPhase[] = ['create-trip', 'upload', 'processing', 'timeline', 'validated'];
    const currentIndex = phaseOrder.indexOf(currentPhase);
    return ((currentIndex + 1) / phaseOrder.length) * 100;
  };

  const isPhaseCompleted = (phase: AppPhase): boolean => {
    const phaseOrder: AppPhase[] = ['create-trip', 'upload', 'processing', 'timeline', 'validated'];
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
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
            Transformez vos documents de voyage en carnet organisé grâce à l'intelligence artificielle
          </p>
          
          {/* Mode Dev Button */}
          <div className="flex justify-center">
            <Button 
              onClick={loadLatestTrip}
              disabled={isLoadingLatestTrip}
              variant="outline"
              size="sm"
              className="bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100"
            >
              {isLoadingLatestTrip ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Chargement...
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4 mr-2" />
                  Mode Dev - Charger dernier voyage
                </>
              )}
            </Button>
          </div>
        </header>


        {/* Phase Content */}
        <div className="space-y-8">
          {currentPhase === 'create-trip' && (
            <div className="space-y-6">
              <Card className="border-2 border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>Créer un nouveau voyage</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center py-8">
                  <div className="space-y-4">
                    <p className="text-lg text-muted-foreground">
                      Commencez par créer votre carnet de voyage
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Tous vos documents seront organisés dans ce carnet
                    </p>
                    <Button 
                      onClick={createNewTrip} 
                      disabled={isCreatingTrip}
                      size="lg"
                      className="mt-6"
                    >
                      {isCreatingTrip ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Création en cours...
                        </>
                      ) : (
                        <>
                          <Settings className="h-4 w-4 mr-2" />
                          Créer un nouveau voyage
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

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
                    tripId={tripId}
                  />
                </CardContent>
              </Card>
            </div>
          )}


          {(currentPhase === 'timeline' || currentPhase === 'validated') && (
            <div className="space-y-6">
              <TravelTimelineNew
                documentIds={processedDocuments}
                onValidated={handleValidated}
                tripId={tripId}
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
                     <div className="flex flex-wrap gap-4">
                       <Link to={`/booklet?tripId=${tripId}`}>
                         <Button className="flex items-center">
                           <FileText className="h-4 w-4 mr-2" />
                           Générer le carnet
                         </Button>
                       </Link>
                       <Button
                         onClick={resetApp}
                         variant="outline"
                       >
                         <RefreshCw className="h-4 w-4 mr-2" />
                         Nouveau carnet
                       </Button>
                     </div>
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