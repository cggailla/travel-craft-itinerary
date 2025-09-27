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
}
export function StepTemplate({
  step,
  aiContent,
  isLoading
}: StepTemplateProps) {
  const formatDate = (date: Date) => format(date, 'EEEE d MMMM yyyy', {
    locale: fr
  });
  return <div className="mb-8 p-6 bg-card rounded-lg border">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">{step.stepTitle}</h2>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {step.primaryLocation}
          </span>
          <span>{formatDate(step.startDate)} → {formatDate(step.endDate)}</span>
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
            

            <div className="space-y-3">
              {section.segments.map(segment => <div key={segment.id} className="flex items-start gap-3 p-3 bg-background border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm text-foreground">{segment.title}</h4>
                      {segment.reference_number && <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded">
                          {segment.reference_number}
                        </span>}
                    </div>

                    {segment.provider && <p className="text-xs text-muted-foreground mb-1">{segment.provider}</p>}

                    {segment.description && <p className="text-xs text-muted-foreground mb-2">{segment.description}</p>}

                    {segment.address && <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {segment.address}
                      </p>}
                  </div>

                  <div className="text-right text-xs text-muted-foreground">
                    <div>{formatSegmentType(segment.segment_type)}</div>
                  </div>
                </div>)}
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