import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, MapPin, Clock, Plane, Hotel, Car, Activity, FileText, CheckCircle } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getTravelSegments, validateSegments } from '@/services/documentService';
import { TravelSegment } from '@/types/travel';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
interface TravelTimelineNewProps {
  documentIds?: string[];
  tripId?: string;
  onValidated?: () => void;
}
export default function TravelTimelineNew({
  documentIds,
  tripId,
  onValidated
}: TravelTimelineNewProps) {
  const [timeline, setTimeline] = useState<{
    date: string;
    segments: TravelSegment[];
  }[]>([]);
  const [segments, setSegments] = useState<TravelSegment[]>([]);
  const [undatedSegments, setUndatedSegments] = useState<TravelSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<TravelSegment | null>(null);
  const {
    toast
  } = useToast();
  useEffect(() => {
    if (tripId) {
      loadTravelSegments(tripId);
    }
  }, [documentIds, tripId]);
  const loadTravelSegments = async (tripId?: string) => {
    try {
      setLoading(true);
      const response = await getTravelSegments(tripId, 'all');
      if (response.success) {
        setSegments(response.segments.filter(s => !tripId || s.documents?.trip_id === tripId));
        setTimeline(response.timeline.filter(day => day.segments.some(s => !tripId || s.documents?.trip_id === tripId)));
        setUndatedSegments((response.undated_segments || []).filter(s => !tripId || s.documents?.trip_id === tripId));
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Error loading segments:', error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les segments de voyage",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleValidateAll = async () => {
    const unvalidatedSegments = segments.filter(s => !s.validated);
    if (unvalidatedSegments.length === 0) {
      toast({
        title: "Aucun segment à valider",
        description: "Tous les segments sont déjà validés"
      });
      return;
    }
    try {
      setValidating(true);
      const segmentIds = unvalidatedSegments.map(s => s.id);
      const result = await validateSegments(segmentIds);
      if (result.success) {
        // Update local state
        setSegments(prev => prev.map(s => segmentIds.includes(s.id) ? {
          ...s,
          validated: true
        } : s));
        toast({
          title: "Validation réussie",
          description: `${segmentIds.length} segments validés`
        });
        onValidated?.();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast({
        title: "Erreur de validation",
        description: "Impossible de valider les segments",
        variant: "destructive"
      });
    } finally {
      setValidating(false);
    }
  };
  const getSegmentIcon = (type: string) => {
    switch (type) {
      case 'flight':
        return <Plane className="h-4 w-4" />;
      case 'hotel':
        return <Hotel className="h-4 w-4" />;
      case 'car':
        return <Car className="h-4 w-4" />;
      case 'activity':
        return <Activity className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };
  const getSegmentColor = (type: string) => {
    switch (type) {
      case 'flight':
        return 'bg-primary text-primary-foreground';
      case 'hotel':
        return 'bg-secondary text-secondary-foreground';
      case 'car':
        return 'bg-accent text-accent-foreground';
      case 'activity':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };
  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return dateString;
      return format(date, 'EEEE d MMMM yyyy', {
        locale: fr
      });
    } catch {
      return dateString;
    }
  };
  const formatTime = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return '';
      return format(date, 'HH:mm');
    } catch {
      return '';
    }
  };
  if (loading) {
    return <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Chronologie du voyage</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-20 w-full" />
            </div>)}
        </CardContent>
      </Card>;
  }
  if (segments.length === 0) {
    return <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Chronologie du voyage</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun segment de voyage trouvé</p>
            <p className="text-sm">Uploadez et traitez des documents pour voir votre chronologie</p>
          </div>
        </CardContent>
      </Card>;
  }
  const unvalidatedCount = segments.filter(s => !s.validated).length;
  const validatedCount = segments.filter(s => s.validated).length;
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Chronologie du voyage</span>
            </CardTitle>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-secondary" />
              <span>{validatedCount} validés</span>
              <span className="text-muted-foreground">•</span>
              <span>{unvalidatedCount} en attente</span>
            </div>
            {unvalidatedCount > 0 && <Button onClick={handleValidateAll} disabled={validating} size="sm" className="bg-secondary hover:bg-secondary-hover">
                {validating ? 'Validation...' : `Valider tout (${unvalidatedCount})`}
              </Button>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Segments sans date */}
          {undatedSegments.length > 0 && (
            <div className="relative">
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground text-sm font-medium">
                  <FileText className="h-4 w-4" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Informations générales ({undatedSegments.length})
                </h3>
              </div>

              <div className="ml-12 space-y-3">
                {undatedSegments.map((segment) => (
                  <Card key={segment.id} className="relative border-dashed">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className={`p-2 rounded-lg ${getSegmentColor(segment.segment_type)}`}>
                            {getSegmentIcon(segment.segment_type)}
                          </div>
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 
                                className="font-semibold text-foreground cursor-pointer hover:text-primary transition-colors"
                                onClick={() => setSelectedSegment(segment)}
                              >
                                {segment.title}
                              </h4>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                  Sans date
                                </Badge>
                                {segment.validated && <Badge variant="default" className="bg-secondary text-secondary-foreground">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Validé
                                  </Badge>}
                              </div>
                            </div>

                            {segment.provider && <p className="text-sm text-muted-foreground">
                                {segment.provider}
                              </p>}

                            {segment.address && <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span>{segment.address}</span>
                              </div>}

                            {segment.reference_number && <p className="text-sm font-mono text-muted-foreground">
                                Réf: {segment.reference_number}
                              </p>}

                            {segment.description && <p className="text-sm text-muted-foreground line-clamp-2">
                                {segment.description}
                              </p>}

                            <div className="flex items-center justify-between pt-2">
                              <Badge variant="outline" className="text-xs">
                                Confiance: {Math.round((segment.confidence || 0) * 100)}%
                              </Badge>
                              {segment.documents && <p className="text-xs text-muted-foreground">
                                  Source: {segment.documents.file_name}
                                </p>}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {timeline.map((day, dayIndex) => <div key={dayIndex} className="relative">
              {(dayIndex > 0 || undatedSegments.length > 0)}
              
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  {undatedSegments.length > 0 ? dayIndex + 1 : dayIndex + 1}
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {formatDate(day.date)}
                </h3>
              </div>

              <div className="ml-12 space-y-3">
                {day.segments.map((segment, segmentIndex) => <Card key={segment.id} className="relative">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className={`p-2 rounded-lg ${getSegmentColor(segment.segment_type)}`}>
                            {getSegmentIcon(segment.segment_type)}
                          </div>
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 
                                className="font-semibold text-foreground cursor-pointer hover:text-primary transition-colors"
                                onClick={() => setSelectedSegment(segment)}
                              >
                                {segment.title}
                              </h4>
                              <div className="flex items-center space-x-2">
                                {segment.start_date && <Badge variant="outline" className="text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {formatTime(segment.start_date)}
                                  </Badge>}
                                {segment.validated && <Badge variant="default" className="bg-secondary text-secondary-foreground">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Validé
                                  </Badge>}
                              </div>
                            </div>

                            {segment.provider && <p className="text-sm text-muted-foreground">
                                {segment.provider}
                              </p>}

                            {segment.address && <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span>{segment.address}</span>
                              </div>}

                            {segment.reference_number && <p className="text-sm font-mono text-muted-foreground">
                                Réf: {segment.reference_number}
                              </p>}

                            {segment.description && <p className="text-sm text-muted-foreground line-clamp-2">
                                {segment.description}
                              </p>}

                            <div className="flex items-center justify-between pt-2">
                              <Badge variant="outline" className="text-xs">
                                Confiance: {Math.round((segment.confidence || 0) * 100)}%
                              </Badge>
                              {segment.documents && <p className="text-xs text-muted-foreground">
                                  Source: {segment.documents.file_name}
                                </p>}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>)}
              </div>
            </div>)}
        </div>
      </CardContent>
    </Card>

    {/* Segment Detail Dialog */}
    <Dialog open={!!selectedSegment} onOpenChange={() => setSelectedSegment(null)}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {selectedSegment && getSegmentIcon(selectedSegment.segment_type)}
            <span>{selectedSegment?.title}</span>
          </DialogTitle>
        </DialogHeader>
        
        {selectedSegment && (
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground border-b pb-2">Informations générales</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Type</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className={`p-1 rounded ${getSegmentColor(selectedSegment.segment_type)}`}>
                      {getSegmentIcon(selectedSegment.segment_type)}
                    </div>
                    <span className="capitalize">{selectedSegment.segment_type}</span>
                  </div>
                </div>
                
                <div>
                  <span className="text-sm text-muted-foreground">Statut</span>
                  <div className="mt-1">
                    <Badge variant={selectedSegment.validated ? "default" : "outline"} 
                           className={selectedSegment.validated ? "bg-secondary text-secondary-foreground" : ""}>
                      {selectedSegment.validated ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Validé
                        </>
                      ) : 'En attente'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Dates and Times */}
            {(selectedSegment.start_date || selectedSegment.end_date) && (
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground border-b pb-2">Dates et heures</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  {selectedSegment.start_date && (
                    <div>
                      <span className="text-sm text-muted-foreground">Date/heure de début</span>
                      <div className="mt-1 space-y-1">
                        <div className="font-medium">{formatDate(selectedSegment.start_date)}</div>
                        <div className="text-sm text-muted-foreground flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTime(selectedSegment.start_date)}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {selectedSegment.end_date && (
                    <div>
                      <span className="text-sm text-muted-foreground">Date/heure de fin</span>
                      <div className="mt-1 space-y-1">
                        <div className="font-medium">{formatDate(selectedSegment.end_date)}</div>
                        <div className="text-sm text-muted-foreground flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTime(selectedSegment.end_date)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Location and Provider */}
            {(selectedSegment.address || selectedSegment.provider) && (
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground border-b pb-2">Lieu et prestataire</h4>
                
                <div className="space-y-3">
                  {selectedSegment.provider && (
                    <div>
                      <span className="text-sm text-muted-foreground">Prestataire</span>
                      <div className="mt-1 font-medium">{selectedSegment.provider}</div>
                    </div>
                  )}
                  
                  {selectedSegment.address && (
                    <div>
                      <span className="text-sm text-muted-foreground">Adresse</span>
                      <div className="mt-1 flex items-start space-x-2">
                        <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <span>{selectedSegment.address}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reference and Description */}
            {(selectedSegment.reference_number || selectedSegment.description) && (
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground border-b pb-2">Détails</h4>
                
                <div className="space-y-3">
                  {selectedSegment.reference_number && (
                    <div>
                      <span className="text-sm text-muted-foreground">Numéro de référence</span>
                      <div className="mt-1 font-mono text-sm bg-muted px-2 py-1 rounded">
                        {selectedSegment.reference_number}
                      </div>
                    </div>
                  )}
                  
                   {selectedSegment.description && (
                     <div>
                       <span className="text-sm text-muted-foreground">Description</span>
                       <div className="mt-1 text-sm bg-muted p-3 rounded">
                         {selectedSegment.description}
                       </div>
                     </div>
                   )}

                   {/* Afficher les commentaires depuis raw_data si disponibles */}
                   {selectedSegment.raw_data?.comment && (
                     <div>
                       <span className="text-sm text-muted-foreground">Commentaire</span>
                       <div className="mt-1 text-sm bg-muted p-3 rounded">
                         {selectedSegment.raw_data.comment}
                       </div>
                     </div>
                   )}

                   {/* Afficher les notes additionnelles depuis raw_data si disponibles */}
                   {selectedSegment.raw_data?.notes && (
                     <div>
                       <span className="text-sm text-muted-foreground">Notes</span>
                       <div className="mt-1 text-sm bg-muted p-3 rounded">
                         {selectedSegment.raw_data.notes}
                       </div>
                     </div>
                   )}

                   {/* Afficher les remarques depuis raw_data si disponibles */}
                   {selectedSegment.raw_data?.remarks && (
                     <div>
                       <span className="text-sm text-muted-foreground">Remarques</span>
                       <div className="mt-1 text-sm bg-muted p-3 rounded">
                         {selectedSegment.raw_data.remarks}
                       </div>
                     </div>
                   )}
                </div>
              </div>
            )}

            {/* Technical Information */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground border-b pb-2">Informations techniques</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Niveau de confiance</span>
                  <div className="mt-1">
                    <Badge variant="outline" className="text-xs">
                      {Math.round((selectedSegment.confidence || 0) * 100)}%
                    </Badge>
                  </div>
                </div>
                
                {selectedSegment.documents && (
                  <div>
                    <span className="text-sm text-muted-foreground">Document source</span>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {selectedSegment.documents.file_name}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <span>Créé le</span>
                  <div className="mt-1">{format(parseISO(selectedSegment.created_at), 'dd/MM/yyyy HH:mm')}</div>
                </div>
                
                <div>
                  <span>Modifié le</span>
                  <div className="mt-1">{format(parseISO(selectedSegment.updated_at), 'dd/MM/yyyy HH:mm')}</div>
                </div>
              </div>
            </div>

            {/* Raw Data (if available) */}
            {selectedSegment.raw_data && (
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground border-b pb-2">Données brutes</h4>
                <div className="bg-muted p-3 rounded text-xs font-mono overflow-x-auto">
                  <pre>{JSON.stringify(selectedSegment.raw_data, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}