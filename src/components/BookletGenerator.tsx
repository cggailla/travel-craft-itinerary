import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookletPreview } from "./BookletPreview";
import { 
  getBookletData, 
  BookletData, 
  BookletOptions, 
  defaultBookletOptions 
} from "@/services/bookletService";
import { 
  Download, 
  FileText,
  Loader2,
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEnrichmentStatus } from "@/hooks/useEnrichmentStatus";
import html2pdf from "html2pdf.js";

interface BookletGeneratorProps {
  tripId: string;
}

export function BookletGenerator({ tripId }: BookletGeneratorProps) {
  const [bookletData, setBookletData] = useState<BookletData | null>(null);
  const [options] = useState<BookletOptions>(defaultBookletOptions);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(0);
  const { toast } = useToast();
  const { status: enrichmentStatus, isLoading: isStatusLoading } = useEnrichmentStatus(tripId);

  useEffect(() => {
    loadBookletData();
  }, [tripId]);

  // Show preview when enrichment is completed and we have data
  useEffect(() => {
    if (enrichmentStatus === 'completed' && bookletData) {
      setShowPreview(true);
      loadBookletData(); // Reload to get enriched data
    }
  }, [enrichmentStatus, bookletData]);

  const loadBookletData = async () => {
    try {
      setIsLoading(true);
      const data = await getBookletData(tripId);
      setBookletData(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du voyage.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateBooklet = async () => {
    if (!bookletData) {
      toast({
        title: "Erreur",
        description: "Aucune donnée de voyage disponible",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingAI(true);
    setProgress(0);
    setCompletedSteps(0);
    setShowPreview(false);

    try {
      console.log('Starting booklet generation for trip:', tripId);
      
      // Import the function here to avoid circular dependencies
      const { generateAllStepsAIContent } = await import('@/services/aiContentService');
      const { getEnrichedSteps } = await import('@/services/stepTemplateService');
      
      const { success, steps: stepsData } = await getEnrichedSteps(tripId);
      
      if (!success || !stepsData) {
        throw new Error('Impossible de récupérer les données des étapes');
      }
      
      const requests = stepsData.map(step => ({
        stepId: step.stepId,
        stepTitle: step.stepTitle,
        primaryLocation: step.primaryLocation,
        sections: step.sections
      }));

      await generateAllStepsAIContent(
        requests, 
        tripId, 
        (type, stepId, status, error, result) => {
          console.log(`Progress: ${type} ${stepId} - ${status}`, { error, result });
          
          if (type === 'step' && status === 'completed') {
            setCompletedSteps(prev => prev + 1);
            setProgress(prev => Math.min(prev + (85 / requests.length), 85));
          }
          
          if (type === 'consolidation' && status === 'completed') {
            setProgress(5);
          }
          
          if (type === 'trip-summary' && status === 'completed') {
            setProgress(10);
          }
          
          if (type === 'enrichment') {
            if (status === 'starting') {
              setProgress(15);
            } else if (status === 'completed') {
              setProgress(90);
            }
          }
        }
      );

      setProgress(100);
      // Don't set showPreview here - wait for enrichment status to be 'completed'
      
      toast({
        title: "Carnet de voyage généré !",
        description: "Le contenu IA et l'enrichissement ont été générés avec succès"
      });

    } catch (error) {
      console.error('Error generating booklet:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la génération du carnet",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!bookletData) return;
    
    try {
      setIsGeneratingPdf(true);
      
      // Récupérer l'élément HTML à convertir
      const element = document.getElementById('booklet-content');
      if (!element) {
        throw new Error('Contenu du carnet introuvable');
      }

      // Configuration PDF
      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `carnet-voyage-${bookletData.tripTitle.toLowerCase().replace(/\s+/g, '-')}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' as const
        }
      };

      // Générer le PDF
      await html2pdf().set(opt).from(element).save();
      
      toast({
        title: "PDF généré",
        description: "Votre carnet de voyage a été téléchargé avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de générer le PDF.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };


  if (isLoading || isStatusLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement des données du voyage...</p>
        </div>
      </div>
    );
  }

  // Show generation progress when AI generation is in progress
  if (isGeneratingAI) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium">Génération du carnet en cours...</p>
            <p className="text-sm text-muted-foreground">
              {progress < 5 && "Consolidation des segments..."}
              {progress >= 5 && progress < 10 && "Génération du résumé du voyage..."}
              {progress >= 10 && progress < 90 && `Enrichissement des données... (${progress.toFixed(0)}%)`}
              {progress >= 90 && progress < 100 && `Génération du contenu IA... (${completedSteps} étapes complétées)`}
              {progress === 100 && "Finalisation..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!bookletData) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">Aucune donnée disponible</h3>
        <p className="text-muted-foreground mb-4">
          Aucun segment validé trouvé pour ce voyage.
        </p>
        <Button onClick={loadBookletData} variant="outline">
          Réessayer
        </Button>
      </div>
    );
  }

  // Show generate button if enrichment is not completed and no generation in progress
  if (enrichmentStatus !== 'completed' && !isGeneratingAI && !showPreview) {
    return (
      <div className="space-y-6">
        {/* En-tête avec informations du voyage */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-2xl">
                <FileText className="mr-3 h-6 w-6 text-primary" />
                {bookletData.tripTitle}
              </CardTitle>
              <Badge variant="outline" className="flex items-center">
                <Clock className="mr-1 h-3 w-3" />
                En attente
              </Badge>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {bookletData.startDate && (
                <div className="flex items-center">
                  <Calendar className="mr-1 h-4 w-4" />
                  {bookletData.startDate.toLocaleDateString('fr-FR')}
                  {bookletData.endDate && ` - ${bookletData.endDate.toLocaleDateString('fr-FR')}`}
                </div>
              )}
              <div className="flex items-center">
                <Clock className="mr-1 h-4 w-4" />
                {bookletData.totalDays} jour{bookletData.totalDays > 1 ? 's' : ''}
              </div>
              <div className="flex items-center">
                <MapPin className="mr-1 h-4 w-4" />
                {bookletData.segments.length} segment{bookletData.segments.length > 1 ? 's' : ''}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {Object.entries(bookletData.segmentsByType).map(([type, segments]) => (
                  <Badge key={type} variant="secondary">
                    {type}: {segments.length}
                  </Badge>
                ))}
              </div>
              <div className="text-center">
                <Button 
                  onClick={handleGenerateBooklet}
                  size="lg"
                  className="flex items-center"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Générer le carnet de voyage avec IA
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Cette étape va enrichir vos données et générer le contenu IA
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec informations du voyage */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-2xl">
              <FileText className="mr-3 h-6 w-6 text-primary" />
              {bookletData.tripTitle}
            </CardTitle>
            {enrichmentStatus === 'completed' && (
              <Badge variant="default" className="flex items-center">
                <CheckCircle className="mr-1 h-3 w-3" />
                Enrichi
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {bookletData.startDate && (
              <div className="flex items-center">
                <Calendar className="mr-1 h-4 w-4" />
                {bookletData.startDate.toLocaleDateString('fr-FR')}
                {bookletData.endDate && ` - ${bookletData.endDate.toLocaleDateString('fr-FR')}`}
              </div>
            )}
            <div className="flex items-center">
              <Clock className="mr-1 h-4 w-4" />
              {bookletData.totalDays} jour{bookletData.totalDays > 1 ? 's' : ''}
            </div>
            <div className="flex items-center">
              <MapPin className="mr-1 h-4 w-4" />
              {bookletData.segments.length} segment{bookletData.segments.length > 1 ? 's' : ''}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(bookletData.segmentsByType).map(([type, segments]) => (
              <Badge key={type} variant="secondary">
                {type}: {segments.length}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Interface simplifiée */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Carnet de voyage</h3>
          <div className="flex gap-2">
            {enrichmentStatus !== 'completed' && (
              <Button 
                onClick={handleGenerateBooklet}
                variant="outline"
                className="flex items-center"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Regénérer avec IA
              </Button>
            )}
            <Button 
              onClick={handleGeneratePdf}
              disabled={isGeneratingPdf}
              className="flex items-center"
            >
              {isGeneratingPdf ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {isGeneratingPdf ? 'Génération...' : 'Télécharger PDF'}
            </Button>
          </div>
        </div>
        
        {showPreview && (
          <BookletPreview 
            data={bookletData} 
            options={options} 
            tripId={tripId}
          />
        )}
      </div>
    </div>
  );
}