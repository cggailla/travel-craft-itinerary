import { EditableText } from "../EditableText";
import { Building2 } from "lucide-react";

interface Accommodation {
  name: string;
  type: string;
  nights: string;
  location: string;
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
      
      <div className="space-y-4">
        {accommodations.map((accommodation, index) => (
          <div key={index} className="p-6 bg-muted/20 rounded-lg border border-border">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">
                  <EditableText
                    value={accommodation.name}
                    onChange={(newValue) => {
                      const newAccommodations = [...accommodations];
                      newAccommodations[index].name = newValue;
                      onAccommodationsChange(newAccommodations);
                    }}
                    className="text-xl font-semibold"
                    placeholder="Nom de l'hébergement"
                  />
                </h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type : </span>
                    <EditableText
                      value={accommodation.type}
                      onChange={(newValue) => {
                        const newAccommodations = [...accommodations];
                        newAccommodations[index].type = newValue;
                        onAccommodationsChange(newAccommodations);
                      }}
                      placeholder="Hôtel 5*"
                    />
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nuits : </span>
                    <EditableText
                      value={accommodation.nights}
                      onChange={(newValue) => {
                        const newAccommodations = [...accommodations];
                        newAccommodations[index].nights = newValue;
                        onAccommodationsChange(newAccommodations);
                      }}
                      placeholder="3 nuits"
                    />
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lieu : </span>
                    <EditableText
                      value={accommodation.location}
                      onChange={(newValue) => {
                        const newAccommodations = [...accommodations];
                        newAccommodations[index].location = newValue;
                        onAccommodationsChange(newAccommodations);
                      }}
                      placeholder="Ville"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
