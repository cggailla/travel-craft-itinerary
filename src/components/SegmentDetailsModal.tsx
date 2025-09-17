import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plane,
  Hotel,
  MapPin,
  Car,
  Calendar,
  Clock,
  Building,
  FileText,
  Star
} from 'lucide-react';
import { TravelSegment } from '@/types/travel';
import { Badge } from '@/components/ui/badge';

interface SegmentDetailsModalProps {
  segment: TravelSegment | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SegmentDetailsModal: React.FC<SegmentDetailsModalProps> = ({
  segment,
  isOpen,
  onClose
}) => {
  if (!segment) return null;

  const getSegmentIcon = (type: TravelSegment['type']) => {
    switch (type) {
      case 'flight':
        return <Plane className="w-6 h-6 text-blue-600" />;
      case 'hotel':
        return <Hotel className="w-6 h-6 text-purple-600" />;
      case 'activity':
        return <MapPin className="w-6 h-6 text-green-600" />;
      case 'car':
        return <Car className="w-6 h-6 text-orange-600" />;
      default:
        return <Calendar className="w-6 h-6 text-gray-600" />;
    }
  };

  const getTypeLabel = (type: TravelSegment['type']) => {
    switch (type) {
      case 'flight':
        return 'Vol';
      case 'hotel':
        return 'Hôtel';
      case 'activity':
        return 'Activité';
      case 'car':
        return 'Location de voiture';
      default:
        return 'Autre';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            {getSegmentIcon(segment.type)}
            <span>{segment.title}</span>
            <Badge variant="secondary" className={getConfidenceColor(segment.confidence)}>
              <Star className="w-3 h-3 mr-1" />
              {Math.round(segment.confidence * 100)}% de confiance
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Type</p>
                  <p className="text-sm text-muted-foreground">{getTypeLabel(segment.type)}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                <Building className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Fournisseur</p>
                  <p className="text-sm text-muted-foreground">{segment.provider}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                <Clock className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Date de début</p>
                  <p className="text-sm text-muted-foreground">
                    {format(segment.startDate, 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
                  </p>
                </div>
              </div>

              {segment.reference && (
                <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                  <FileText className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Référence</p>
                    <p className="text-sm text-muted-foreground font-mono">{segment.reference}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Address */}
          {segment.address && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-foreground mb-2">Adresse</h4>
              <p className="text-sm text-muted-foreground">{segment.address}</p>
            </div>
          )}

          {/* Description */}
          {segment.description && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-foreground mb-2">Description</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {segment.description}
              </p>
            </div>
          )}

          {/* Raw Data */}
          {segment.rawData && Object.keys(segment.rawData).length > 0 && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-foreground mb-2">Données extraites</h4>
              <pre className="text-xs text-muted-foreground bg-background p-3 rounded border overflow-auto max-h-32">
                {JSON.stringify(segment.rawData, null, 2)}
              </pre>
            </div>
          )}

          {/* End Date */}
          {segment.endDate && (
            <div className="flex items-center space-x-3 p-3 bg-secondary/10 rounded-lg">
              <Clock className="w-5 h-5 text-secondary" />
              <div>
                <p className="text-sm font-medium text-foreground">Date de fin</p>
                <p className="text-sm text-muted-foreground">
                  {format(segment.endDate, 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};