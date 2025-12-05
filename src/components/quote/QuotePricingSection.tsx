import { EditableText } from "../EditableText";
import { ImageUploader } from "../ImageUploader";
import { SupabaseImage } from "@/services/supabaseImageService";
import { Check, MapPin, Calendar, Clock, Users } from "lucide-react";
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
  description?: string;
  onDescriptionChange?: (value: string) => void;
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
  description = "Embarquez pour un voyage à travers les âges, des pyramides majestueuses du Caire aux temples légendaires d'Abou Simbel. Naviguez sur les eaux mythiques du Nil et laissez-vous envoûter par les trésors millénaires des pharaons.",
  onDescriptionChange,
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

  const nights = calculateNights();

  // Local state for editable fields that are derived from props but need to be editable text
  const [dateText, setDateText] = useState(`${formatDate(startDate)} au ${formatDate(endDate)}`);
  const [durationText, setDurationText] = useState(`${nights} nuits`);

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
            onChange={onDescriptionChange || (() => {})}
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

        {/* Summary Bar - Redesigned */}
        <div className="bg-primary/10 rounded-xl p-4 grid grid-cols-4 gap-4 divide-x divide-primary/10">
          <div className="flex flex-col items-center text-center px-2">
            <div className="mb-2 p-2 bg-white/60 rounded-full text-primary">
              <MapPin className="w-4 h-4" />
            </div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Destination</span>
            <div className="font-semibold text-foreground text-sm w-full">
              <EditableText 
                value={destination} 
                onChange={onDestinationChange} 
                className="text-center w-full block"
              />
            </div>
          </div>
          
          <div className="flex flex-col items-center text-center px-2">
            <div className="mb-2 p-2 bg-white/60 rounded-full text-primary">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Dates</span>
            <div className="font-semibold text-foreground text-sm w-full">
              <EditableText 
                value={dateText} 
                onChange={setDateText} 
                className="text-center w-full block"
              />
            </div>
          </div>
          
          <div className="flex flex-col items-center text-center px-2">
            <div className="mb-2 p-2 bg-white/60 rounded-full text-primary">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Durée</span>
            <div className="font-semibold text-foreground text-sm w-full">
              <EditableText 
                value={durationText} 
                onChange={setDurationText} 
                className="text-center w-full block"
              />
            </div>
          </div>
          
          <div className="flex flex-col items-center text-center px-2">
            <div className="mb-2 p-2 bg-white/60 rounded-full text-primary">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Voyageurs</span>
            <div className="font-semibold text-foreground text-sm w-full">
              <EditableText 
                value={numberOfTravelers} 
                onChange={onNumberOfTravelersChange} 
                className="text-center w-full block"
              />
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN (Sidebar) - 35% */}
      <div className="w-[35%] flex flex-col gap-6 justify-center">
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
        <div className="bg-white rounded-xl p-6 shadow-sm border border-border">
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
      </div>
    </section>
  );
}
