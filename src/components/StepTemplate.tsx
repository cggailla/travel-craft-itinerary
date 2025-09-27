import React from 'react';
import { Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { EnrichedStep } from '@/types/enrichedStep';
import { formatSegmentType } from '@/services/bookletService';
interface StepTemplateProps {
  step: EnrichedStep;
  aiContent?: {
    overview: string;
    tips: string[];
    localContext?: string;
  };
  isLoading?: boolean;
  nextStepStartDate?: Date;
}
export function StepTemplate({
  step,
  aiContent,
  isLoading,
  nextStepStartDate
}: StepTemplateProps) {
  const formatDate = (date: Date) => format(date, 'EEEE d MMMM yyyy', {
    locale: fr
  });

  // Calculate robust end date: next step start date - 1 day, or step's own end date if no next step
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
  return <div className="mb-8 p-6 bg-card rounded-lg border relative">
      {/* Date in top right corner */}
      <div className="absolute top-6 right-6 text-base font-medium text-foreground">
        {formatDate(step.startDate)}
        {!isSingleDay && <span className="text-muted-foreground mx-2">→</span>}
        {!isSingleDay && formatDate(endDate)}
      </div>

      {/* Header */}
      <div className="mb-6 pr-32">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">{step.stepTitle}</h2>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {step.primaryLocation}
          </span>
        </div>
      </div>

      {/* AI Overview */}
      {aiContent?.overview && <div className="mb-6 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-medium mb-2 text-foreground">Aperçu</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{aiContent.overview}</p>
        </div>}

      {/* Sections */}
      {step.sections.map((section, sectionIndex) => {
      if (!section.segments || section.segments.length === 0) return null;
      return <div key={sectionIndex} className="mb-6">
            

            <div className="space-y-2">
              {section.segments.map((segment, index) => {
                const hasStartDate = segment.start_date;
                const hasEndDate = segment.end_date;
                const startDate = hasStartDate ? new Date(segment.start_date) : null;
                const endDate = hasEndDate ? new Date(segment.end_date) : null;
                
                const formatSegmentDate = () => {
                  if (!startDate) return null;
                  
                  if (!endDate || startDate.toDateString() === endDate.toDateString()) {
                    return format(startDate, 'd MMM yyyy', { locale: fr });
                  } else {
                    return `${format(startDate, 'd MMM', { locale: fr })} → ${format(endDate, 'd MMM yyyy', { locale: fr })}`;
                  }
                };

                const segmentDateStr = formatSegmentDate();
                const isTransfer = segment.segment_type === 'transfer';
                const nextSegment = section.segments[index + 1];

                // Main segments (flights, hotels, activities, cars) get prominent display
                if (['flight', 'hotel', 'activity', 'car'].includes(segment.segment_type)) {
                  return (
                    <div key={segment.id}>
                      <div className="relative p-4 bg-background border-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                        {/* Flight Layout */}
                        {segment.segment_type === 'flight' && (
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                              <span className="text-white text-xl">✈️</span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-base text-foreground">{segment.title}</h4>
                                {segment.reference_number && (
                                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                    Vol {segment.reference_number}
                                  </span>
                                )}
                              </div>
                              {segment.provider && <p className="text-sm text-muted-foreground mb-1 font-medium">{segment.provider}</p>}
                              {segment.description && <p className="text-sm text-muted-foreground mb-2">{segment.description}</p>}
                              {segment.address && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {segment.address}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              {segmentDateStr && (
                                <div className="flex items-center gap-2 justify-end mb-2">
                                  <Calendar className="h-4 w-4 text-blue-600" />
                                  <span className="text-sm font-medium text-foreground">{segmentDateStr}</span>
                                </div>
                              )}
                              <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                                {formatSegmentType(segment.segment_type)}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Hotel Layout */}
                        {segment.segment_type === 'hotel' && (
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                              <span className="text-white text-xl">🏨</span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-base text-foreground">{segment.title}</h4>
                                {segment.reference_number && (
                                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                    Rés. {segment.reference_number}
                                  </span>
                                )}
                              </div>
                              {segment.provider && <p className="text-sm text-muted-foreground mb-1 font-medium">{segment.provider}</p>}
                              {segment.description && <p className="text-sm text-muted-foreground mb-2">{segment.description}</p>}
                              {segment.address && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {segment.address}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              {segmentDateStr && (
                                <div className="flex items-center gap-2 justify-end mb-2">
                                  <Calendar className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-medium text-foreground">{segmentDateStr}</span>
                                </div>
                              )}
                              <span className="inline-block px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
                                {formatSegmentType(segment.segment_type)}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Activity Layout */}
                        {segment.segment_type === 'activity' && (
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                              <span className="text-white text-xl">🎯</span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-base text-foreground">{segment.title}</h4>
                                {segment.reference_number && (
                                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                    {segment.reference_number}
                                  </span>
                                )}
                              </div>
                              {segment.provider && <p className="text-sm text-muted-foreground mb-1 font-medium">{segment.provider}</p>}
                              {segment.description && <p className="text-sm text-muted-foreground mb-2">{segment.description}</p>}
                              {segment.address && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {segment.address}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              {segmentDateStr && (
                                <div className="flex items-center gap-2 justify-end mb-2">
                                  <Calendar className="h-4 w-4 text-purple-600" />
                                  <span className="text-sm font-medium text-foreground">{segmentDateStr}</span>
                                </div>
                              )}
                              <span className="inline-block px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                                {formatSegmentType(segment.segment_type)}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Car Layout */}
                        {segment.segment_type === 'car' && (
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                              <span className="text-white text-xl">🚗</span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-base text-foreground">{segment.title}</h4>
                                {segment.reference_number && (
                                  <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                                    {segment.reference_number}
                                  </span>
                                )}
                              </div>
                              {segment.provider && <p className="text-sm text-muted-foreground mb-1 font-medium">{segment.provider}</p>}
                              {segment.description && <p className="text-sm text-muted-foreground mb-2">{segment.description}</p>}
                              {segment.address && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {segment.address}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              {segmentDateStr && (
                                <div className="flex items-center gap-2 justify-end mb-2">
                                  <Calendar className="h-4 w-4 text-orange-600" />
                                  <span className="text-sm font-medium text-foreground">{segmentDateStr}</span>
                                </div>
                              )}
                              <span className="inline-block px-2 py-1 bg-orange-50 text-orange-700 rounded text-xs">
                                {formatSegmentType(segment.segment_type)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // Transfer segments get a connecting line treatment
                if (isTransfer) {
                  return (
                    <div key={segment.id} className="relative">
                      <div className="flex items-center justify-center py-2">
                        <div className="flex-1 h-px bg-border"></div>
                        <div className="px-4 py-2 bg-muted/50 rounded-full border flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                          <span className="font-medium">{segment.title}</span>
                          {segment.provider && <span>• {segment.provider}</span>}
                          {segmentDateStr && <span>• {segmentDateStr}</span>}
                        </div>
                        <div className="flex-1 h-px bg-border"></div>
                      </div>
                    </div>
                  );
                }

                // Other segment types get a minimal card
                return (
                  <div key={segment.id} className="relative p-3 bg-muted/30 border border-dashed rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm text-foreground">{segment.title}</h4>
                          {segment.reference_number && (
                            <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded">
                              {segment.reference_number}
                            </span>
                          )}
                        </div>
                        {segment.provider && <p className="text-xs text-muted-foreground mb-1">{segment.provider}</p>}
                        {segment.description && <p className="text-xs text-muted-foreground mb-2">{segment.description}</p>}
                        {segment.address && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {segment.address}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {segmentDateStr && (
                          <p className="flex items-center gap-1 justify-end mb-1">
                            <Calendar className="h-3 w-3" />
                            {segmentDateStr}
                          </p>
                        )}
                        <span className="inline-block px-2 py-1 bg-muted text-muted-foreground rounded">
                          {formatSegmentType(segment.segment_type)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>;
    })}

      {/* AI Tips */}
      {aiContent?.tips && aiContent.tips.length > 0 && <div className="mb-4 p-4 bg-primary/5 border-l-4 border-primary rounded-lg">
          <h3 className="font-medium mb-2 text-foreground">Conseils pratiques</h3>
          <ul className="space-y-1">
            {aiContent.tips.map((tip, index) => <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>{tip}</span>
              </li>)}
          </ul>
        </div>}

      {/* AI Local Context */}
      {aiContent?.localContext && <div className="p-4 bg-accent/20 rounded-lg">
          <h3 className="font-medium mb-2 text-foreground">À savoir</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{aiContent.localContext}</p>
        </div>}

      {isLoading && <div className="mt-4 p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
            Génération du contenu enrichi...
          </div>
        </div>}
    </div>;
}