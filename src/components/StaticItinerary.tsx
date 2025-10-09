import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { BookletData, BookletOptions } from '@/services/bookletService';
import { getManualSteps } from '@/services/manualStepsService';
import { EnrichedStep } from '@/types/enrichedStep';
import { StepTemplate } from '@/components/StepTemplate';

interface StaticItineraryProps {
  data: BookletData;
  options: BookletOptions;
  tripId: string;
}

export function StaticItinerary({
  data,
  options,
  tripId,
}: StaticItineraryProps) {
  const [enrichedSteps, setEnrichedSteps] = useState<EnrichedStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tripId) {
      loadExistingContent();
    }
  }, [tripId]);

  const loadExistingContent = async () => {
    console.log('🔵 [STATIC ITINERARY] Mode Dev - Lecture depuis DB (avec ai_content)');
    setIsLoading(true);
    setError(null);

    try {
      // ✅ Récupération des étapes manuelles avec leurs segments enrichis
      const stepsResult = await getManualSteps(tripId);

      if (!stepsResult.success || !stepsResult.steps || stepsResult.steps.length === 0) {
        setError('Aucune étape trouvée pour ce voyage');
        setIsLoading(false);
        return;
      }

      console.log(`✅ [STATIC ITINERARY] ${stepsResult.steps.length} étapes chargées depuis DB`);

      // ✅ Conversion au format EnrichedStep (LECTURE SEULE)
      const steps: EnrichedStep[] = stepsResult.steps.map((step, index) => {
        const segments = step.travel_step_segments
          ?.sort((a, b) => a.position_in_step - b.position_in_step)
          .map(tss => tss.travel_segments)
          .filter(Boolean) || [];

        // ✅ Récupérer le contenu IA depuis la colonne ai_content
        const hasAiContent = !!step.ai_content;
        console.log(`  📋 Étape ${index + 1}: ${step.step_title} - AI Content: ${hasAiContent ? '✅ Stocké en DB' : '❌ Non généré'}`);

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
          aiContent: step.ai_content ? {
            overview: step.ai_content.overview || '',
            tips: step.ai_content.tips || [],
            localContext: step.ai_content.localContext || '',
            images: step.ai_content.images || [],
          } : undefined,
          rawData: step
        };
      });

      setEnrichedSteps(steps);
      console.log('✅ [STATIC ITINERARY] Contenu chargé - Affichage en lecture seule');
    } catch (error) {
      console.error('❌ [STATIC ITINERARY] Erreur lors du chargement:', error);
      setError(error instanceof Error ? error.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="font-medium text-foreground">Chargement des données depuis la base...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-destructive/10 rounded-lg border border-destructive/20">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Erreur: {error}</span>
        </div>
      </div>
    );
  }

  if (enrichedSteps.length === 0) {
    return (
      <div className="p-6 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">Aucune étape trouvée. Assurez-vous que vos segments sont validés et regroupés en étapes.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ✅ Affichage en lecture seule - Contenu IA depuis ai_content */}
      {enrichedSteps.map((step, index) => {
        const nextStep = enrichedSteps[index + 1];
        const isLastStep = index === enrichedSteps.length - 1;

        return (
          <div key={step.stepId}>
            <StepTemplate
              step={step}
              aiContent={step.aiContent}
              isLoading={false}
              nextStepStartDate={nextStep?.startDate}
              parsedStepInfo={undefined}
            />
            {isLastStep && (
              <div className="mt-8 text-center">
                <h3 className="text-xl font-bold text-foreground">Fin de nos services</h3>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
