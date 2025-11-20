import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { BookletData, BookletOptions } from '@/services/bookletService';
import { groupTravelSegments } from '@/services/stepGroupingService';
import { getEnrichedSteps, createAIContentRequest } from '@/services/stepTemplateService';
import { getManualSteps } from '@/services/manualStepsService';
import { generateAllStepsAIContent, generateStepAIContent, generateAndParseTripSummary, ParsedStepInfo } from '@/services/aiContentService';
import { AIContentResult } from '@/types/enrichedStep';
import { EnrichedStep } from '@/types/enrichedStep';
import { StepTemplate } from '@/components/StepTemplate';
import { estimateStepHeight, shouldBreakBefore } from '@/utils/pdfEstimator';


interface DynamicItineraryProps {
  data: BookletData;
  options: BookletOptions;
  tripId: string;
  allSegments?: BookletData["segments"];
  autoGenerate?: boolean;
}

export function DynamicItinerary({
  data,
  options,
  tripId,
  allSegments = [],
  autoGenerate,
}: DynamicItineraryProps) {
  const [enrichedSteps, setEnrichedSteps] = useState<EnrichedStep[]>([]);
  const [aiContents, setAiContents] = useState<Map<string, AIContentResult>>(new Map());
  const [parsedSteps, setParsedSteps] = useState<ParsedStepInfo[]>([]);
  const [parsedStepsMap, setParsedStepsMap] = useState<Map<number, ParsedStepInfo>>(new Map());
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [stepStatus, setStepStatus] = useState<string>('');

  // Auto-génération si demandée via le paramètre URL
  useEffect(() => {
    if (autoGenerate && !isGenerating && enrichedSteps.length === 0 && tripId) {
      console.log('🚀 Auto-génération déclenchée via autoGenerate');
      generateContent();
      
      // Nettoyer l'URL pour éviter de re-déclencher au refresh
      const url = new URL(window.location.href);
      url.searchParams.delete('autoGenerate');
      window.history.replaceState({}, '', url);
    }
  }, [autoGenerate, tripId]);

  // Chargement initial des steps et leur contenu AI
  useEffect(() => {
    if (data.segments.length > 0 && tripId && !autoGenerate) {
      loadExistingContentOrGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.segments, tripId]);

  // ✅ Fonction intelligente : charge depuis la DB ou génère si nécessaire
  const loadExistingContentOrGenerate = async () => {
    try {
      setStepStatus('Chargement du contenu...');
      const stepsResult = await getManualSteps(tripId);
      
      if (!stepsResult.success || !stepsResult.steps || stepsResult.steps.length === 0) {
        console.log('⚠️ Aucune étape trouvée');
        return;
      }

      // Vérifier combien de steps ont déjà du contenu AI
      const stepsWithContent = stepsResult.steps.filter(step => step.ai_content);
      const totalSteps = stepsResult.steps.length;
      
      console.log(`📊 ${stepsWithContent.length}/${totalSteps} steps ont du contenu AI en cache`);

      if (stepsWithContent.length === totalSteps) {
        // ✅ Tout le contenu est en cache, charger depuis la DB
        console.log('✅ Chargement du contenu depuis la base de données (pas de génération nécessaire)');
        await refreshEnrichedSteps();
        setStepStatus('');
      } else {
        // ⚡ Certains steps manquent de contenu, régénérer
        console.log('⚡ Génération du contenu manquant...');
        await generateContent();
      }
    } catch (error) {
      console.error('Error loading content:', error);
      setStepStatus('');
    }
  };

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
            primaryLocation: step.primary_location || '',
            startDate: step.start_date ? new Date(step.start_date) : new Date(),
            endDate: step.end_date ? new Date(step.end_date) : new Date(),
            sections: [{
              title: "Segments",
              segments,
              role: 'services' as const,
              icon: '📋'
            }],
            aiContent: step.ai_content as any, // ✅ Charger le contenu AI depuis la DB
            rawData: step
          };
        });
        setEnrichedSteps(updatedSteps);
        
        // ✅ Charger le contenu AI en cache si disponible
        const newAiContents = new Map<string, AIContentResult>();
        stepsResult.steps.forEach(step => {
          if (step.ai_content) {
            const content = step.ai_content as any;
            newAiContents.set(step.id, {
              stepId: step.id,
              overview: content.overview || '',
              tips: content.tips || [],
              localContext: content.localContext,
              success: true
            });
          }
        });
        setAiContents(newAiContents);
        console.log(`✅ Loaded ${newAiContents.size} AI contents from database`);
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
          primaryLocation: step.primary_location || '',
          startDate: step.start_date ? new Date(step.start_date) : new Date(),
          endDate: step.end_date ? new Date(step.end_date) : new Date(),
          sections: [{
            title: "Segments",
            segments,
            role: 'services' as const,
            icon: '📋'
          }],
          aiContent: step.ai_content as any, // ✅ Inclure le contenu existant
          rawData: step
        };
      });

      setEnrichedSteps(steps);
      setProgress(50);

      // ✅ Charger le contenu AI existant en cache
      const existingAiContents = new Map<string, AIContentResult>();
      stepsResult.steps.forEach(step => {
        if (step.ai_content) {
          const content = step.ai_content as any;
          existingAiContents.set(step.id, {
            stepId: step.id,
            overview: content.overview || '',
            tips: content.tips || [],
            localContext: content.localContext,
            success: true
          });
        }
      });
      
      if (existingAiContents.size > 0) {
        console.log(`✅ Loaded ${existingAiContents.size} existing AI contents from database`);
        setAiContents(existingAiContents);
      }

      // Parse trip summary to extract titles and locations
      console.log('🧩 Starting trip summary parsing...');
      try {
        const parsedInfo = await generateAndParseTripSummary(tripId);
        setParsedSteps(parsedInfo);
        
        // Create a map by step number for quick lookup
        const stepMap = new Map<number, ParsedStepInfo>();
        parsedInfo.forEach(info => {
          stepMap.set(info.stepNumber, info);
        });
        setParsedStepsMap(stepMap);
        
        console.log(`🧩 Parsed steps received (${parsedInfo.length}):`);
        parsedInfo.forEach((info, index) => {
          console.log(`  Step ${index + 1} -> parsed Etape ${info.stepNumber}: ${info.title} {${info.location}}`);
        });
      } catch (error) {
        console.error('Error parsing trip summary:', error);
      }

      setStepStatus('Génération du contenu enrichi...');
      setAiContents(new Map());

      const aiRequests = steps.map((step, index) => {
        const parsedStepInfo = parsedStepsMap.get(index + 1); // Align with "Etape X" numbering
        const primaryLocationFromSummary = parsedStepInfo?.location;
        
        console.log(`🌍 Creating AI request for step ${index + 1}:`);
        console.log(`  - Step ID: ${step.stepId}`);
        console.log(`  - Original primaryLocation: ${step.primaryLocation}`);
        console.log(`  - Location from trip summary: ${primaryLocationFromSummary}`);
        
        return createAIContentRequest(step, primaryLocationFromSummary);
      });
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

  // --- Affichage simple des segments avec estimation de hauteur ---
  const visibleSteps = useMemo<EnrichedStep[]>(() => {
    return enrichedSteps;
  }, [enrichedSteps]);

  // Calcul des sauts de page recommandés
  const stepsWithBreaks = useMemo(() => {
    let cumulativeHeight = 80; // hauteur cover + sections initiales
    
    return visibleSteps.map((step, index) => {
      // Construire un objet simple pour l'estimateur
      const stepForEstimation = {
        description: aiContents.get(step.stepId)?.overview || '',
        images: [], // Les images ne sont pas dans step directement
        notes: aiContents.get(step.stepId)?.tips?.join('\n') || ''
      };
      
      const needsBreak = index > 0 && shouldBreakBefore(stepForEstimation, cumulativeHeight);
      const height = estimateStepHeight(stepForEstimation);
      
      if (needsBreak) {
        cumulativeHeight = height; // reset sur nouvelle page
      } else {
        cumulativeHeight += height;
      }
      
      return { step, forcePageBreak: needsBreak };
    });
  }, [visibleSteps, aiContents]);

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

      {visibleSteps.length > 0 && stepsWithBreaks.map(({ step, forcePageBreak }, index) => {
        const aiContent = aiContents.get(step.stepId);
        const isStepGenerating = isGenerating && currentStep === index;
        const nextStep = visibleSteps[index + 1];
        const parsedStepInfo = parsedStepsMap.get(index + 1); // Align with "Etape X" numbering
        const isLastStep = index === visibleSteps.length - 1;

        return (
          <div 
            key={step.stepId}
            className={forcePageBreak ? 'section-break' : ''}
          >
            <StepTemplate
              step={step}
              tripId={tripId}
              aiContent={aiContent?.success ? {
                overview: aiContent.overview,
                tips: aiContent.tips,
                localContext: aiContent.localContext,
              } : undefined}
              isLoading={isStepGenerating}
              nextStepStartDate={nextStep?.startDate}
              parsedStepInfo={parsedStepInfo}
            />
            {isLastStep && (
              <div className="mt-8 text-center">
                <h3 className="text-xl font-bold text-foreground">Fin de nos services</h3>
              </div>
            )}
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