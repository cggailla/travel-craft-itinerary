import { EditableText } from "../EditableText";
import { ImageUploader } from "../ImageUploader";
import { SupabaseImage } from "@/services/supabaseImageService";
import { Check, User } from "lucide-react";
import { useState } from "react";

interface QuotePricingSectionProps {
  tripId: string;
  title: string;
  onTitleChange: (value: string) => void;
  destination: string;
  onDestinationChange: (value: string) => void;
  startDate: Date;
  endDate: Date;
  numberOfTravelers: string;
  onNumberOfTravelersChange: (value: string) => void;
  totalPrice: string;
  onTotalPriceChange: (value: string) => void;
  pricingImage?: SupabaseImage;
  onImageUploaded: (image: SupabaseImage) => void;
  onImageDeleted: () => void;
  highlights?: string[];
  onHighlightsChange?: (highlights: string[]) => void;
}

export function QuotePricingSection({
  tripId,
  title,
  onTitleChange,
  destination,
  onDestinationChange,
  startDate,
  endDate,
  numberOfTravelers,
  onNumberOfTravelersChange,
  totalPrice,
  onTotalPriceChange,
  pricingImage,
  onImageUploaded,
  onImageDeleted,
  highlights = [],
  onHighlightsChange,
}: QuotePricingSectionProps) {
  const [description, setDescription] = useState("Embarquez pour un voyage à travers les âges, des pyramides majestueuses du Caire aux temples légendaires d'Abou Simbel. Naviguez sur les eaux mythiques du Nil et laissez-vous envoûter par les trésors millénaires des pharaons.");

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

  const nights = calculateNights();

  const updateHighlight = (index: number, value: string) => {
    if (!onHighlightsChange) return;
    const newHighlights = [...highlights];
    newHighlights[index] = value;
    onHighlightsChange(newHighlights);
  };

  return (
    <section className="pricing-section h-full flex gap-8" data-pdf-section="pricing">
      {/* LEFT COLUMN (Main Content) - 65% */}
      <div className="w-[65%] flex flex-col h-full">
        {/* Title */}
        <h2 className="text-4xl font-bold text-primary mb-6">
          <EditableText
            value={title}
            onChange={onTitleChange}
            className="text-4xl font-bold text-primary"
            placeholder="Votre voyage"
          />
        </h2>

        {/* Description */}
        <div className="mb-8 text-muted-foreground leading-relaxed">
          <EditableText
            value={description}
            onChange={setDescription}
            multiline
            className="text-muted-foreground leading-relaxed"
            placeholder="Description du voyage..."
          />
        </div>

        {/* Image */}
        <div className="flex-1 relative rounded-2xl overflow-hidden mb-6 min-h-[300px]">
          <ImageUploader
            tripId={tripId}
            imageType="quote-pricing"
            position={1}
            currentImage={pricingImage}
            onImageUploaded={onImageUploaded}
            onImageDeleted={onImageDeleted}
            height="h-full"
            className="h-full w-full object-cover"
          />
        </div>

        {/* Summary Bar */}
        <div className="bg-primary/10 rounded-xl p-6 grid grid-cols-4 gap-4">
          <div>
            <p className="font-bold text-foreground mb-1">Destination</p>
            <p className="text-muted-foreground text-sm">
              <EditableText value={destination} onChange={onDestinationChange} />
            </p>
          </div>
          <div>
            <p className="font-bold text-foreground mb-1">Dates</p>
            <p className="text-muted-foreground text-sm">
              {formatDate(startDate)} au {formatDate(endDate)}
            </p>
          </div>
          <div>
            <p className="font-bold text-foreground mb-1">Durée</p>
            <p className="text-muted-foreground text-sm">{nights} nuits</p>
          </div>
          <div>
            <p className="font-bold text-foreground mb-1">Voyageurs</p>
            <p className="text-muted-foreground text-sm">
              <EditableText value={numberOfTravelers} onChange={onNumberOfTravelersChange} />
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN (Sidebar) - 35% */}
      <div className="w-[35%] flex flex-col gap-6">
        {/* Price Box */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-border flex justify-between items-center">
          <span className="text-muted-foreground font-medium">{nights} nuits</span>
          <div className="text-2xl font-bold text-primary">
            <EditableText
              value={totalPrice}
              onChange={onTotalPriceChange}
              className="text-2xl font-bold text-primary inline-block text-right"
            />
            <span className="ml-1">CHF</span>
          </div>
        </div>

        {/* Highlights */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-border flex-1">
          <h3 className="font-bold text-lg mb-6 text-foreground">Les points forts de ce voyage</h3>
          <div className="space-y-4">
            {highlights.map((highlight, index) => (
              <div key={index} className="flex gap-3 items-start">
                <div className="mt-1 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <div className="text-sm text-foreground/80 leading-snug">
                  <EditableText
                    value={highlight}
                    onChange={(val) => updateHighlight(index, val)}
                    multiline
                  />
                </div>
              </div>
            ))}
            {highlights.length === 0 && (
              <p className="text-sm text-muted-foreground italic">Aucun point fort détecté.</p>
            )}
          </div>
        </div>

        {/* Contact Button */}
        <button className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-md">
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <span>Contacter mon conseiller</span>
        </button>
      </div>
    </section>
  );
}
