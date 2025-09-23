import React, { useState, useEffect, useMemo } from 'react';
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

  // édition
  editable?: boolean;
  excludedSegmentIds?: Set<string>;
  onRemoveSegment?: (segmentId: string) => void;
  allSegments?: BookletData["segments"];
}

export function DynamicItinerary({
  data,
  options,
  tripId,
  editable = false,
  excludedSegmentIds = new Set<string>(),
  onRemoveSegment,
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

  const generateContent = async () => {
    if (data.segments.length === 0 || !tripId) return;

    setIsGenerating(true);
    setProgress(0);
    setCurrentStep(-1);
    setStepStatus('Groupement des segments en étapes...');

    try {
      let groupingResult;
      try {
        groupingResult = await groupTravelSegments(tripId);
        if (!groupingResult.success) {
          setStepStatus('Erreur groupement - Tentative récupération étapes existantes...');
        }
      } catch {
        setStepStatus('Erreur groupement - Tentative récupération étapes existantes...');
      }

      setProgress(30);
      setStepStatus('Récupération des étapes...');
      const stepsResult = await getEnrichedSteps(tripId);

      if (!stepsResult.success || !stepsResult.steps || stepsResult.steps.length === 0) {
        setStepStatus('Aucune étape trouvée - Utilisation de la vue statique');
        setIsGenerating(false);
        return;
      }

      const steps = stepsResult.steps;
      setEnrichedSteps(steps);
      setProgress(50);

      setStepStatus('Génération du contenu enrichi...');
      setAiContents(new Map());

      const aiRequests = steps.map(createAIContentRequest);
      const results = await generateAllStepsAIContent(aiRequests, (stepId, status, _error, result) => {
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
        }
      });

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

  // --- Filtrage + Injection des segments manquants ---
  const visibleSteps = useMemo<EnrichedStep[]>(() => {
    // 1) clone des steps
    const cloned: EnrichedStep[] = enrichedSteps.map(s => ({
      ...s,
      sections: s.sections.map(sec => ({
        ...sec,
        segments: sec.segments.filter(seg => !excludedSegmentIds.has(seg.id)), // filtrage
      })),
    }));

    // 2) set d’IDs déjà présents après filtrage
    const presentIds = new Set<string>();
    cloned.forEach(s =>
      s.sections.forEach(sec =>
        sec.segments.forEach(seg => presentIds.add(seg.id))
      )
    );

    // 3) segments inclus mais absents → injection
    const toInject = allSegments.filter(
      seg => !excludedSegmentIds.has(seg.id) && !presentIds.has(seg.id)
    );

    if (toInject.length === 0) return cloned;

    const ensureMiscSection = (step: EnrichedStep) => {
      const idx = step.sections.findIndex(sec => sec.title === "Autres");
      if (idx >= 0) return step.sections[idx];
      const newSec = { 
        title: "Autres", 
        icon: "🧭", 
        segments: [] as any[], 
        role: 'services' as const 
      };
      step.sections.push(newSec);
      return newSec;
    };

    const pickStepForDate = (d?: string) => {
      if (!d) return undefined;
      const dt = new Date(d);
      return cloned.find(
        st => dt >= st.startDate && dt <= st.endDate
      );
    };

    toInject.forEach(seg => {
      const target = pickStepForDate(seg.start_date) || cloned[0]; // fallback : première step
      if (target) {
        const misc = ensureMiscSection(target);
        misc.segments.push(seg);
      }
    });

    return cloned;
  }, [enrichedSteps, excludedSegmentIds, allSegments]);

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
              // édition
              editable={editable}
              onRemoveSegment={onRemoveSegment}
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
