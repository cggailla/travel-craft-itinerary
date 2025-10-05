import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, MapPin, Clock, Plane, Hotel, Car, Activity, FileText, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getTravelSegments, validateSegments } from '@/services/documentService';
import { TravelSegment } from '@/types/travel';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import ManualStepGrouper from './ManualStepGrouper';
import { hasManualSteps } from '@/services/manualStepsService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import StepsTimeline from './StepsTimeline';

interface TravelTimelineNewProps {
  documentIds?: string[];
  tripId: string | null;
  onValidated?: () => void;
}

type ViewMode = 'segments' | 'steps';

export default function TravelTimelineNew({
  tripId,
  onValidated
}: TravelTimelineNewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('segments');
  const [validating, setValidating] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<TravelSegment | null>(null);
  const [showManualGrouper, setShowManualGrouper] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetching segments with React Query
  const { data: segmentsData, isLoading: isLoadingSegments } = useQuery({
    queryKey: ['travelSegments', tripId],
    queryFn: async () => {
      if (!tripId) return null;
      const response = await getTravelSegments(tripId, 'all');
      if (!response.success) {
        throw new Error(response.error);
      }
      return response;
    },
    enabled: !!tripId,
  });

  // Fetching steps status with React Query
  const { data: hasExistingSteps, refetch: refetchStepsStatus } = useQuery({
    queryKey: ['hasManualSteps', tripId],
    queryFn: async () => {
      if (!tripId) return false;
      return await hasManualSteps(tripId);
    },
    enabled: !!tripId,
  });

  // Set view mode based on existing steps
  React.useEffect(() => {
    if (hasExistingSteps) {
      setViewMode('steps');
    }
  }, [hasExistingSteps]);

  // Mutation for toggling segment exclusion
  const { mutate: toggleSegmentExclusion } = useMutation({
    mutationFn: async ({ segmentId, isExcluded }: { segmentId: string; isExcluded: boolean }) => {
      if (!tripId) throw new Error("Trip ID is missing");
      const { error } = await supabase
        .from('travel_segments')
        .update({ is_excluded: isExcluded })
        .eq('id', segmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Mise à jour",
        description: "Votre choix a été sauvegardé.",
      });
      queryClient.invalidateQueries({ queryKey: ['travelSegments', tripId] });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: `Impossible de sauvegarder votre choix: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const timeline = segmentsData?.timeline || [];
  const undatedSegments = segmentsData?.undated_segments || [];
  const allSegments = segmentsData?.segments || [];

  const handleValidateAll = async () => {
    const unvalidatedSegments = allSegments.filter(s => !s.validated);
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
        // Invalidate query to refetch with updated validated status
        queryClient.invalidateQueries({ queryKey: ['travelSegments', tripId] });
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
      return format(date, 'EEEE d MMMM yyyy', { locale: fr });
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

  if (isLoadingSegments) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Chronologie du voyage</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (allSegments.length === 0) {
    return (
      <Card>
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
      </Card>
    );
  }

  const includedSegmentsCount = allSegments.filter(s => !s.is_excluded).length;
  const excludedSegmentsCount = allSegments.length - includedSegmentsCount;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>{viewMode === 'segments' ? 'Validez vos segments' : 'Vos étapes de voyage'}</span>
            </CardTitle>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-secondary" />
                <span>{includedSegmentsCount} inclus</span>
                <span className="text-muted-foreground">•</span>
                <span>{excludedSegmentsCount} exclus</span>
              </div>
              <div className="flex space-x-2">
                {hasExistingSteps && (
                  <Button 
                    onClick={() => setViewMode(viewMode === 'segments' ? 'steps' : 'segments')} 
                    variant="outline"
                    size="sm"
                  >
                    {viewMode === 'segments' ? 'Voir les étapes' : 'Voir les segments'}
                  </Button>
                )}
                {viewMode === 'segments' && (
                  <Button 
                    onClick={() => setShowManualGrouper(true)} 
                    size="sm" 
                    className="bg-secondary hover:bg-secondary-hover"
                  >
                    {hasExistingSteps ? 'Modifier les étapes' : 'Créer les étapes'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {showManualGrouper ? (
            <ManualStepGrouper
              timeline={timeline}
              undatedSegments={undatedSegments}
              tripId={tripId!}
              onStepsCreated={() => {
                setShowManualGrouper(false);
                refetchStepsStatus(); // Refetch to update hasExistingSteps
                setViewMode('steps'); // Switch to steps view
              }}
            />
          ) : viewMode === 'steps' ? (
            <StepsTimeline 
              tripId={tripId!} 
              onEditSteps={() => {
                setViewMode('segments');
                setShowManualGrouper(true);
              }}
              onGenerateBooklet={onValidated}
            />
          ) : (
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
                      <Card 
                        key={segment.id} 
                        className={`relative transition-all ${segment.is_excluded ? 'border-dashed opacity-50' : ''}`}
                      >
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
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-7 w-7"
                                      onClick={() => toggleSegmentExclusion({ segmentId: segment.id, isExcluded: !segment.is_excluded })}
                                    >
                                      {segment.is_excluded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                    <Badge variant="outline" className="text-xs text-muted-foreground">
                                      Sans date
                                    </Badge>
                                  </div>
                                </div>

                                {segment.provider && (
                                  <p className="text-sm text-muted-foreground">
                                    {segment.provider}
                                  </p>
                                )}

                                {segment.address && (
                                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                                    <MapPin className="h-3 w-3" />
                                    <span>{segment.address}</span>
                                  </div>
                                )}

                                {segment.reference_number && (
                                  <p className="text-sm font-mono text-muted-foreground">
                                    Réf: {segment.reference_number}
                                  </p>
                                )}

                                {segment.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {segment.description}
                                  </p>
                                )}

                                <div className="flex items-center justify-between pt-2">
                                  <Badge variant="outline" className="text-xs">
                                    Confiance: {Math.round((segment.confidence || 0) * 100)}%
                                  </Badge>
                                  {segment.documents && (
                                    <p className="text-xs text-muted-foreground">
                                      Source: {segment.documents.file_name}
                                    </p>
                                  )}
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

              {timeline.map((day, dayIndex) => (
                <div key={dayIndex} className="relative">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      {undatedSegments.length > 0 ? dayIndex + 1 : dayIndex + 1}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {formatDate(day.date)}
                    </h3>
                  </div>

                  <div className="ml-12 space-y-3">
                    {day.segments.map((segment) => (
                      <Card 
                        key={segment.id}
                        className={`relative transition-all ${segment.is_excluded ? 'border-dashed opacity-50' : ''}`}
                      >
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
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-7 w-7"
                                      onClick={() => toggleSegmentExclusion({ segmentId: segment.id, isExcluded: !segment.is_excluded })}
                                    >
                                      {segment.is_excluded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                    {segment.start_date && (
                                      <Badge variant="outline" className="text-xs">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {formatTime(segment.start_date)}
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                {segment.provider && (
                                  <p className="text-sm text-muted-foreground">
                                    {segment.provider}
                                  </p>
                                )}

                                {segment.address && (
                                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                                    <MapPin className="h-3 w-3" />
                                    <span>{segment.address}</span>
                                  </div>
                                )}

                                {segment.reference_number && (
                                  <p className="text-sm font-mono text-muted-foreground">
                                    Réf: {segment.reference_number}
                                  </p>
                                )}

                                {segment.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {segment.description}
                                  </p>
                                )}

                                <div className="flex items-center justify-between pt-2">
                                  <Badge variant="outline" className="text-xs">
                                    Confiance: {Math.round((segment.confidence || 0) * 100)}%
                                  </Badge>
                                  {segment.documents && (
                                    <p className="text-xs text-muted-foreground">
                                      Source: {segment.documents.file_name}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
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
                    <span className="text-sm text-muted-foreground">Statut d'inclusion</span>
                    <div className="mt-1">
                      <Badge variant={selectedSegment.is_excluded ? "destructive" : "default"} 
                             className={!selectedSegment.is_excluded ? "bg-secondary text-secondary-foreground" : ""}>
                        {selectedSegment.is_excluded ? (
                          <>
                            <EyeOff className="h-3 w-3 mr-1" />
                            Exclu
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Inclus
                          </>
                        )}
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

              {/* Details */}
              {(selectedSegment.description || selectedSegment.reference_number) && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground border-b pb-2">Détails</h4>
                  
                  <div className="space-y-3">
                    {selectedSegment.reference_number && (
                      <div>
                        <span className="text-sm text-muted-foreground">Numéro de référence</span>
                        <div className="mt-1 font-mono text-sm">{selectedSegment.reference_number}</div>
                      </div>
                    )}
                    
                    {selectedSegment.description && (
                      <div>
                        <span className="text-sm text-muted-foreground">Description</span>
                        <p className="mt-1 text-sm whitespace-pre-wrap">{selectedSegment.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground border-b pb-2">Métadonnées</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Confiance de l'IA</span>
                    <div className="mt-1 font-medium">{Math.round((selectedSegment.confidence || 0) * 100)}%</div>
                  </div>
                  
                  {selectedSegment.documents && (
                    <div>
                      <span className="text-sm text-muted-foreground">Source</span>
                      <div className="mt-1 flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{selectedSegment.documents.file_name}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button 
                  variant="outline"
                  onClick={() => {
                    toggleSegmentExclusion({ segmentId: selectedSegment.id, isExcluded: !selectedSegment.is_excluded });
                    setSelectedSegment(null);
                  }}
                >
                  {selectedSegment.is_excluded ? 'Inclure le segment' : 'Exclure le segment'}
                </Button>
                <Button onClick={() => setSelectedSegment(null)}>Fermer</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
