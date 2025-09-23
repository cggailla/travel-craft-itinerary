import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TravelSegment } from '@/types/travel';
import { formatSegmentType } from '@/services/bookletService';
import { MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface SegmentManagerProps {
  excludedSegments: TravelSegment[];
  onAddSegment: (segmentId: string) => void;
}

export function SegmentManager({ excludedSegments, onAddSegment }: SegmentManagerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatTime = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return format(date, 'HH:mm');
  };

  if (excludedSegments.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter des segments ({excludedSegments.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Segments disponibles à ajouter</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          {excludedSegments.map((segment) => (
            <div key={segment.id} className="flex items-start justify-between p-3 border rounded-lg bg-muted/30">
              <div className="flex-1 mr-3">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm">
                    {segment.title}
                  </h4>
                  {segment.reference_number && (
                    <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded">
                      {segment.reference_number}
                    </span>
                  )}
                </div>

                {segment.provider && (
                  <p className="text-xs text-muted-foreground mb-1">
                    {segment.provider}
                  </p>
                )}

                {segment.description && (
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {segment.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {segment.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {segment.address}
                    </span>
                  )}
                  {segment.start_date && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(segment.start_date)}
                    </span>
                  )}
                  <span>{formatSegmentType(segment.segment_type)}</span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onAddSegment(segment.id);
                  setIsOpen(false);
                }}
                className="shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}