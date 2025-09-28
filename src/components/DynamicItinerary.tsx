import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { BookletData, BookletOptions } from '@/services/bookletService';
import { groupTravelSegments } from '@/services/stepGroupingService';
import { getEnrichedSteps, createAIContentRequest } from '@/services/stepTemplateService';
import { getManualSteps } from '@/services/manualStepsService';
import { generateAllStepsAIContent, generateStepAIContent } from '@/services/aiContentService';
import { AIContentResult } from '@/types/enrichedStep';
import { EnrichedStep } from '@/types/enrichedStep';
import { StepTemplate } from '@/components/StepTemplate';
import { determinePrimaryLocation } from '@/services/locationService';

interface DynamicItineraryProps {
  data: BookletData;
  options: BookletOptions;
  tripId: string;
  allSegments?: BookletData["segments"];
}

export function DynamicItinerary({
  data,
  options,
  tripId,
  allSegments = [],
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.segments, tripId]);

  const refreshEnrichedSteps = async () => {
    try {
      const stepsResult = await getManualSteps(tripId);
      if (stepsResult.success && stepsResult.steps && stepsResult.steps.length > 0) {
        const updatedSteps = stepsResult.steps.map(step => {
          const segments = step.travel_step_segments
            ?.sort((a, b) => a.position_in_step - b.position_in_step)
            .map(tss => tss.travel_segments)
            .filter(Boolean) || [];

          return {
            stepId: step.id,
            stepTitle: step.step_title,
            stepType: step.step_type || 'manual',
            primaryLocation: determinePrimaryLocation(segments) || step.primary_location || '',
            startDate: step.start_date ? new Date(step.start_date) : new Date(),
            endDate: step.end_date ? new Date(step.end_date) : new Date(),
            sections: [{
              title: "Segments",
              segments,
              role: 'services' as const,
              icon: '📋'
            }],
            rawData: step
          };
        });
        setEnrichedSteps(updatedSteps);
      }
    } catch (error) {
      console.error('Error refreshing enriched steps:', error);
    }
  };

  const generateContent = async () => {
    if (data.segments.length === 0 || !tripId) return;

    setIsGenerating(true);
    setProgress(0);
    setCurrentStep(-1);
    setStepStatus('Récupération des étapes manuelles...');

    try {
      // Récupérer les étapes créées manuellement
      setProgress(30);
      const stepsResult = await getManualSteps(tripId);

      if (!stepsResult.success || !stepsResult.steps || stepsResult.steps.length === 0) {
        setStepStatus('Aucune étape manuelle trouvée - Créez d\'abord vos étapes');
        setIsGenerating(false);
        return;
      }

      // Convertir les étapes manuelles au format EnrichedStep
      const steps = stepsResult.steps.map(step => {
        const segments = step.travel_step_segments
          ?.sort((a, b) => a.position_in_step - b.position_in_step)
          .map(tss => tss.travel_segments)
          .filter(Boolean) || [];

        return {
          stepId: step.id,
          stepTitle: step.step_title,
          stepType: step.step_type || 'manual',
          primaryLocation: determinePrimaryLocation(segments) || step.primary_location || '',
          startDate: step.start_date ? new Date(step.start_date) : new Date(),
          endDate: step.end_date ? new Date(step.end_date) : new Date(),
          sections: [{
            title: "Segments",
            segments,
            role: 'services' as const,
            icon: '📋'
          }],
          rawData: step
        };
      });

      setEnrichedSteps(steps);
      setProgress(50);

      setStepStatus('Génération du contenu enrichi...');
      setAiContents(new Map());

      const aiRequests = steps.map(createAIContentRequest);
      const results = await generateAllStepsAIContent(
        aiRequests, 
        tripId,
        (type, stepId, status, error, result) => {
          console.log(`${type} ${stepId || ''} status: ${status}`, error || result);
          
          if (type === 'consolidation') {
            if (status === 'generating') {
              setStepStatus('Consolidation des segments en cours...');
            } else if (status === 'completed') {
              setStepStatus('Segments consolidés avec succès');
            }
            return;
          }
          
          if (type === 'trip-summary') {
            if (status === 'generating') {
              setCurrentStep(-1);
              setStepStatus('Génération du résumé du voyage...');
            } else if (status === 'completed') {
              setStepStatus('Résumé du voyage généré');
            }
            return;
          }
          
          if (type === 'enrichment') {
            if (status === 'generating') {
              setStepStatus('Enrichissement des données en cours...');
            } else if (status === 'completed') {
              setStepStatus('Données enrichies avec Perplexity');
              // Re-fetch enriched data
              refreshEnrichedSteps();
            } else if (status === 'error') {
              setStepStatus('Erreur lors de l\'enrichissement des données');
            }
            return;
          }
          
          if (type === 'step' && stepId) {
            const stepIndex = steps.findIndex(s => s.stepId === stepId);
            setCurrentStep(stepIndex);
            setProgress(50 + ((stepIndex + 1) / steps.length * 50));
            
            if (status === 'generating') {
              setStepStatus(`Génération du contenu pour l'étape ${stepIndex + 1}/${steps.length}...`);
            } else if (status === 'completed' && result) {
              setStepStatus(`Contenu généré pour l'étape ${stepIndex + 1}`);
              setAiContents(prev => {
                const m = new Map(prev);
                m.set(stepId, result);
                return m;
              });
            } else if (status === 'error') {
              console.error(`Error generating content for step ${stepId}:`, error);
            }
          }
        }
      );

      const aiMap = new Map<string, AIContentResult>();
      results.forEach(r => aiMap.set(r.stepId, r));
      setAiContents(aiMap);

      const successCount = results.filter(r => r.success).length;
      setProgress(100);
      setCurrentStep(-1);
      setStepStatus(`Génération terminée: ${successCount}/${results.length} étapes enrichies`);
    } catch (error) {
      setStepStatus(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Affichage simple des segments ---
  const visibleSteps = useMemo<EnrichedStep[]>(() => {
    return enrichedSteps;
  }, [enrichedSteps]);

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
              <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            {currentStep >= 0 && (
              <div className="text-xs text-muted-foreground">Étape en cours: {currentStep + 1}</div>
            )}
          </div>
        </div>
      )}

      {visibleSteps.length > 0 && visibleSteps.map((step, index) => {
        const aiContent = aiContents.get(step.stepId);
        const isStepGenerating = isGenerating && currentStep === index;
        const nextStep = visibleSteps[index + 1];

        return (
          <div key={step.stepId}>
            <StepTemplate
              step={step}
              aiContent={aiContent?.success ? {
                overview: aiContent.overview,
                tips: aiContent.tips,
                localContext: aiContent.localContext,
              } : undefined}
              isLoading={isStepGenerating}
              nextStepStartDate={nextStep?.startDate}
            />
          </div>
        );
      })}

      {!isGenerating && visibleSteps.length === 0 && (
        <div className="p-6 bg-muted/30 rounded-lg border">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Aucune étape trouvée. Assurez-vous que vos segments de voyage sont validés.</span>
          </div>
        </div>
      )}
    </div>
  );
}