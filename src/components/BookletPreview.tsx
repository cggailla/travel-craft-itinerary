import { BookletData, BookletOptions } from "@/services/bookletService";
import { BookletTemplate } from "./BookletTemplate";
import { useState, useMemo } from "react";
import { TravelSegment } from "@/types/travel";

interface BookletPreviewProps {
  data: BookletData;
  options: BookletOptions;
  tripId: string;
}

export function BookletPreview({ data, options, tripId }: BookletPreviewProps) {
  const [excludedSegmentIds, setExcludedSegmentIds] = useState<Set<string>>(new Set());

  const filteredData = useMemo(() => {
    const filteredSegments = data.segments.filter(segment => !excludedSegmentIds.has(segment.id));
    return {
      ...data,
      segments: filteredSegments
    };
  }, [data, excludedSegmentIds]);

  const excludedSegments = useMemo(() => {
    return data.segments.filter(segment => excludedSegmentIds.has(segment.id));
  }, [data.segments, excludedSegmentIds]);

  const handleRemoveSegment = (segmentId: string) => {
    setExcludedSegmentIds(prev => new Set([...prev, segmentId]));
  };

  const handleAddSegment = (segmentId: string) => {
    setExcludedSegmentIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(segmentId);
      return newSet;
    });
  };
  return (
    <div className="w-full">
      {/* Conteneur avec style d'impression */}
      <div className="bg-white shadow-lg mx-auto" style={{ maxWidth: '210mm' }}>
        <div className="p-8">
          <BookletTemplate 
            data={filteredData} 
            options={options} 
            tripId={tripId}
            isEditable={true}
            excludedSegments={excludedSegments}
            onRemoveSegment={handleRemoveSegment}
            onAddSegment={handleAddSegment}
          />
        </div>
      </div>
      
      {/* Note explicative */}
      <div className="mt-4 text-center text-sm text-muted-foreground">
        <p>Cet aperçu montre le rendu du carnet. Utilisez le bouton "Télécharger PDF" pour obtenir le fichier final.</p>
        {excludedSegmentIds.size > 0 && (
          <p className="text-orange-600 font-medium mt-1">
            {excludedSegmentIds.size} segment{excludedSegmentIds.size > 1 ? 's' : ''} exclu{excludedSegmentIds.size > 1 ? 's' : ''} du carnet
          </p>
        )}
      </div>
    </div>
  );
}