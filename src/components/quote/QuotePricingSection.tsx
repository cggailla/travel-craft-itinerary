import { EditableText } from "../EditableText";
import { ImageUploader } from "../ImageUploader";
import { SupabaseImage } from "@/services/supabaseImageService";

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

  return (
    <section className="pricing-section mb-24 min-h-[500px]" data-pdf-section="pricing">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* LEFT SIDE - Image with Upload */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-muted/30">
          <ImageUploader
            tripId={tripId}
            imageType="quote-pricing"
            position={1}
            currentImage={pricingImage}
            onImageUploaded={onImageUploaded}
            onImageDeleted={onImageDeleted}
            height="h-[500px]"
          />
          
          {!pricingImage && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-muted-foreground text-lg">Photo du voyage</p>
            </div>
          )}
        </div>

        {/* RIGHT SIDE - Content */}
        <div className="flex flex-col justify-center space-y-8">
          {/* Title */}
          <h2 className="text-4xl md:text-5xl font-bold leading-tight">
            <EditableText
              value={title}
              onChange={onTitleChange}
              className="text-4xl md:text-5xl font-bold leading-tight"
              placeholder="Votre voyage en Égypte"
            />
          </h2>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-6 p-6 bg-primary/10 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1">Destination</p>
              <p className="font-semibold text-lg">
                <EditableText
                  value={destination}
                  onChange={onDestinationChange}
                  placeholder="Égypte"
                  className="font-semibold text-lg"
                />
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1">Dates</p>
              <p className="font-semibold text-lg">
                {formatDate(startDate)} au {formatDate(endDate)}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1">Durée</p>
              <p className="font-semibold text-lg">{nights} nuits</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1">Voyageurs</p>
              <p className="font-semibold text-lg">
                <EditableText
                  value={numberOfTravelers}
                  onChange={onNumberOfTravelersChange}
                  placeholder="4 pers."
                  className="font-semibold text-lg"
                />
              </p>
            </div>
          </div>

          {/* Price */}
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

          {/* Contact Button */}
          <button className="w-full py-4 px-6 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-3 shadow-lg">
            <span className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center text-xl">
              👤
            </span>
            <span>Contacter mon conseiller</span>
          </button>
        </div>
      </div>
    </section>
  );
}
