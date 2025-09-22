import { BookletData, BookletOptions } from "@/services/bookletService";
import { BookletTemplate } from "./BookletTemplate";
import { OptimizedItinerary } from "./OptimizedItinerary";

interface BookletPreviewProps {
  data: BookletData;
  options: BookletOptions;
  tripId: string;
}

export function BookletPreview({ data, options, tripId }: BookletPreviewProps) {
  return (
    <div className="w-full space-y-6">
      {/* Conteneur avec l'itinéraire optimisé */}
      <div className="bg-white shadow-lg mx-auto" style={{ maxWidth: '210mm' }}>
        <div className="p-8">
          <OptimizedItinerary data={data} options={options} tripId={tripId} />
        </div>
      </div>
      
      {/* Conteneur avec le template classique */}
      <div className="bg-white shadow-lg mx-auto" style={{ maxWidth: '210mm' }}>
        <div className="p-8">
          <BookletTemplate data={data} options={options} tripId={tripId} />
        </div>
      </div>
      
      {/* Note explicative */}
      <div className="mt-4 text-center text-sm text-muted-foreground">
        <p>Cet aperçu montre le rendu du carnet optimisé et classique. Utilisez le bouton "Télécharger PDF" pour obtenir le fichier final.</p>
      </div>
    </div>
  );
}