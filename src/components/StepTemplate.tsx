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
            

            <div className="space-y-3">
              {section.segments.map(segment => {
                const hasStartDate = segment.start_date;
                const hasEndDate = segment.end_date;
                const startDate = hasStartDate ? new Date(segment.start_date) : null;
                const endDate = hasEndDate ? new Date(segment.end_date) : null;
                
                const formatSegmentDate = () => {
                  if (!startDate) return null;
                  
                  if (!endDate || startDate.toDateString() === endDate.toDateString()) {
                    // Single day or no end date
                    return format(startDate, 'd MMM yyyy', { locale: fr });
                  } else {
                    // Multiple days
                    return `${format(startDate, 'd MMM', { locale: fr })} → ${format(endDate, 'd MMM yyyy', { locale: fr })}`;
                  }
                };

                const segmentDateStr = formatSegmentDate();

                // Travel segments (flight, car, train, transfer) - vertical dotted line style
                if (['flight', 'car', 'train', 'transfer'].includes(segment.segment_type)) {
                  return <div key={segment.id} className="relative flex items-center my-3">
                    {/* Vertical dotted line */}
                    <div className="w-px h-12 border-l-2 border-dotted border-muted-foreground/40 flex-shrink-0"></div>
                    
                    {/* Segment info on the side */}
                    <div className="ml-4 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm text-muted-foreground">{segment.title}</h4>
                        {segment.reference_number && <span className="text-xs px-2 py-0.5 bg-muted/50 text-muted-foreground rounded">
                            {segment.reference_number}
                          </span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {segment.provider && <span>
                          {segment.segment_type === 'flight' && '✈️'}
                          {segment.segment_type === 'car' && '🚗'}
                          {segment.segment_type === 'train' && '🚊'}
                          {segment.segment_type === 'transfer' && '🚌'}
                          {' '}{segment.provider}
                        </span>}
                        {segmentDateStr && <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {segmentDateStr}
                        </span>}
                      </div>
                      {segment.description && <p className="text-xs text-muted-foreground/80 mt-1">{segment.description}</p>}
                    </div>
                  </div>;
                }

                // Main segments (hotel, activity) - keep boxed style
                return <div key={segment.id} className="relative p-3 bg-background border rounded-lg">
                  {segment.segment_type === 'hotel' && (
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm text-foreground">{segment.title}</h4>
                          {segment.reference_number && <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                              Rés. {segment.reference_number}
                            </span>}
                        </div>
                        {segment.provider && <p className="text-xs text-muted-foreground mb-1">🏨 {segment.provider}</p>}
                        {segment.description && <p className="text-xs text-muted-foreground mb-2">{segment.description}</p>}
                        {segment.address && <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {segment.address}
                          </p>}
                        
                        {/* Enriched hotel information */}
                        {segment.enriched && (
                          <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                            <div className="grid grid-cols-2 gap-2">
                              {segment.enriched.phone && <p><strong>Tél:</strong> {segment.enriched.phone}</p>}
                              {segment.enriched.checkin_time && <p><strong>Check-in:</strong> {segment.enriched.checkin_time}</p>}
                              {segment.enriched.checkout_time && <p><strong>Check-out:</strong> {segment.enriched.checkout_time}</p>}
                              {segment.enriched.star_rating && <p><strong>Étoiles:</strong> {segment.enriched.star_rating}⭐</p>}
                            </div>
                            {segment.enriched.website && (
                              <p className="mt-1"><strong>Site:</strong> <a href={segment.enriched.website} target="_blank" rel="noopener noreferrer" className="text-primary underline">{segment.enriched.website}</a></p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {segmentDateStr && <p className="flex items-center gap-1 justify-end mb-1">
                            <Calendar className="h-3 w-3" />
                            {segmentDateStr}
                          </p>}
                      </div>
                      <div className="absolute bottom-2 right-2 text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                        {formatSegmentType(segment.segment_type)}
                      </div>
                    </div>
                  )}

                  {segment.segment_type === 'activity' && (
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm text-foreground">{segment.title}</h4>
                          {segment.reference_number && <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">
                              {segment.reference_number}
                            </span>}
                        </div>
                        {segment.provider && <p className="text-xs text-muted-foreground mb-1">🎯 {segment.provider}</p>}
                        {segment.description && <p className="text-xs text-muted-foreground mb-2">{segment.description}</p>}
                        {segment.address && <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {segment.address}
                          </p>}
                        
                        {/* Enriched activity information */}
                        {segment.enriched && (
                          <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                            <div className="grid grid-cols-2 gap-2">
                              {segment.enriched.phone && <p><strong>Tél:</strong> {segment.enriched.phone}</p>}
                              {segment.enriched.opening_hours && <p><strong>Horaires:</strong> {segment.enriched.opening_hours}</p>}
                              {segment.enriched.activity_price && <p><strong>Prix:</strong> {segment.enriched.activity_price}</p>}
                              {segment.enriched.duration && <p><strong>Durée:</strong> {segment.enriched.duration}</p>}
                              {segment.enriched.booking_required !== undefined && <p><strong>Réservation:</strong> {segment.enriched.booking_required ? 'Requise' : 'Non requise'}</p>}
                            </div>
                            {segment.enriched.website && (
                              <p className="mt-1"><strong>Site:</strong> <a href={segment.enriched.website} target="_blank" rel="noopener noreferrer" className="text-primary underline">{segment.enriched.website}</a></p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {segmentDateStr && <p className="flex items-center gap-1 justify-end mb-1">
                            <Calendar className="h-3 w-3" />
                            {segmentDateStr}
                          </p>}
                      </div>
                      <div className="absolute bottom-2 right-2 text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">
                        {formatSegmentType(segment.segment_type)}
                      </div>
                    </div>
                  )}

                  {/* Default layout for other segment types */}
                  {!['hotel', 'activity'].includes(segment.segment_type) && (
                    <div className="flex items-start gap-3">
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
                        
                        {/* Enriched information for airports, boats, etc. */}
                        {segment.enriched && (
                          <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                            <div className="grid grid-cols-2 gap-2">
                              {segment.enriched.phone && <p><strong>Tél:</strong> {segment.enriched.phone}</p>}
                              {segment.enriched.iata_code && <p><strong>Code IATA:</strong> {segment.enriched.iata_code}</p>}
                              {segment.enriched.icao_code && <p><strong>Code ICAO:</strong> {segment.enriched.icao_code}</p>}
                              {segment.enriched.duration && <p><strong>Durée:</strong> {segment.enriched.duration}</p>}
                              {segment.enriched.terminals && segment.enriched.terminals.length > 0 && <p><strong>Terminaux:</strong> {segment.enriched.terminals.join(', ')}</p>}
                              {segment.enriched.route && <p><strong>Route:</strong> {segment.enriched.route}</p>}
                              {segment.enriched.boat_ticket_price && <p><strong>Prix billet:</strong> {segment.enriched.boat_ticket_price}</p>}
                            </div>
                            {segment.enriched.facilities && segment.enriched.facilities.length > 0 && (
                              <p className="mt-1"><strong>Services:</strong> {segment.enriched.facilities.join(', ')}</p>
                            )}
                            {segment.enriched.departure_times && segment.enriched.departure_times.length > 0 && (
                              <p className="mt-1"><strong>Horaires:</strong> {segment.enriched.departure_times.join(', ')}</p>
                            )}
                            {segment.enriched.website && (
                              <p className="mt-1"><strong>Site:</strong> <a href={segment.enriched.website} target="_blank" rel="noopener noreferrer" className="text-primary underline">{segment.enriched.website}</a></p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {segmentDateStr && <p className="flex items-center gap-1 justify-end mb-1">
                            <Calendar className="h-3 w-3" />
                            {segmentDateStr}
                          </p>}
                      </div>
                      <div className="absolute bottom-2 right-2 text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                        {formatSegmentType(segment.segment_type)}
                      </div>
                    </div>
                  )}
                </div>;
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