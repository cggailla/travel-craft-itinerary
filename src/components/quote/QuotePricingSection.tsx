import { EditableText } from "../EditableText";
import { ImageUploader } from "../ImageUploader";
import { SupabaseImage } from "@/services/supabaseImageService";
import { Check } from "lucide-react";

interface QuotePricingSectionProps {
  tripId: string;
  title: string;
  onTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  destination: string;
  onDestinationChange: (value: string) => void;
  startDate: Date;
  endDate: Date;
  numberOfTravelers: string;
  onNumberOfTravelersChange: (value: string) => void;
  totalPrice: string;
  onTotalPriceChange: (value: string) => void;
  highlights: string[];
  onHighlightsChange: (highlights: string[]) => void;
  contactEmail: string;
  onContactEmailChange: (value: string) => void;
  pricingImage?: SupabaseImage;
  onImageUploaded: (image: SupabaseImage) => void;
  onImageDeleted: () => void;
}

export function QuotePricingSection({
  tripId,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  destination,
  onDestinationChange,
  startDate,
  endDate,
  numberOfTravelers,
  onNumberOfTravelersChange,
  totalPrice,
  onTotalPriceChange,
  highlights,
  onHighlightsChange,
  contactEmail,
  onContactEmailChange,
  pricingImage,
  onImageUploaded,
  onImageDeleted,
}: QuotePricingSectionProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'short' 
    });
  };

  const calculateNights = () => {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const updateHighlight = (index: number, value: string) => {
    const newHighlights = [...highlights];
    newHighlights[index] = value;
    onHighlightsChange(newHighlights);
  };

  const nights = calculateNights();

  return (
    <section className="pricing-section mb-24" data-pdf-section="pricing">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* LEFT COLUMN (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <h2 className="text-4xl md:text-5xl font-bold leading-tight">
            <EditableText
              value={title}
              onChange={onTitleChange}
              className="text-4xl md:text-5xl font-bold leading-tight"
              placeholder="Votre voyage en Égypte"
            />
          </h2>

          {/* Description */}
          <div className="text-base text-muted-foreground leading-relaxed">
            <EditableText
              value={description}
              onChange={onDescriptionChange}
              multiline
              className="text-base text-muted-foreground leading-relaxed"
              placeholder="Embarquez pour un voyage à travers les âges..."
            />
          </div>

          {/* Image with Upload */}
          <div className="rounded-2xl overflow-hidden shadow-lg">
            <ImageUploader
              tripId={tripId}
              imageType="quote-pricing"
              position={1}
              currentImage={pricingImage}
              onImageUploaded={onImageUploaded}
              onImageDeleted={onImageDeleted}
              height="h-[400px]"
            />
          </div>

          {/* Info Box */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-primary/10 rounded-lg">
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1">Destination</p>
              <p className="font-semibold">
                <EditableText
                  value={destination}
                  onChange={onDestinationChange}
                  placeholder="Égypte"
                  className="font-semibold"
                />
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1">Dates</p>
              <p className="font-semibold">
                {formatDate(startDate)} au {formatDate(endDate)}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1">Durée</p>
              <p className="font-semibold">{nights} nuits</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1">Voyageurs</p>
              <p className="font-semibold">
                <EditableText
                  value={numberOfTravelers}
                  onChange={onNumberOfTravelersChange}
                  placeholder="4 pers."
                  className="font-semibold"
                />
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (1/3) */}
        <div className="space-y-8">
          {/* Price Card */}
          <div className="sticky top-8 space-y-6">
            {/* Duration & Price */}
            <div className="space-y-2">
              <p className="text-xl font-semibold text-muted-foreground">
                {nights} nuits
              </p>
              <div className="text-5xl font-bold text-primary">
                <EditableText
                  value={totalPrice}
                  onChange={onTotalPriceChange}
                  placeholder="10 380"
                  className="text-5xl font-bold text-primary inline-block"
                />
                <span className="text-3xl"> CHF</span>
              </div>
            </div>

            {/* Highlights */}
            <div>
              <h3 className="text-xl font-semibold mb-4">Les points forts de ce voyage</h3>
              <ul className="space-y-3">
                {highlights.map((highlight, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">
                      <EditableText
                        value={highlight}
                        onChange={(val) => updateHighlight(index, val)}
                        placeholder="Point fort du voyage..."
                        className="text-sm"
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Button */}
            <button className="w-full py-4 px-6 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
              <span className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center text-xl">
                👤
              </span>
              <span>Contacter mon conseiller</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
