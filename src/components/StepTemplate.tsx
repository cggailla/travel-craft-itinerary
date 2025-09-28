import React from 'react';
import { Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { EnrichedStep } from '@/types/enrichedStep';
import { formatSegmentType } from '@/services/bookletService';
import { TravelSegment } from '@/types/travel';

// Helper function to render all enriched fields that are not null/empty
function renderEnrichedFields(segment: TravelSegment, excludeFields: string[] = []): JSX.Element | null {
  const enrichedFields: { [key: string]: string } = {
    phone: segment.phone || '',
    website: segment.website && segment.website !== 'N/A' ? segment.website : '',
    star_rating: segment.star_rating ? `${segment.star_rating}⭐` : '',
    checkin_time: segment.checkin_time || '',
    checkout_time: segment.checkout_time || '',
    opening_hours: segment.opening_hours || '',
    ticket_price: segment.ticket_price || '',
    activity_price: segment.activity_price || '',
    duration: segment.duration || '',
    booking_required: segment.booking_required !== null ? (segment.booking_required ? 'Requise' : 'Non requise') : '',
    route: segment.route || '',
    iata_code: segment.iata_code || '',
    icao_code: segment.icao_code || '',
    main_exhibitions: segment.main_exhibitions && segment.main_exhibitions.length > 0 ? segment.main_exhibitions.join(', ') : '',
    terminals: segment.terminals && segment.terminals.length > 0 ? segment.terminals.join(', ') : '',
    facilities: segment.facilities && segment.facilities.length > 0 ? segment.facilities.join(', ') : '',
    departure_times: segment.departure_times && segment.departure_times.length > 0 ? segment.departure_times.join(', ') : ''
  };

  const fieldLabels: { [key: string]: string } = {
    phone: 'Tél',
    website: 'Site web',
    star_rating: 'Étoiles',
    checkin_time: 'Check-in',
    checkout_time: 'Check-out', 
    opening_hours: 'Horaires',
    ticket_price: 'Prix billet',
    activity_price: 'Prix',
    duration: 'Durée',
    booking_required: 'Réservation',
    route: 'Route',
    iata_code: 'Code IATA',
    icao_code: 'Code ICAO',
    main_exhibitions: 'Expositions principales',
    terminals: 'Terminaux',
    facilities: 'Équipements',
    departure_times: 'Horaires de départ'
  };

  // Filter out excluded fields and empty values
  const fieldsToShow = Object.entries(enrichedFields)
    .filter(([key, value]) => !excludeFields.includes(key) && value.trim() !== '')
    .map(([key, value]) => ({ key, label: fieldLabels[key], value }));

  if (fieldsToShow.length === 0) return null;

  return (
    <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
      <div className="grid grid-cols-2 gap-2">
        {fieldsToShow.map(({ key, label, value }) => {
          if (key === 'website') {
            return (
              <p key={key} className="col-span-2">
                <strong>{label}:</strong>{' '}
                <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  {value}
                </a>
              </p>
            );
          }
          if (key === 'opening_hours' || key === 'main_exhibitions' || key === 'terminals' || key === 'facilities' || key === 'departure_times') {
            return (
              <p key={key} className="col-span-2">
                <strong>{label}:</strong> {value}
              </p>
            );
          }
          return (
            <p key={key}>
              <strong>{label}:</strong> {value}
            </p>
          );
        })}
      </div>
    </div>
  );
}

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

  return (
    <div className="mb-8 p-6 bg-card rounded-lg border relative">
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
      {aiContent?.overview && (
        <div className="mb-6 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-medium mb-2 text-foreground">Aperçu</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{aiContent.overview}</p>
        </div>
      )}

      {/* Sections */}
      {step.sections.map((section, sectionIndex) => {
        if (!section.segments || section.segments.length === 0) return null;
        
        return (
          <div key={sectionIndex} className="mb-6">
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
                  return (
                    <div key={segment.id} className="relative flex items-center my-3">
                      {/* Vertical dotted line */}
                      <div className="w-px h-12 border-l-2 border-dotted border-muted-foreground/40 flex-shrink-0"></div>
                      
                      {/* Segment info on the side */}
                      <div className="ml-4 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm text-muted-foreground">{segment.title}</h4>
                          {segment.reference_number && (
                            <span className="text-xs px-2 py-0.5 bg-muted/50 text-muted-foreground rounded">
                              {segment.reference_number}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {segment.provider && (
                            <span>
                              {segment.segment_type === 'flight' && '✈️'}
                              {segment.segment_type === 'car' && '🚗'}
                              {segment.segment_type === 'train' && '🚊'}
                              {segment.segment_type === 'transfer' && '🚌'}
                              {' '}{segment.provider}
                            </span>
                          )}
                          {segmentDateStr && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {segmentDateStr}
                            </span>
                          )}
                        </div>
                        {segment.description && <p className="text-xs text-muted-foreground/80 mt-1">{segment.description}</p>}
                      </div>
                    </div>
                  );
                }

                // Main segments (hotel, activity, etc.) - keep boxed style
                return (
                  <div key={segment.id} className="relative p-3 bg-background border rounded-lg">
                    {segment.segment_type === 'hotel' && (
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm text-foreground">{segment.title}</h4>
                            {segment.reference_number && (
                              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                                Rés. {segment.reference_number}
                              </span>
                            )}
                          </div>
                          {segment.provider && <p className="text-xs text-muted-foreground mb-1">🏨 {segment.provider}</p>}
                          {segment.description && <p className="text-xs text-muted-foreground mb-2">{segment.description}</p>}
                          {segment.address && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {segment.address}
                            </p>
                          )}
                          
                          {/* Enriched hotel information */}
                          {renderEnrichedFields(segment)}
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {segmentDateStr && (
                            <p className="flex items-center gap-1 justify-end mb-1">
                              <Calendar className="h-3 w-3" />
                              {segmentDateStr}
                            </p>
                          )}
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
                            {segment.reference_number && (
                              <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">
                                {segment.reference_number}
                              </span>
                            )}
                          </div>
                          {segment.provider && <p className="text-xs text-muted-foreground mb-1">🎯 {segment.provider}</p>}
                          {segment.description && <p className="text-xs text-muted-foreground mb-2">{segment.description}</p>}
                          {segment.address && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {segment.address}
                            </p>
                          )}
                          
                          {/* Enriched activity information */}
                          {renderEnrichedFields(segment)}
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {segmentDateStr && (
                            <p className="flex items-center gap-1 justify-end mb-1">
                              <Calendar className="h-3 w-3" />
                              {segmentDateStr}
                            </p>
                          )}
                        </div>
                        <div className="absolute bottom-2 right-2 text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">
                          {formatSegmentType(segment.segment_type)}
                        </div>
                      </div>
                    )}

                    {(segment.segment_type === 'boat' || segment.segment_type === 'other') && (
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm text-foreground">{segment.title}</h4>
                            {segment.reference_number && (
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                {segment.reference_number}
                              </span>
                            )}
                          </div>
                          {segment.provider && <p className="text-xs text-muted-foreground mb-1">⛵ {segment.provider}</p>}
                          {segment.description && <p className="text-xs text-muted-foreground mb-2">{segment.description}</p>}
                          {segment.address && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {segment.address}
                            </p>
                          )}
                          
                          {/* Enriched boat information */}
                          {renderEnrichedFields(segment)}
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {segmentDateStr && (
                            <p className="flex items-center gap-1 justify-end mb-1">
                              <Calendar className="h-3 w-3" />
                              {segmentDateStr}
                            </p>
                          )}
                        </div>
                        <div className="absolute bottom-2 right-2 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                          {formatSegmentType(segment.segment_type)}
                        </div>
                      </div>
                    )}

                    {segment.segment_type === 'flight' && (
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm text-foreground">{segment.title}</h4>
                            {segment.reference_number && (
                              <span className="text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded">
                                {segment.reference_number}
                              </span>
                            )}
                          </div>
                          {segment.provider && <p className="text-xs text-muted-foreground mb-1">✈️ {segment.provider}</p>}
                          {segment.description && <p className="text-xs text-muted-foreground mb-2">{segment.description}</p>}
                          {segment.address && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {segment.address}
                            </p>
                          )}
                          
                          {/* Enriched flight information */}
                          {renderEnrichedFields(segment)}
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {segmentDateStr && (
                            <p className="flex items-center gap-1 justify-end mb-1">
                              <Calendar className="h-3 w-3" />
                              {segmentDateStr}
                            </p>
                          )}
                        </div>
                        <div className="absolute bottom-2 right-2 text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded">
                          {formatSegmentType(segment.segment_type)}
                        </div>
                      </div>
                    )}

                    {/* Default layout for other segment types */}
                    {!['hotel', 'activity', 'boat', 'other', 'flight'].includes(segment.segment_type) && (
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
                          
                          {/* Enriched information for other segment types */}
                          {renderEnrichedFields(segment)}
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {segmentDateStr && (
                            <p className="flex items-center gap-1 justify-end mb-1">
                              <Calendar className="h-3 w-3" />
                              {segmentDateStr}
                            </p>
                          )}
                        </div>
                        <div className="absolute bottom-2 right-2 text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                          {formatSegmentType(segment.segment_type)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* AI Tips */}
      {aiContent?.tips && aiContent.tips.length > 0 && (
        <div className="mb-4 p-4 bg-primary/5 border-l-4 border-primary rounded-lg">
          <h3 className="font-medium mb-2 text-foreground">Conseils pratiques</h3>
          <ul className="space-y-1">
            {aiContent.tips.map((tip, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* AI Local Context */}
      {aiContent?.localContext && (
        <div className="p-4 bg-accent/20 rounded-lg">
          <h3 className="font-medium mb-2 text-foreground">À savoir</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{aiContent.localContext}</p>
        </div>
      )}

      {isLoading && (
        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
            Génération du contenu enrichi...
          </div>
        </div>
      )}
    </div>
  );
}
