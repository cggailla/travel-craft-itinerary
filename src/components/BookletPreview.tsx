import { useMemo, useState } from "react";
import { BookletData, BookletOptions } from "@/services/bookletService";
import { BookletTemplate } from "./BookletTemplate";

interface BookletPreviewProps {
  data: BookletData;
  options: BookletOptions;
  tripId: string;
}

export function BookletPreview({ data, options, tripId }: BookletPreviewProps) {
  const [excludedSegmentIds, setExcludedSegmentIds] = useState<Set<string>>(new Set());

  const filteredData = useMemo<BookletData>(() => {
    return {
      ...data,
      segments: data.segments.filter(s => !excludedSegmentIds.has(s.id)),
    };
  }, [data, excludedSegmentIds]);

  const handleRemoveSegment = (id: string) => {
    setExcludedSegmentIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleAddSegment = (id: string) => {
    setExcludedSegmentIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  return (
    <div className="w-full">
      <div className="bg-white shadow-lg mx-auto" style={{ maxWidth: '210mm' }}>
        <div className="p-8">
          <BookletTemplate
            data={filteredData}
            options={options}
            tripId={tripId}
            editable
            excludedSegmentIds={excludedSegmentIds}
            onRemoveSegment={handleRemoveSegment}
            onAddSegment={handleAddSegment}
            allSegments={data.segments} // pour SegmentManager et l’injection
          />
        </div>
      </div>

      <div className="mt-4 text-center text-sm text-muted-foreground">
        <p>Cet aperçu montre le rendu du carnet. Utilisez le bouton "Télécharger PDF" pour obtenir le fichier final.</p>
      </div>
    </div>
  );
}
