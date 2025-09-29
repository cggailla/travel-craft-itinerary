import React, { useState } from 'react';
import { Calendar, MapPin } from 'lucide-react';
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
  parsedStepInfo?: ParsedStepInfo; // New prop for parsed trip summary data
}

export function StepTemplate({
  step,
  aiContent,
  isLoading,
  nextStepStartDate,
  parsedStepInfo
}: StepTemplateProps) {
  // Gérer les éléments supprimés localement
  const [deletedImages, setDeletedImages] = useState<Set<string>>(new Set());
  const [deletedSegments, setDeletedSegments] = useState<Set<string>>(new Set());
  const [hiddenOverview, setHiddenOverview] = useState(false);
  const [hiddenTips, setHiddenTips] = useState(false);
  const [hiddenLocalContext, setHiddenLocalContext] = useState(false);
  
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
          <h2 className="text-xl font-semibold text-foreground">
            {parsedStepInfo?.title || step.stepTitle}
          </h2>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {parsedStepInfo?.location || step.primaryLocation}
          </span>
        </div>
      </div>

      {/* AI Overview */}
      {aiContent?.overview && !hiddenOverview && (
        <div className="mb-6 p-4 bg-muted/50 rounded-lg relative group">
          <h3 className="font-medium mb-2 text-foreground">Aperçu</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{aiContent.overview}</p>
          <button
            onClick={() => setHiddenOverview(true)}
            className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            aria-label="Supprimer l'aperçu"
          >
            <span className="text-white text-sm font-light">×</span>
          </button>
        </div>
      )}

      {/* Images */}
      {aiContent?.images && aiContent.images.length > 0 && (
        <div className="mb-6">
          <div className="grid grid-cols-1 gap-3">
            {aiContent.images
              .filter(imageUrl => !deletedImages.has(imageUrl))
              .map((imageUrl, index) => (
              <div key={imageUrl} className="relative rounded-lg overflow-hidden bg-muted/30 group">
                <img
                  src={imageUrl}
                  alt={`Vue de ${parsedStepInfo?.location || step.primaryLocation}`}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    // Hard rule: hide the image if it fails to load
                    console.warn('Failed to load image:', imageUrl);
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                {/* Bouton de suppression au survol */}
                <button
                  onClick={() => {
                    setDeletedImages(prev => new Set(prev).add(imageUrl));
                    console.log('Image supprimée du booklet:', imageUrl);
                  }}
                  className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  aria-label="Supprimer l'image"
                >
                  <span className="text-white text-sm font-light">×</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sections */}
      {step.sections.map((section, sectionIndex) => {
        if (!section.segments || section.segments.length === 0) return null;
        
        // Filtrer les segments supprimés
        const visibleSegments = section.segments.filter(segment => !deletedSegments.has(segment.id));
        if (visibleSegments.length === 0) return null;
        
        return (
          <div key={sectionIndex} className="mb-6">
            <div className="space-y-3">
              {visibleSegments.map(segment => {
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
                    <div key={segment.id} className="relative flex items-center my-3 group">
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
                      {/* Bouton de suppression pour les segments de voyage */}
                      <button
                        onClick={() => setDeletedSegments(prev => new Set(prev).add(segment.id))}
                        className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        aria-label="Supprimer le segment"
                      >
                        <span className="text-white text-sm font-light">×</span>
                      </button>
                    </div>
                  );
                }

                // Main segments (hotel, activity, etc.) - keep boxed style
                return (
                  <div key={segment.id} className="relative p-3 bg-background border rounded-lg group">
                    {segment.segment_type === 'hotel' && (
                       <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm text-foreground">
                              {segment.title}
                            </h4>
                            {segment.reference_number && (
                              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                                Rés. {segment.reference_number}
                              </span>
                            )}
                          </div>
                          {segment.provider && (
                            <p className="text-xs text-muted-foreground mb-1">
                              🏨 {segment.provider}
                              {segment.star_rating && (
                                <span className="ml-2">
                                  {'⭐'.repeat(Number(segment.star_rating) || 0)}
                                </span>
                              )}
                            </p>
                          )}
                          {segment.description && <p className="text-xs text-muted-foreground mb-2">{segment.description}</p>}
                          {segment.address && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {segment.address}
                            </p>
                          )}
                          
                          {/* Enriched hotel information */}
                          {(segment.phone || segment.checkin_time || segment.checkout_time) && (
                            <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                               <div className="flex gap-4">
                                 {segment.phone && <p><strong>Tél:</strong> {segment.phone}</p>}
                                 <div className="flex flex-col gap-1">
                                   {segment.checkin_time && <p><strong>Check-in:</strong> {segment.checkin_time}</p>}
                                   {segment.checkout_time && <p><strong>Check-out:</strong> {segment.checkout_time}</p>}
                                 </div>
                               </div>
                             </div>
                           )}
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
                          {(segment.phone || segment.duration || segment.opening_hours || segment.booking_required !== null) && (
                            <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                              <div className="grid grid-cols-2 gap-2">
                                {segment.phone && <p><strong>Tél:</strong> {segment.phone}</p>}
                                {segment.duration && <p><strong>Durée:</strong> {segment.duration}</p>}
                                {segment.booking_required !== null && <p><strong>Réservation:</strong> {segment.booking_required ? 'Requise' : 'Non requise'}</p>}
                              </div>
                              {segment.opening_hours && (
                                <p className="mt-1"><strong>Horaires:</strong> {segment.opening_hours}</p>
                              )}
                            </div>
                          )}
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
                          {(segment.phone || segment.route || segment.duration) && (
                            <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                              <div className="grid grid-cols-2 gap-2">
                                {segment.phone && <p><strong>Tél:</strong> {segment.phone}</p>}
                                {segment.route && <p><strong>Route:</strong> {segment.route}</p>}
                                {segment.duration && <p><strong>Durée:</strong> {segment.duration}</p>}
                              </div>
                            </div>
                          )}
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
                          {(segment.iata_code || segment.icao_code) && (
                            <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                              <div className="grid grid-cols-2 gap-2">
                                {segment.iata_code && <p><strong>Code IATA:</strong> {segment.iata_code}</p>}
                                {segment.icao_code && <p><strong>Code ICAO:</strong> {segment.icao_code}</p>}
                              </div>
                            </div>
                          )}
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
                          {(segment.phone || segment.iata_code || segment.icao_code || segment.duration || 
                            segment.terminals?.length || segment.route || segment.ticket_price || segment.facilities?.length || 
                            segment.departure_times?.length) && (
                            <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                              <div className="grid grid-cols-2 gap-2">
                                {segment.phone && <p><strong>Tél:</strong> {segment.phone}</p>}
                                {segment.iata_code && <p><strong>Code IATA:</strong> {segment.iata_code}</p>}
                                {segment.icao_code && <p><strong>Code ICAO:</strong> {segment.icao_code}</p>}
                                {segment.duration && <p><strong>Durée:</strong> {segment.duration}</p>}
                                {segment.terminals && segment.terminals.length > 0 && <p><strong>Terminaux:</strong> {segment.terminals.join(', ')}</p>}
                                {segment.route && <p><strong>Route:</strong> {segment.route}</p>}
                                {segment.ticket_price && <p><strong>Prix billet:</strong> {segment.ticket_price}</p>}
                              </div>
                              {segment.facilities && segment.facilities.length > 0 && (
                                <p className="mt-1"><strong>Services:</strong> {segment.facilities.join(', ')}</p>
                              )}
                              {segment.departure_times && segment.departure_times.length > 0 && (
                                <p className="mt-1"><strong>Horaires:</strong> {segment.departure_times.join(', ')}</p>
                              )}
                            </div>
                          )}
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
                    
                    {/* Bouton de suppression pour les segments principaux */}
                    <button
                      onClick={() => setDeletedSegments(prev => new Set(prev).add(segment.id))}
                      className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                      aria-label="Supprimer le segment"
                    >
                      <span className="text-white text-sm font-light">×</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* AI Tips */}
      {aiContent?.tips && aiContent.tips.length > 0 && !hiddenTips && (
        <div className="mb-4 p-4 bg-primary/5 border-l-4 border-primary rounded-lg relative group">
          <h3 className="font-medium mb-2 text-foreground">Conseils pratiques</h3>
          <ul className="space-y-1">
            {aiContent.tips.map((tip, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => setHiddenTips(true)}
            className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            aria-label="Supprimer les conseils"
          >
            <span className="text-white text-sm font-light">×</span>
          </button>
        </div>
      )}

      {/* AI Local Context */}
      {aiContent?.localContext && !hiddenLocalContext && (
        <div className="p-4 bg-accent/20 rounded-lg relative group">
          <h3 className="font-medium mb-2 text-foreground">À savoir</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{aiContent.localContext}</p>
          <button
            onClick={() => setHiddenLocalContext(true)}
            className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            aria-label="Supprimer le contexte local"
          >
            <span className="text-white text-sm font-light">×</span>
          </button>
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
