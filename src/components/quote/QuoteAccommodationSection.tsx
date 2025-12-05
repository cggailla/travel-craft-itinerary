import { EditableText } from "../EditableText";
import { Building2 } from "lucide-react";

interface Accommodation {
  name: string;
  type: string;
  nights: string;
  location: string;
  description: string;
}

interface QuoteAccommodationSectionProps {
  accommodations: Accommodation[];
  onAccommodationsChange: (accommodations: Accommodation[]) => void;
}

export function QuoteAccommodationSection({
  accommodations,
  onAccommodationsChange,
}: QuoteAccommodationSectionProps) {
  return (
    <section className="accommodation-section mb-16" data-pdf-section="accommodation">
      <h2 className="text-3xl font-bold mb-6">Hébergements</h2>
      
      <div className="grid grid-cols-2 gap-4">
        {accommodations.map((accommodation, index) => (
          <div key={index} className="p-3 bg-muted/20 rounded-lg border border-border">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold mb-1">
                  <EditableText
                    value={accommodation.name}
                    onChange={(newValue) => {
                      const newAccommodations = [...accommodations];
                      newAccommodations[index].name = newValue;
                      onAccommodationsChange(newAccommodations);
                    }}
                    className="text-base font-semibold"
                    placeholder="Nom de l'hébergement"
                  />
                </h3>
                
                {accommodation.description && (
                  <div className="text-xs text-muted-foreground mt-1">
                    <EditableText
                      value={accommodation.description}
                      onChange={(newValue) => {
                        const newAccommodations = [...accommodations];
                        newAccommodations[index].description = newValue;
                        onAccommodationsChange(newAccommodations);
                      }}
                      multiline
                      placeholder="Description de l'hébergement..."
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
