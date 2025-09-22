import React, { useState, useEffect } from 'react';
import { Calendar, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BookletData, BookletOptions } from '@/services/bookletService';
import { generateAllStepsContent, StepContentResult } from '@/services/stepContentService';
import { groupTravelSegments, getTravelSteps } from '@/services/stepGroupingService';
import { formatSegmentType, getSegmentIcon } from '@/services/bookletService';

interface DynamicItineraryProps {
  data: BookletData;
  options: BookletOptions;
  tripId: string;
}

export function DynamicItinerary({ data, options, tripId }: DynamicItineraryProps) {
  const [stepContents, setStepContents] = useState<StepContentResult[]>([]);
  const [steps, setSteps] = useState<any[]>([]);
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
      const groupingResult = await groupTravelSegments(tripId);
      
      if (!groupingResult.success) {
        throw new Error(groupingResult.error || 'Erreur lors du groupement des segments');
      }
      
      // Étape 2: Récupérer les étapes créées
      setStepStatus('Récupération des étapes créées...');
      const stepsResult = await getTravelSteps(tripId);
      
      if (!stepsResult.success) {
        throw new Error(stepsResult.error || 'Erreur lors de la récupération des étapes');
      }
      
      const travelSteps = stepsResult.steps || [];
      setSteps(travelSteps);
      
      if (travelSteps.length === 0) {
        setStepStatus('Aucune étape trouvée');
        return;
      }
      
      console.log(`Début génération contenu GPT pour ${travelSteps.length} étapes`);
      
      // Étape 3: Générer le contenu pour chaque étape
      const results = await generateAllStepsContent(
        tripId,
        (stepId, status, error) => {
          const stepIndex = travelSteps.findIndex(s => s.step_id === stepId);
          setCurrentStep(stepIndex);
          setProgress(((stepIndex + 1) / travelSteps.length) * 100);
          
          // Messages détaillés pour l'utilisateur
          if (status === 'generating') {
            setStepStatus(`Génération de l'étape ${stepIndex + 1}...`);
          } else if (status === 'completed') {
            setStepStatus(`Étape ${stepIndex + 1} générée avec succès`);
          } else if (status === 'error') {
            setStepStatus(`Erreur génération étape ${stepIndex + 1}: ${error}`);
          }
        }
      );
      
      setStepContents(results);
      
      const successCount = results.filter(r => r.success).length;
      console.log(`Génération terminée: ${successCount}/${results.length} étapes réussies`);
      
    } catch (error) {
      console.error('Erreur lors de la génération:', error);
      setStepStatus(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsGenerating(false);
      setProgress(100);
      setCurrentStep(-1);
      setStepStatus('Génération terminée');
    }
  };

  const regenerateStep = async (stepIndex: number) => {
    if (stepIndex >= steps.length) return;
    
    const step = steps[stepIndex];
    if (!step) return;

    setStepContents(prev => prev.map((content, i) => 
      i === stepIndex ? { ...content, success: false, html: '', error: undefined } : content
    ));

    try {
      const { generateStepPageHTML } = await import('@/services/stepContentService');
      const result = await generateStepPageHTML(tripId, step.step_id);
      
      setStepContents(prev => prev.map((content, i) => 
        i === stepIndex ? result : content
      ));
    } catch (error) {
      console.error(`Erreur régénération étape ${stepIndex + 1}:`, error);
    }
  };

  const renderStaticStep = (step: any, stepIndex: number) => {
    const segments = step.travel_step_segments?.map((tss: any) => tss.travel_segments) || [];
    
    return (
      <div key={`static-${stepIndex}`} className="border rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4 theme-text flex items-center">
          <Calendar className="mr-2 h-5 w-5" />
          Étape {stepIndex + 1}: {step.step_title}
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({segments.length} segment{segments.length > 1 ? 's' : ''})
          </span>
        </h3>
        
        {step.primary_location && (
          <p className="text-sm text-gray-600 mb-4">
            <strong>Lieu principal:</strong> {step.primary_location}
          </p>
        )}
        
        <div className="space-y-4">
          {segments.map((segment: any) => (
            <div key={segment.id} className="border-l-4 theme-border pl-4 py-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className="text-lg mr-2">{getSegmentIcon(segment.segment_type)}</span>
                    <h4 className="font-semibold text-lg">{segment.title}</h4>
                    <span className="ml-2 px-2 py-1 theme-bg rounded text-sm">
                      {formatSegmentType(segment.segment_type)}
                    </span>
                  </div>
                  
                  {segment.provider && (
                    <p className="text-sm text-gray-600 mb-1">
                      <strong>Prestataire:</strong> {segment.provider}
                    </p>
                  )}
                  
                  {segment.reference_number && (
                    <p className="text-sm text-gray-600 mb-1">
                      <strong>Référence:</strong> {segment.reference_number}
                    </p>
                  )}
                  
                  {options.includeNotes && segment.description && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                      <strong>Description:</strong> {segment.description}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (data.segments.length === 0) {
    return <p className="text-gray-500">Aucun segment trouvé.</p>;
  }

  return (
    <div className="space-y-8">
      {isGenerating && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <Loader2 className="animate-spin mr-2 h-4 w-4 text-blue-600" />
              <span className="text-blue-800 font-medium">
                Génération du contenu enrichi par IA
              </span>
            </div>
            <span className="text-sm text-blue-600 font-medium">
              {Math.round(progress)}%
            </span>
          </div>
          
          <div className="w-full bg-blue-200 rounded-full h-2 mb-3">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="text-sm text-blue-600">
            {stepStatus || 'Préparation...'}
          </div>
          
          {currentStep >= 0 && steps.length > 0 && (
            <div className="text-xs text-blue-500 mt-1">
              Étape {currentStep + 1} sur {steps.length}
            </div>
          )}
        </div>
      )}

      {steps.map((step, stepIndex) => {
        const stepContent = stepContents.find(c => c.stepId === step.step_id);
        
        if (isGenerating || !stepContent) {
          return (
            <div key={`loading-${stepIndex}`} className="border rounded-lg p-6">
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin mr-2 h-6 w-6 text-blue-600" />
                <span className="text-blue-600">
                  Génération étape {stepIndex + 1}...
                </span>
              </div>
            </div>
          );
        }

        if (stepContent.success && stepContent.html) {
          // Nettoyer le contenu HTML pour supprimer les encarts ```html
          const cleanHtml = stepContent.html
            .replace(/```html\n/g, '')
            .replace(/\n```/g, '')
            .replace(/```html/g, '')
            .replace(/```/g, '');

          return (
            <div key={`gpt-${stepIndex}`} className="border rounded-lg p-6 relative">
              <button
                onClick={() => regenerateStep(stepIndex)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                title="Régénérer cette étape"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              
              <div 
                dangerouslySetInnerHTML={{ __html: cleanHtml }}
                className="gpt-content"
              />
            </div>
          );
        }

        // Fallback vers rendu statique en cas d'erreur
        return (
          <div key={`fallback-${stepIndex}`}>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-yellow-600 mr-2" />
                <span className="text-yellow-800 text-sm">
                  Erreur génération IA - Affichage standard
                </span>
                <button
                  onClick={() => regenerateStep(stepIndex)}
                  className="ml-auto text-yellow-600 hover:text-yellow-800"
                  title="Réessayer la génération IA"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
            {renderStaticStep(step, stepIndex)}
          </div>
        );
      })}
    </div>
  );
}