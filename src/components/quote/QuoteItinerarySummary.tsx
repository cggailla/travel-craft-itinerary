import { MapPin } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { EditableText } from "../EditableText";
import { ImageUploader } from "../ImageUploader";
import { SupabaseImage } from "@/services/supabaseImageService";

interface StepSummary {
  id: string;
  title: string;
  date: string;
  location: string;
}

interface QuoteItinerarySummaryProps {
  tripId: string;
  steps: StepSummary[];
  onStepChange?: (id: string, field: 'title' | 'location' | 'date', value: string) => void;
  summaryImage?: SupabaseImage;
  onImageUploaded?: (image: SupabaseImage) => void;
  onImageDeleted?: () => void;
}

export function QuoteItinerarySummary({ 
  tripId,
  steps, 
  onStepChange,
  summaryImage,
  onImageUploaded,
  onImageDeleted
}: QuoteItinerarySummaryProps) {
  return (
    <section className="itinerary-summary-section h-full flex flex-col" data-pdf-section="itinerary-summary">
      <div className="pt-8 mb-8 text-center">
        <h2 className="text-3xl font-bold text-primary">Votre Voyage</h2>
        <div className="h-1 w-20 bg-primary/20 mx-auto mt-2 rounded-full"/>
      </div>

      <div className="flex-1 flex px-12 pb-12 gap-8">
        {/* Left Column: List of Steps (60%) */}
        <div className="w-[60%] flex flex-col justify-center space-y-4">
          {steps.map((step, index) => {
            const dateObj = step.date ? new Date(step.date) : null;
            
            return (
              <div key={step.id} className="flex items-center gap-4 border-b border-primary/10 pb-2 last:border-0">
                {/* Date */}
                <div className="w-24 text-right">
                   <span className="text-sm font-bold text-primary block">
                     {dateObj ? format(dateObj, "dd MMM", { locale: fr }) : ""}
                   </span>
                </div>

                {/* Dot */}
                <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                
                {/* Content */}
                <div className="flex-1">
                   {/* Title */}
                   <div className="text-sm font-bold text-foreground leading-tight">
                      <EditableText 
                        value={step.title} 
                        onChange={(v) => onStepChange?.(step.id, 'title', v)}
                      />
                   </div>
                   
                   {/* Location */}
                   <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      <EditableText 
                        value={step.location} 
                        onChange={(v) => onStepChange?.(step.id, 'location', v)}
                      />
                   </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Image Uploader (40%) */}
        <div className="w-[40%] h-full">
           <ImageUploader
              tripId={tripId}
              imageType="quote-summary"
              currentImage={summaryImage}
              onImageUploaded={onImageUploaded}
              onImageDeleted={onImageDeleted}
              label="Photo du voyage"
              className="h-full w-full object-cover rounded-xl overflow-hidden"
           />
        </div>
      </div>
    </section>
  );
}
