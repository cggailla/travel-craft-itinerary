import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserMenu } from '@/components/auth/UserMenu';

import { 
  Upload, 
  Cpu, 
  Calendar, 
  CheckCircle, 
  ArrowLeft
} from 'lucide-react';
import FileUploadNew from '@/components/FileUploadNew';
import TravelTimelineNew from '@/components/TravelTimelineNew';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';

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
  const [tripId, setTripId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const params = useParams<{ tripId: string }>();

  // Charger le tripId depuis les paramètres d'URL
  useEffect(() => {
    const urlTripId = params.tripId || searchParams.get('tripId');
    
    if (urlTripId) {
      setTripId(urlTripId);
      loadExistingTripData(urlTripId);
    }
  }, [params.tripId, searchParams]);

  const loadExistingTripData = async (tripId: string) => {
    try {
      // Récupérer les documents associés à ce trip
      const { data: documents, error: docError } = await supabase
        .from('documents')  
        .select('id')
        .eq('trip_id', tripId);

      if (docError) throw docError;

      // Vérifier si le trip est validé
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('status')
        .eq('id', tripId)
        .single();

      if (tripError) throw tripError;

      // Vérifier les segments
      const { data: segments, error: segError } = await supabase
        .from('travel_segments')
        .select('validated')
        .eq('trip_id', tripId);

      if (segError) throw segError;

      // Déterminer la phase actuelle
      if (trip?.status === 'validated') {
        setCurrentPhase('validated');
        toast({
          title: "Voyage validé",
          description: "Carnet prêt à générer",
        });
      } else if (segments && segments.length > 0) {
        setCurrentPhase('timeline');
        const allValidated = segments.every(s => s.validated);
        if (allValidated) {
          toast({
            title: "Voyage en édition",
            description: "Tous les segments sont validés",
          });
        } else {
          toast({
            title: "Voyage en édition",
            description: `${segments.length} segments à vérifier`,
          });
        }
      } else if (documents && documents.length > 0) {
        setCurrentPhase('upload');
        toast({
          title: "Documents trouvés",
          description: `${documents.length} documents en attente de traitement`,
        });
      } else {
        setCurrentPhase('upload');
        toast({
          title: "Nouveau voyage",
          description: "Commencez par uploader vos documents",
        });
      }

      if (documents && documents.length > 0) {
        const docIds = documents.map(doc => doc.id);
        setProcessedDocuments(docIds);
      }
    } catch (error) {
      console.error('Failed to load trip data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du voyage",
        variant: "destructive",
      });
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

  const handleBackToDashboard = () => {
    navigate('/');
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
          <div className="flex items-center justify-center space-x-3 mb-4 relative">
            {/* User Menu - Position absolue en haut à droite */}
            <div className="absolute right-0 top-0">
              <UserMenu />
            </div>
            
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