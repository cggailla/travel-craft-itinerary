import { useMemo, useState } from "react";
import { BookletData, BookletOptions } from "@/services/bookletService";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, Clock, FileText, Plus, ListPlus } from "lucide-react";
import { DynamicItinerary } from "./DynamicItinerary";
import { Button } from "@/components/ui/button";
import { SegmentManager } from "./SegmentManager";

interface BookletTemplateProps {
  data: BookletData;
  options: BookletOptions;
  tripId: string;

  // Ajouts pour l’édition
  editable?: boolean;
  excludedSegmentIds?: Set<string>;
  onRemoveSegment?: (segmentId: string) => void;
  onAddSegment?: (segmentId: string) => void;
  allSegments?: BookletData["segments"];
}

export function BookletTemplate({
  data,
  options,
  tripId,
  editable = false,
  excludedSegmentIds = new Set<string>(),
  onRemoveSegment,
  onAddSegment,
  allSegments = [],
}: BookletTemplateProps) {
  const [isSegmentManagerOpen, setIsSegmentManagerOpen] = useState(false);

  const excludedSegments = useMemo(
    () => allSegments.filter(s => excludedSegmentIds.has(s.id)),
    [allSegments, excludedSegmentIds]
  );

  const includedCount = data.segments.length;
  const excludedCount = excludedSegmentIds.size;

  const colors = (() => {
    switch (options.colorTheme) {
      case "green": return { primary: "#22c55e", secondary: "#16a34a", accent: "#dcfce7" };
      case "orange": return { primary: "#f97316", secondary: "#ea580c", accent: "#fed7aa" };
      default: return { primary: "#3b82f6", secondary: "#2563eb", accent: "#dbeafe" };
    }
  })();

  const templateStyles = { classic: "font-serif", modern: "font-sans", minimal: "font-mono" as const };

  return (
    <div id="booklet-content" className={`${templateStyles[options.template]} text-gray-900`}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            .page-break { page-break-before: always; }
            .no-print { display: none !important; }
          }
          .theme-bg { background-color: ${colors.accent}; }
          .theme-border { border-color: ${colors.primary}; }
          .theme-text { color: ${colors.primary}; }
        `,
        }}
      />

      {/* En-tête / couverture */}
      <div className="text-center mb-6">
        <div className="theme-bg p-6 rounded-lg">
          <h1 className="text-3xl font-bold mb-2 theme-text">{data.tripTitle}</h1>
          <div className="text-lg text-gray-600 mb-4">Carnet de Voyage</div>

          {data.startDate && (
            <div className="flex items-center justify-center mb-2 text-base">
              <Calendar className="mr-2 h-5 w-5 theme-text" />
              <span>
                {format(data.startDate, "dd MMMM yyyy", { locale: fr })}
                {data.endDate &&
                  data.endDate !== data.startDate && (
                    <> - {format(data.endDate, "dd MMMM yyyy", { locale: fr })}</>
                  )}
              </span>
            </div>
          )}

          <div className="flex items-center justify-center">
            <Clock className="mr-2 h-5 w-5 theme-text" />
            <span className="text-base">
              {data.totalDays} jour{data.totalDays > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Barre d'outils d'édition */}
      {editable && (
        <div className="mb-6 flex items-center justify-between p-3 border rounded-lg bg-muted/30">
          <div className="text-sm text-muted-foreground">
            Segments inclus: <span className="font-medium text-foreground">{includedCount}</span>
            {" · "}
            exclus: <span className="font-medium text-foreground">{excludedCount}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex items-center gap-2"
              onClick={() => setIsSegmentManagerOpen(true)}
            >
              <ListPlus className="h-4 w-4" />
              Ajouter des segments
            </Button>
          </div>
        </div>
      )}

      {/* Itinéraire */}
      <div className="page-break mb-12">
        <h2 className="text-2xl font-bold mb-4 theme-text border-b-2 theme-border pb-2">
          Itinéraire détaillé
        </h2>

        <DynamicItinerary
          data={data}
          options={options}
          tripId={tripId}
          // édition
          editable={editable}
          excludedSegmentIds={excludedSegmentIds}
          onRemoveSegment={onRemoveSegment}
          allSegments={allSegments}
        />
      </div>

      {/* Documents de référence */}
      {options.includeDocuments && (
        <div className="page-break mb-12">
          <h2 className="text-2xl font-bold mb-6 theme-text border-b-2 theme-border pb-2">
            Documents de référence
          </h2>

          {data.segments.filter(s => s.documents).length === 0 ? (
            <p className="text-gray-500">Aucun document source trouvé.</p>
          ) : (
            <div className="space-y-4">
              {data.segments
                .filter(s => s.documents)
                .map(
                  segment =>
                    segment.documents && (
                      <div key={segment.id} className="border rounded p-4">
                        <h4 className="font-semibold mb-2 flex items-center">
                          <FileText className="mr-2 h-4 w-4 theme-text" />
                          {segment.title}
                        </h4>
                        <div className="text-sm text-gray-600">
                          <p><strong>Fichier:</strong> {segment.documents.file_name}</p>
                          <p><strong>Type:</strong> {segment.documents.file_type}</p>
                          <p>
                            <strong>Uploadé le:</strong>{" "}
                            {format(new Date(segment.documents.created_at), "dd/MM/yyyy à HH:mm", { locale: fr })}
                          </p>
                        </div>
                      </div>
                    )
                )}
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="page-break">
        <h2 className="text-2xl font-bold mb-6 theme-text border-b-2 theme-border pb-2">
          Notes personnelles
        </h2>
        {/* ... inchangé ... */}
      </div>

      <div className="text-center text-sm text-gray-500 mt-8 pt-4 border-t">
        <p>Carnet généré le {format(new Date(), "dd MMMM yyyy à HH:mm", { locale: fr })}</p>
        <p>Travel Booklet Builder - Votre compagnon de voyage numérique</p>
      </div>

      {/* Segment Manager */}
      {editable && (
        <SegmentManager
          open={isSegmentManagerOpen}
          onClose={() => setIsSegmentManagerOpen(false)}
          excludedSegments={excludedSegments}
          onAddSegment={onAddSegment}
        />
      )}
    </div>
  );
}
