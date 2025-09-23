import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { BookletData, BookletOptions } from '@/services/bookletService';
import { groupTravelSegments } from '@/services/stepGroupingService';
import { getEnrichedSteps, createAIContentRequest } from '@/services/stepTemplateService';
import { generateAllStepsAIContent, generateStepAIContent } from '@/services/aiContentService';
import { AIContentResult } from '@/types/enrichedStep';
import { EnrichedStep } from '@/types/enrichedStep';
import { StepTemplate } from '@/components/StepTemplate';

interface DynamicItineraryProps {
  data: BookletData;
  options: BookletOptions;
  tripId: string;
}

export function DynamicItinerary({
  data,
  options,
  tripId
}: DynamicItineraryProps) {
  const [enrichedSteps, setEnrichedSteps] = useState<EnrichedStep[]>([]);
  const [aiContents, setAiContents] = useState<Map<string, AIContentResult>>(new Map());
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [stepStatus, setStepStatus] = useState<string>('');

  useEffect(() => {
    if (data.segments.length > 0 && tripId) {
      generateContent();
    }
  }, [data.segments, tripId]);

  const generateContent = async () => {
    if (data.segments.length === 0 || !tripId) return;

    setIsGenerating(true);
    setProgress(0);
    setCurrentStep(-1);
    setStepStatus('Groupement des segments en étapes...');

    try {
      // Étape 1: Grouper les segments en étapes logiques
      console.log('Groupement des segments en étapes pour le voyage', tripId);
      let groupingResult;
      try {
        groupingResult = await groupTravelSegments(tripId);
        if (!groupingResult.success) {
          console.warn('Groupement échoué:', groupingResult.error);
          setStepStatus('Erreur groupement - Tentative récupération étapes existantes...');
        } else {
          console.log('Groupement réussi:', groupingResult.message);
        }
      } catch (groupError) {
        console.warn('Erreur lors du groupement:', groupError);
        setStepStatus('Erreur groupement - Tentative récupération étapes existantes...');
      }

      // Étape 2: Récupérer les étapes enrichies
      setProgress(30);
      setStepStatus('Récupération des étapes...');
      const stepsResult = await getEnrichedSteps(tripId);
      
      if (!stepsResult.success || !stepsResult.steps || stepsResult.steps.length === 0) {
        console.error('Aucune étape trouvée:', stepsResult.error);
        setStepStatus('Aucune étape trouvée - Utilisation de la vue statique');
        setIsGenerating(false);
        return;
      }

      const steps = stepsResult.steps;
      console.log(`${steps.length} étapes récupérées`);
      setEnrichedSteps(steps);
      setProgress(50);

      // Étape 3: Générer le contenu IA pour chaque étape
      setStepStatus('Génération du contenu enrichi...');
      setAiContents(new Map()); // Initialiser la map vide
      
      const aiRequests = steps.map(createAIContentRequest);
      const results = await generateAllStepsAIContent(aiRequests, (stepId, status, error, result) => {
        const stepIndex = steps.findIndex(s => s.stepId === stepId);
        setCurrentStep(stepIndex);
        setProgress(50 + ((stepIndex + 1) / steps.length * 50));

        // Messages détaillés pour l'utilisateur
        if (status === 'generating') {
          setStepStatus(`Génération du contenu pour l'étape ${stepIndex + 1}/${steps.length}...`);
        } else if (status === 'completed' && result) {
          setStepStatus(`Contenu généré pour l'étape ${stepIndex + 1}`);
          // Afficher immédiatement le contenu généré
          setAiContents(prev => {
            const newMap = new Map(prev);
            newMap.set(stepId, result);
            return newMap;
          });
        } else if (status === 'error') {
          setStepStatus(`Erreur génération étape ${stepIndex + 1}: ${error}`);
          // Ajouter un résultat vide en cas d'erreur pour permettre l'affichage
          if (result) {
            setAiContents(prev => {
              const newMap = new Map(prev);
              newMap.set(stepId, result);
              return newMap;
            });
          }
        }
      });
      
      // Mettre à jour avec les résultats finaux
      const aiMap = new Map<string, AIContentResult>();
      results.forEach(result => {
        aiMap.set(result.stepId, result);
      });
      setAiContents(aiMap);
      
      const successCount = results.filter(r => r.success).length;
      console.log(`Génération terminée: ${successCount}/${results.length} contenus IA générés`);

      setProgress(100);
      setCurrentStep(-1);
      setStepStatus(`Génération terminée: ${successCount}/${results.length} étapes enrichies`);

    } catch (error) {
      console.error('Erreur lors de la génération:', error);
      setStepStatus(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateStep = async (stepId: string) => {
    console.log(`Régénération du contenu IA pour l'étape: ${stepId}`);
    
    const step = enrichedSteps.find(s => s.stepId === stepId);
    if (!step) {
      console.error('Étape non trouvée pour régénération');
      return;
    }

    // Mettre à jour le statut de cette étape
    setAiContents(prev => {
      const newMap = new Map(prev);
      newMap.set(stepId, {
        stepId,
        overview: '',
        tips: [],
        success: false,
        error: 'Régénération en cours...'
      });
      return newMap;
    });

    try {
      const request = createAIContentRequest(step);
      const result = await generateStepAIContent(request);
      
      // Mettre à jour le contenu
      setAiContents(prev => {
        const newMap = new Map(prev);
        newMap.set(stepId, result);
        return newMap;
      });
      
      console.log('Régénération terminée:', result.success ? 'Succès' : result.error);
    } catch (error) {
      console.error('Erreur lors de la régénération:', error);
      setAiContents(prev => {
        const newMap = new Map(prev);
        newMap.set(stepId, {
          stepId,
          overview: '',
          tips: [],
          success: false,
          error: 'Erreur lors de la régénération'
        });
        return newMap;
      });
    }
  };

  // Rendu principal
  return (
    <div className="space-y-6">
      {isGenerating && (
        <div className="p-6 bg-muted/30 rounded-lg border">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="font-medium text-foreground">Génération de l'itinéraire enrichi</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{stepStatus}</span>
              <span className="text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            {currentStep >= 0 && (
              <div className="text-xs text-muted-foreground">
                Étape en cours: {currentStep + 1}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Affichage des étapes avec templates contrôlés */}
      {enrichedSteps.length > 0 && enrichedSteps.map((step, index) => {
        const aiContent = aiContents.get(step.stepId);
        const isStepGenerating = isGenerating && currentStep === index;

        return (
          <div key={step.stepId}>
            <StepTemplate 
              step={step}
              aiContent={aiContent?.success ? {
                overview: aiContent.overview,
                tips: aiContent.tips,
                localContext: aiContent.localContext
              } : undefined}
              isLoading={isStepGenerating}
            />
            
            {/* Bouton de régénération en cas d'erreur IA */}
            {aiContent && !aiContent.success && !isGenerating && (
              <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">
                      Échec génération contenu IA: {aiContent.error}
                    </span>
                  </div>
                  <button
                    onClick={() => regenerateStep(step.stepId)}
                    className="flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 transition-colors"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Régénérer
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Message si aucune étape trouvée */}
      {!isGenerating && enrichedSteps.length === 0 && (
        <div className="p-6 bg-muted/30 rounded-lg border">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">
              Aucune étape trouvée. Assurez-vous que vos segments de voyage sont validés.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}