import React, { useState } from 'react';
import { format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Plane, 
  Hotel, 
  MapPin, 
  Car, 
  Calendar,
  Clock,
  Eye,
  CheckCircle
} from 'lucide-react';
import { TravelSegment, TimelineDay } from '@/types/travel';
import { Button } from '@/components/ui/button';
import { SegmentDetailsModal } from './SegmentDetailsModal';
import { cn } from '@/lib/utils';

interface TravelTimelineProps {
  segments: TravelSegment[];
  onValidate?: () => void;
  className?: string;
}

export const TravelTimeline: React.FC<TravelTimelineProps> = ({
  segments,
  onValidate,
  className
}) => {
  const [selectedSegment, setSelectedSegment] = useState<TravelSegment | null>(null);

  // Group segments by day
  const timelineDays: TimelineDay[] = React.useMemo(() => {
    // Filter out segments with invalid dates first
    const validSegments = segments.filter(segment => 
      segment.startDate && 
      segment.startDate instanceof Date && 
      !isNaN(segment.startDate.getTime())
    );
    
    const groupedSegments = validSegments.reduce((acc, segment) => {
      const dateKey = format(segment.startDate, 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: segment.startDate,
          segments: []
        };
      }
      acc[dateKey].segments.push(segment);
      return acc;
    }, {} as Record<string, TimelineDay>);

    return Object.values(groupedSegments).sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );
  }, [segments]);

  const getSegmentIcon = (type: TravelSegment['type']) => {
    switch (type) {
      case 'flight':
        return <Plane className="w-5 h-5" />;
      case 'hotel':
        return <Hotel className="w-5 h-5" />;
      case 'activity':
        return <MapPin className="w-5 h-5" />;
      case 'car':
        return <Car className="w-5 h-5" />;
      default:
        return <Calendar className="w-5 h-5" />;
    }
  };

  const getSegmentColor = (type: TravelSegment['type']) => {
    switch (type) {
      case 'flight':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'hotel':
        return 'text-purple-600 bg-purple-100 border-purple-200';
      case 'activity':
        return 'text-green-600 bg-green-100 border-green-200';
      case 'car':
        return 'text-orange-600 bg-orange-100 border-orange-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  if (segments.length === 0) {
    return (
      <div className={cn('bg-card border border-border rounded-xl p-8 text-center', className)}>
        <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Itinéraire vide</h3>
        <p className="text-muted-foreground">
          Ajoutez des documents de voyage pour construire votre itinéraire.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={cn('bg-card border border-border rounded-xl p-6', className)}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Itinéraire de voyage</h3>
              <p className="text-sm text-muted-foreground">
                {segments.length} étape{segments.length > 1 ? 's' : ''} planifiée{segments.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <Button 
            onClick={onValidate}
            variant="default"
            className="bg-secondary hover:bg-secondary-hover text-secondary-foreground"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Valider le voyage
          </Button>
        </div>

        <div className="space-y-6">
          {timelineDays.map((day, dayIndex) => (
            <div key={dayIndex} className="relative">
              {/* Date header */}
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                  Jour {dayIndex + 1}
                </div>
                <h4 className="text-lg font-semibold text-foreground">
                  {format(day.date, 'EEEE d MMMM yyyy', { locale: fr })}
                </h4>
              </div>

              {/* Timeline line */}
              {dayIndex < timelineDays.length - 1 && (
                <div className="absolute left-8 top-16 bottom-0 w-0.5 bg-border"></div>
              )}

              {/* Segments */}
              <div className="space-y-3 ml-4">
                {day.segments.map((segment, segmentIndex) => (
                  <div
                    key={segment.id}
                    className={cn(
                      'relative flex items-center space-x-4 p-4 rounded-lg border cursor-pointer',
                      'hover:shadow-md transition-all duration-200',
                      getSegmentColor(segment.type)
                    )}
                    onClick={() => setSelectedSegment(segment)}
                  >
                    {/* Timeline dot */}
                    <div className="absolute -left-6 w-3 h-3 bg-current rounded-full border-2 border-background"></div>
                    
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      {getSegmentIcon(segment.type)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-semibold text-current truncate">
                            {segment.title}
                          </h5>
                          <p className="text-sm opacity-80 truncate">
                            {segment.provider}
                          </p>
                          {segment.reference && (
                            <p className="text-xs opacity-70 mt-1">
                              Réf: {segment.reference}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2 text-xs opacity-70">
                          <Clock className="w-3 h-3" />
                          <span>{format(segment.startDate, 'HH:mm')}</span>
                          <Eye className="w-4 h-4 ml-2" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Segment Details Modal */}
      <SegmentDetailsModal
        segment={selectedSegment}
        isOpen={!!selectedSegment}
        onClose={() => setSelectedSegment(null)}
      />
    </>
  );
};