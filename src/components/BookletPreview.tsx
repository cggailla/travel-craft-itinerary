import { BookletData, BookletOptions } from "@/services/bookletService";
import { BookletTemplate } from "./BookletTemplate";

interface BookletPreviewProps {
  data: BookletData;
  options: BookletOptions;
  tripId: string;
}

export function BookletPreview({ data, options, tripId }: BookletPreviewProps) {
  return (
    <div className="w-full">
      <div className="bg-white shadow-lg mx-auto" style={{ maxWidth: '210mm' }}>
        <div className="p-8">
          <BookletTemplate
            data={data}
            options={options}
            tripId={tripId}
          />
        </div>
      </div>

      <div className="mt-4 text-center text-sm text-muted-foreground">
        <p>Cet aperçu montre le rendu du carnet. Utilisez le bouton "Télécharger PDF" pour obtenir le fichier final.</p>
      </div>
    </div>
  );
}