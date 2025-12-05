import { useState, useEffect, useRef } from "react";
import { QuoteTemplate } from "./QuoteTemplate";
import { getQuoteData, QuoteData, generateAllQuoteSteps } from "@/services/quoteService";
import { generateQuotePdf } from "@/services/pdfQuoteService";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { FileText, Loader2, Sparkles, AlertCircle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import "@/styles/quote-pdf.css";

interface QuoteGeneratorProps {
  tripId: string;
  autoGenerate?: boolean;
}

/**
 * Extrait le HTML brut du devis pour export
 */
function getQuoteDOMRawExport(element: HTMLElement): string {
  const clone = element.cloneNode(true) as HTMLElement;
  
  // Supprimer les éléments interactifs
  const selectorsToRemove = [
    'button',
    'input',
    'textarea',
    '.no-print',
    '[contenteditable]',
    '.upload-zone:not(:has(img))', // Garder les zones avec images
  ];
  
  selectorsToRemove.forEach(selector => {
    clone.querySelectorAll(selector).forEach(el => el.remove());
  });
  
  return clone.innerHTML;
}

export function QuoteGenerator({ tripId, autoGenerate }: QuoteGeneratorProps) {
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{ current: number; total: number; status: string } | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [hasAttemptedAutoGeneration, setHasAttemptedAutoGeneration] = useState(false);
  const templateRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadQuoteData();
  }, [tripId]);

  // Auto-check for missing content
  useEffect(() => {
    if (quoteData && !isGenerating && !isLoading && !hasAttemptedAutoGeneration) {
      checkAndGenerateMissingContent();
    }
  }, [quoteData, isGenerating, isLoading, hasAttemptedAutoGeneration]);

  const checkAndGenerateMissingContent = async () => {
    if (!quoteData) return;

    const stepsMissingContent = quoteData.steps.filter(
      step => step.segments.length > 0 && !step.quoteDescription
    );

    const isSummaryMissing = !quoteData.quoteDescription || !quoteData.quoteHighlights;
    
    // Check if general info needs generation (missing object OR missing fields)
    const isGeneralInfoMissing = !quoteData.generalInfo || 
      (!quoteData.generalInfo.entry_requirements && !quoteData.generalInfo.health_requirements);

    if (stepsMissingContent.length > 0 || isSummaryMissing || isGeneralInfoMissing) {
      console.log(`Found missing content (Steps: ${stepsMissingContent.length}, Summary: ${isSummaryMissing}, GeneralInfo: ${isGeneralInfoMissing}). Auto-generating...`);
      setHasAttemptedAutoGeneration(true); // Marquer comme tenté pour éviter la boucle infinie
      handleGenerateContent(stepsMissingContent);
    }
  };

  const loadQuoteData = async () => {
    try {
      setIsLoading(true);
      const data = await getQuoteData(tripId);
      setQuoteData(data);
    } catch (error) {
      console.error("Error loading quote data:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du devis",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateContent = async (specificSteps?: any[]) => {
    if (!quoteData) return;
    
    const stepsToProcess = specificSteps || quoteData.steps;
    const stepsCount = stepsToProcess.filter(s => s.segments.length > 0).length;
    
    // Check if summary needs generation
    const isSummaryMissing = !quoteData.quoteDescription || !quoteData.quoteHighlights;
    
    // Check if general info needs generation (missing object OR missing fields)
    const isGeneralInfoMissing = !quoteData.generalInfo || 
      (!quoteData.generalInfo.entry_requirements && !quoteData.generalInfo.health_requirements);
    
    // Si tout est présent, on ne fait rien
    if (stepsCount === 0 && !isSummaryMissing && !isGeneralInfoMissing) return;

    // Si on a déjà tenté une génération automatique et qu'il manque toujours des infos,
    // on ne relance pas pour éviter une boucle infinie, SAUF si c'est une nouvelle demande explicite
    // (mais ici c'est l'auto-check).
    
    // Cependant, si isGeneralInfoMissing est vrai, on veut forcer la génération même si stepsCount est 0.
    
    try {
      setIsGenerating(true);
      setGenerationError(null);
      
      const totalTasks = stepsCount + (isSummaryMissing ? 1 : 0) + (isGeneralInfoMissing ? 1 : 0);
      setGenerationProgress({ current: 0, total: totalTasks, status: 'Démarrage...' });
      
      let completedCount = 0;
      let errorCount = 0;

      await generateAllQuoteSteps(
        tripId, 
        stepsToProcess, 
        quoteData.destination,
        (stepId, status, result) => {
          if (status === 'generating') {
             if (stepId === 'summary') {
                setGenerationProgress(prev => prev ? { ...prev, status: "Rédaction de l'introduction et des points forts..." } : null);
             } else if (stepId === 'general-info') {
                setGenerationProgress(prev => prev ? { ...prev, status: "Recherche des formalités et infos santé..." } : null);
             } else if (stepId === 'trip-summary') {
                setGenerationProgress(prev => prev ? { ...prev, status: "Analyse de l'itinéraire global..." } : null);
             } else {
                const currentStepNum = completedCount + 1;
                setGenerationProgress(prev => prev ? { 
                    ...prev, 
                    status: `Rédaction de l'étape ${currentStepNum}/${totalTasks}...` 
                } : null);
             }
          } else if (status === 'completed') {
            if (stepId === 'trip-summary') {
              // Reload data immediately when trip summary is ready so the summary slide appears
              loadQuoteData();
            } else {
              completedCount++;
              setGenerationProgress(prev => prev ? {
                ...prev,
                current: completedCount
              } : null);
            }
          } else if (status === 'error') {
            errorCount++;
            console.error(`Failed to generate for step ${stepId}`, result);
          }
        }
      );
      
      await loadQuoteData();
      
      if (errorCount > 0) {
        setGenerationError(`La génération a échoué pour ${errorCount} élément(s). Vérifiez que les fonctions Edge sont déployées.`);
        toast({
          title: "Génération incomplète",
          description: `${errorCount} erreurs rencontrées lors de la génération.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Génération terminée",
          description: "Les textes du devis ont été mis à jour",
        });
      }
    } catch (error) {
      console.error("Error generating content:", error);
      setGenerationError("Une erreur critique est survenue lors de la génération.");
      toast({
        title: "Erreur",
        description: "Impossible de générer le contenu",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };

  const handleGeneratePdf = async () => {
    if (!quoteData) return;

    try {
      setIsExporting(true);
      
      const result = await generateQuotePdf(tripId);
      
      console.log("📊 PDF Generation Result:", result);

      if (result.success && result.url) {
        // Ouvrir le PDF dans un nouvel onglet
        window.open(result.url, '_blank');
        
        toast({
          title: "PDF généré",
          description: "Le devis a été généré avec succès",
        });
      } else {
        console.error("❌ PDF Generation Failed Logic:", result);
        throw new Error(result.error || "Erreur inconnue lors de la génération");
      }
    } catch (error: any) {
      console.error("❌ Error generating PDF (Catch):", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de générer le PDF",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!quoteData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 max-w-md">
          <p className="text-center text-muted-foreground">
            Aucune donnée disponible pour générer le devis
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Devis de voyage</h1>
            <p className="text-muted-foreground">{quoteData.title}</p>
          </div>
          <div className="flex gap-2 items-center">
            <Button
              onClick={handleGeneratePdf}
              disabled={isExporting || isGenerating}
              size="lg"
              className="gap-2"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Télécharger le PDF
                </>
              )}
            </Button>
          </div>
        </div>

        {isGenerating && generationProgress && (
          <div className="mb-6 p-6 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="font-medium text-foreground">Rédaction de votre devis sur mesure</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{generationProgress.status}</span>
                <span className="text-muted-foreground">
                  {Math.round((generationProgress.current / generationProgress.total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }} 
                />
              </div>
            </div>
          </div>
        )}

        {generationError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur de génération</AlertTitle>
            <AlertDescription>
              {generationError}
            </AlertDescription>
          </Alert>
        )}

        <div ref={templateRef}>
          <Card className="overflow-hidden">
            <QuoteTemplate data={quoteData} pdfMode={false} />
          </Card>
        </div>
      </div>
    </div>
  );
}
