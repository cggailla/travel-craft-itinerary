import { BookletData, BookletOptions } from "@/services/bookletService";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, Clock, FileText } from "lucide-react";
import { DynamicItinerary } from "./DynamicItinerary";
import { GeneralInfoSection } from "./GeneralInfoSection";
import { useState, useEffect } from "react";

interface BookletTemplateProps {
  data: BookletData;
  options: BookletOptions;
  tripId: string;
}

export function BookletTemplate({
  data,
  options,
  tripId,
}: BookletTemplateProps) {
  const [coverImages, setCoverImages] = useState<string[]>([]);

  // On utilisera les images qui seront récupérées via le composant DynamicItinerary
  // Pour l'instant, on va juste créer un placeholder
  useEffect(() => {
    // Les images seront récupérées via l'AI content dans DynamicItinerary
    // On va créer un callback pour les récupérer
    setCoverImages([]);
  }, [data.segments]);

  // Couleur fixe Adgentes
  const colors = { primary: "#822a62", secondary: "#c084ab", accent: "#f5e6f0" };

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
      <div className="mb-8">
        {/* Barre de header avec logo Adgentes */}
        <div className="theme-bg p-6 rounded-t-lg flex items-center justify-between" style={{ backgroundColor: colors.primary }}>
          <div className="w-32 h-12 bg-white/20 rounded flex items-center justify-center text-white text-xs">
            Logo Adgentes
          </div>
          <h1 className="text-2xl font-bold text-white">{data.tripTitle}</h1>
          <div className="w-32"></div>
        </div>

        {/* Images de destination */}
        {coverImages.length > 0 && (
          <div className="grid grid-cols-2 gap-0">
            {coverImages.map((imageUrl, index) => (
              <div key={index} className="relative h-64 overflow-hidden">
                <img
                  src={imageUrl}
                  alt={`Destination ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {/* Informations du voyage */}
        <div className="theme-bg p-6 rounded-b-lg" style={{ backgroundColor: colors.accent }}>
          {data.startDate && (
            <div className="flex items-center justify-center mb-2 text-base">
              <Calendar className="mr-2 h-5 w-5" style={{ color: colors.primary }} />
              <span style={{ color: colors.primary }}>
                {format(data.startDate, "dd MMMM yyyy", { locale: fr })}
                {data.endDate &&
                  data.endDate !== data.startDate && (
                    <> - {format(data.endDate, "dd MMMM yyyy", { locale: fr })}</>
                  )}
              </span>
            </div>
          )}

          <div className="flex items-center justify-center">
            <Clock className="mr-2 h-5 w-5" style={{ color: colors.primary }} />
            <span className="text-base" style={{ color: colors.primary }}>
              {data.totalDays} jour{data.totalDays > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Itinéraire */}
      <div className="page-break mb-12">
        <h2 className="text-2xl font-bold mb-4 theme-text border-b-2 theme-border pb-2">
          Itinéraire détaillé
        </h2>

        <DynamicItinerary
          data={data}
          options={options}
          tripId={tripId}
        />
      </div>

      {/* Informations générales */}
      <div className="page-break mb-12">
        <h2 className="text-2xl font-bold mb-4 theme-text border-b-2 theme-border pb-2">
          Informations complémentaires
        </h2>

        <GeneralInfoSection tripId={tripId} options={options} />
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
        <div className="space-y-6 mt-8">
          {Array.from({ length: 24 }).map((_, index) => (
            <div 
              key={index} 
              className="border-b border-gray-300 h-8"
              style={{ pageBreakInside: 'avoid' }}
            />
          ))}
        </div>
      </div>

      <div className="text-center text-sm text-gray-500 mt-8 pt-4 border-t">
        <p>Carnet généré le {format(new Date(), "dd MMMM yyyy à HH:mm", { locale: fr })}</p>
        <p>Travel Booklet Builder - Votre compagnon de voyage numérique</p>
      </div>
    </div>
  );
}