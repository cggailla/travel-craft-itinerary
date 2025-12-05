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

      <div className="flex-1 flex px-8 pb-8 gap-6 overflow-hidden">
        {/* Left Column: Grid of Steps (70%) */}
        <div className="w-[70%] grid grid-cols-2 gap-x-8 gap-y-1 content-start">
          {steps.map((step, index) => {
            const dateObj = step.date ? new Date(step.date) : null;
            
            return (
              <div key={step.id} className="flex items-center gap-3 py-2 border-b border-dashed border-primary/10" data-pdf-item="summary-step">
                {/* Date */}
                <div className="w-16 text-right flex-shrink-0">
                   <span className="text-sm font-bold text-primary block leading-tight" data-pdf-step-date>
                     {dateObj ? format(dateObj, "dd MMM", { locale: fr }) : ""}
                   </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                   {/* Title */}
                   <div className="text-sm font-bold text-foreground leading-tight truncate" data-pdf-step-title>
                      <EditableText 
                        value={step.title} 
                        onChange={(v) => onStepChange?.(step.id, 'title', v)}
                      />
                   </div>
                   
                   {/* Location */}
                   <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1 mt-0.5 truncate" data-pdf-step-location>
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

        {/* Right Column: Image Uploader (30%) */}
        <div className="w-[30%] h-full">
           <ImageUploader
              tripId={tripId}
              imageType="quote-summary"
              currentImage={summaryImage}
              onImageUploaded={onImageUploaded}
              onImageDeleted={onImageDeleted}
              label="Photo"
              className="h-full w-full object-cover rounded-xl overflow-hidden"
           />
        </div>
      </div>
    </section>
  );
}
