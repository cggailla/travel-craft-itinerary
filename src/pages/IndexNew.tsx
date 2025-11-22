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
import { OutputTypeChoice } from '@/components/OutputTypeChoice';
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
  const [showOutputChoice, setShowOutputChoice] = useState(false);
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

  const handleProcessingUpdate = (processing: boolean) => {
    setIsProcessing(processing);
  };

  const handleValidated = () => {
    setCurrentPhase('validated');
    setShowOutputChoice(true);
    
    toast({
      title: "Voyage validé",
      description: "Choisissez maintenant ce que vous souhaitez générer",
    });
  };

  const handleOutputTypeSelected = async (type: 'quote' | 'booklet') => {
    if (!tripId) return;

    try {
      // Mettre à jour le type de sortie dans la DB
      const { error } = await supabase
        .from('trips')
        .update({ output_type: type })
        .eq('id', tripId);

      if (error) throw error;

      // Rediriger vers la page appropriée
      if (type === 'quote') {
        navigate(`/quote?tripId=${tripId}`);
      } else {
        navigate(`/booklet?tripId=${tripId}`);
      }
    } catch (error) {
      console.error('Error updating output type:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder votre choix",
        variant: "destructive",
      });
    }
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
        {/* Header avec retour dashboard */}
        <header className="flex flex-row gap-4 items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToDashboard}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au Dashboard
            </Button>
            <div className="text-left">
              <h1 className="text-3xl font-bold text-foreground">
                {tripId ? 'Édition du voyage' : 'Nouveau voyage'}
              </h1>
              <p className="text-muted-foreground">
                Créez et gérez votre carnet de voyage personnalisé
              </p>
            </div>
          </div>
          <UserMenu />
        </header>

        {/* Phase indicators */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-2 bg-card rounded-full p-2 shadow-md">
            {(Object.keys(phases) as AppPhase[]).map((phase, index) => (
              <React.Fragment key={phase}>
                {index > 0 && (
                  <div className={`h-px w-12 ${
                    isPhaseCompleted(phase) 
                      ? 'bg-primary' 
                      : 'bg-muted'
                  }`} />
                )}
                <div
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all ${
                    isPhaseActive(phase)
                      ? 'bg-primary text-primary-foreground shadow-md scale-105'
                      : isPhaseCompleted(phase)
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {phases[phase].icon}
                  <span className="font-medium hidden sm:inline">{phases[phase].title}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Phase content */}
        <div className="mt-8">
          {currentPhase === 'upload' && tripId && (
            <Card className="max-w-3xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="h-5 w-5" />
                  <span>Upload de documents</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FileUploadNew
                  onFilesProcessed={handleFilesProcessed}
                  onProcessingUpdate={handleProcessingUpdate}
                  tripId={tripId}
                />
              </CardContent>
            </Card>
          )}

          {currentPhase === 'timeline' && tripId && (
            <TravelTimelineNew 
              tripId={tripId}
              onValidated={handleValidated}
            />
          )}

          {currentPhase === 'validated' && showOutputChoice && tripId && (
            <OutputTypeChoice
              tripId={tripId}
              onChoiceSelected={handleOutputTypeSelected}
            />
          )}
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-sm text-muted-foreground">
          <p>Transformez vos documents de voyage en carnet organisé grâce à l'IA</p>
        </footer>
      </div>
    </div>
  );
}
