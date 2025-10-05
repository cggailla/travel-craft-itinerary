import React, { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { EnrichedStep } from '@/types/enrichedStep';
import { formatSegmentType } from '@/services/bookletService';
import { ParsedStepInfo } from '@/services/aiContentService';
interface StepTemplateProps {
  step: EnrichedStep;
  aiContent?: {
    overview: string;
    tips: string[];
    localContext?: string;
    images?: string[];
  };
  isLoading?: boolean;
  nextStepStartDate?: Date;
  parsedStepInfo?: ParsedStepInfo;
}
export function StepTemplate({
  step,
  aiContent,
  isLoading,
  nextStepStartDate,
  parsedStepInfo
}: StepTemplateProps) {
  const [deletedSegments, setDeletedSegments] = useState<Set<string>>(new Set());
  const [hiddenOverview, setHiddenOverview] = useState(false);
  const [hiddenTips, setHiddenTips] = useState(false);
  const [hiddenLocalContext, setHiddenLocalContext] = useState(false);
  const formatDate = (date: Date) => format(date, 'EEEE d MMMM yyyy', {
    locale: fr
  });
  const calculateEndDate = () => {
    if (nextStepStartDate) {
      const calculatedEndDate = new Date(nextStepStartDate);
      calculatedEndDate.setDate(calculatedEndDate.getDate() - 1);
      return calculatedEndDate;
    }
    return step.endDate;
  };
  const endDate = calculateEndDate();
  const isSingleDay = step.startDate.toDateString() === endDate.toDateString();
  return <>
      <style>{`
        @media print {
          .hidden-in-pdf { display: none !important; }
        }
      `}</style>
      
      <div className="step-container mb-8 pb-6 border-b border-gray-200">
        {/* Date et lieu */}
        <div className="mb-4">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-sm text-gray-600 font-medium">
              {formatDate(step.startDate)}
              {!isSingleDay && ` → ${formatDate(endDate)}`}
            </p>
            <h2 className="text-lg font-bold text-gray-800 uppercase">
              {parsedStepInfo?.title || step.stepTitle}
            </h2>
          </div>
        </div>

        {/* Overview */}
        {aiContent?.overview && !hiddenOverview && <div className="mb-4 relative group">
            <p className="text-sm text-gray-700 leading-relaxed italic pl-4 border-l-2 border-gray-300">
              {aiContent.overview}
            </p>
            <button onClick={() => setHiddenOverview(true)} className="absolute top-0 right-0 text-gray-400 hover:text-gray-600 print:hidden" aria-label="Supprimer">
              ×
            </button>
          </div>}

        {/* Segments */}
        <div className="space-y-4">
          {step.sections.map((section, sectionIndex) => {
          if (!section.segments || section.segments.length === 0) return null;
          const visibleSegments = section.segments.filter(segment => !deletedSegments.has(segment.id));
          if (visibleSegments.length === 0) return null;
          return <div key={sectionIndex} className="space-y-3">
                {visibleSegments.map(segment => {
              const startDate = segment.start_date ? new Date(segment.start_date) : null;
              const endDate = segment.end_date ? new Date(segment.end_date) : null;
              const formatTime = (date: Date | null) => {
                if (!date) return null;
                return format(date, 'HH:mm', {
                  locale: fr
                });
              };
              const startTime = formatTime(startDate);
              const endTime = formatTime(endDate);
              return <div key={segment.id} className="relative group">
                      <div className="flex gap-4">
                        {/* Heure */}
                        {startTime}
                        
                        {/* Type + Contenu */}
                        <div className="flex-1">
                          <div className="flex items-baseline gap-3">
                            <p className="text-sm font-semibold text-gray-800 capitalize">
                              {formatSegmentType(segment.segment_type)}
                            </p>
                            <p className="text-sm text-gray-900 font-medium">
                              {segment.title}
                            </p>
                          </div>
                          
                          {/* Description */}
                          {segment.description && <p className="text-sm text-gray-700 mt-1 leading-relaxed">
                              {segment.description}
                            </p>}
                          
                          {/* Détails */}
                          <div className="mt-1 space-y-0.5">
                            {segment.provider && <p className="text-xs text-gray-600">
                                • {segment.segment_type === 'flight' && 'Vol : '}
                                {segment.segment_type === 'train' && 'Train : '}
                                {segment.segment_type === 'hotel' && 'Hôtel : '}
                                {segment.segment_type === 'activity' && 'Activité : '}
                                {segment.provider}
                                {segment.reference_number && ` - ${segment.reference_number}`}
                              </p>}
                            
                            {segment.address && <p className="text-xs text-gray-600">• Adresse : {segment.address}</p>}
                            
                            {segment.phone && <p className="text-xs text-gray-600">• Tél : {segment.phone}</p>}
                            
                            {segment.checkin_time && <p className="text-xs text-gray-600">
                                • Check-in : {segment.checkin_time} | Check-out : {segment.checkout_time || 'N/A'}
                              </p>}
                            
                            {segment.duration && <p className="text-xs text-gray-600">• Durée : {segment.duration}</p>}
                            
                            {endTime && startTime !== endTime && <p className="text-xs text-gray-600">• Arrivée : {endTime}</p>}
                          </div>
                        </div>
                      </div>
                      
                      {/* Bouton suppression */}
                      <button onClick={() => setDeletedSegments(prev => new Set(prev).add(segment.id))} className="absolute top-0 right-0 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 print:hidden" aria-label="Supprimer">
                        ×
                      </button>
                    </div>;
            })}
              </div>;
        })}
        </div>

        {/* Tips */}
        {aiContent?.tips && aiContent.tips.length > 0 && !hiddenTips && <div className="mt-4 pl-4 border-l-2 border-yellow-400 relative group">
            <p className="text-xs font-semibold text-gray-700 mb-2">🌺 NOTE</p>
            <ul className="space-y-1">
              {aiContent.tips.map((tip, index) => <li key={index} className="text-xs text-gray-700 leading-relaxed">
                  {tip}
                </li>)}
            </ul>
            <button onClick={() => setHiddenTips(true)} className="absolute top-0 right-0 text-gray-400 hover:text-gray-600 print:hidden" aria-label="Supprimer">
              ×
            </button>
          </div>}

        {/* Local Context */}
        {aiContent?.localContext && !hiddenLocalContext && <div className="mt-4 pl-4 border-l-2 border-green-400 relative group">
            <p className="text-xs font-semibold text-gray-700 mb-1">🌍 Info locale</p>
            <p className="text-xs text-gray-700 leading-relaxed">{aiContent.localContext}</p>
            <button onClick={() => setHiddenLocalContext(true)} className="absolute top-0 right-0 text-gray-400 hover:text-gray-600 print:hidden" aria-label="Supprimer">
              ×
            </button>
          </div>}
      </div>
    </>;
}