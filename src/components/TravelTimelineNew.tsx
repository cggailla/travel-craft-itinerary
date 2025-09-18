import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
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
      const response = await getTravelSegments(undefined, 'all', tripId);
      if (response.success) {
        setSegments(response.segments.filter(s => !tripId || s.documents?.trip_id === tripId));
        setTimeline(response.timeline.filter(day => day.segments.some(s => !tripId || s.documents?.trip_id === tripId)));
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
  return <Card>
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
          {timeline.map((day, dayIndex) => <div key={dayIndex} className="relative">
              {dayIndex > 0}
              
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  {dayIndex + 1}
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
                              <h4 className="font-semibold text-foreground">{segment.title}</h4>
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
    </Card>;
}