import { EditableText } from "../EditableText";
import { EditableDate } from "../EditableDate";
import { ImageUploader } from "../ImageUploader";
import { SupabaseImage } from "@/services/supabaseImageService";

interface QuoteStep {
  id: string;
  title: string;
  date: string;
  description: string;
  segments: Array<{
    id: string;
    title: string;
    provider?: string;
  }>;
}

interface QuoteItinerarySectionProps {
  tripId: string;
  steps: QuoteStep[];
  onStepTitleChange: (index: number, value: string) => void;
  onStepDescriptionChange: (index: number, value: string) => void;
  onStepDateChange: (index: number, value: Date) => void;
  onSegmentTitleChange: (stepIndex: number, segIndex: number, value: string) => void;
  onSegmentProviderChange: (stepIndex: number, segIndex: number, value: string) => void;
  stepImages: (SupabaseImage | undefined)[];
  onStepImageUploaded: (index: number, image: SupabaseImage) => void;
  onStepImageDeleted: (index: number) => void;
}

export function QuoteItinerarySection({
  tripId,
  steps,
  onStepTitleChange,
  onStepDescriptionChange,
  onStepDateChange,
  onSegmentTitleChange,
  onSegmentProviderChange,
  stepImages,
  onStepImageUploaded,
  onStepImageDeleted,
}: QuoteItinerarySectionProps) {
  return (
    <section className="itinerary-section mb-16" data-pdf-section="itinerary">
      <h2 className="text-3xl font-bold mb-8">Votre programme détaillé</h2>
      
      <div className="space-y-8">
        {steps.map((step, stepIndex) => (
          <div key={stepIndex} className="step-card p-6 bg-muted/20 rounded-lg border border-border">
            {/* Image de l'étape */}
            <div className="mb-4 no-print">
              <ImageUploader
                tripId={tripId}
                stepId={step.id}
                imageType="quote-step"
                position={stepIndex + 1}
                currentImage={stepImages[stepIndex]}
                onImageUploaded={(image) => onStepImageUploaded(stepIndex, image)}
                onImageDeleted={() => onStepImageDeleted(stepIndex)}
              />
            </div>

            {stepImages[stepIndex] && (
              <div className="mb-4 rounded-lg overflow-hidden print-only">
                <img 
                  src={stepImages[stepIndex]!.public_url} 
                  alt={`Step ${stepIndex + 1}`} 
                  className="w-full h-48 object-cover"
                />
              </div>
            )}

            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                J{stepIndex + 1}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">
                  <EditableText
                    value={step.title}
                    onChange={(newValue) => onStepTitleChange(stepIndex, newValue)}
                    className="text-xl font-semibold"
                    placeholder={`Jour ${stepIndex + 1}`}
                  />
                </h3>
                <div className="text-sm text-muted-foreground mb-2">
                  <EditableDate 
                    value={step.date ? new Date(step.date) : new Date()} 
                    onChange={(newValue) => onStepDateChange(stepIndex, newValue)}
                  />
                </div>
              </div>
            </div>

            <div className="mb-4">
              <EditableText
                value={step.description}
                onChange={(newValue) => onStepDescriptionChange(stepIndex, newValue)}
                multiline
                className="text-muted-foreground leading-relaxed"
                placeholder="Description de la journée..."
              />
            </div>

            {step.segments.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                  Prestations
                </h4>
                {step.segments.map((segment, segmentIndex) => (
                  <div key={segmentIndex} className="pl-4 border-l-2 border-primary/30">
                    <div className="font-medium">
                      <EditableText
                        value={segment.title}
                        onChange={(newValue) =>
                          onSegmentTitleChange(stepIndex, segmentIndex, newValue)
                        }
                        placeholder="Prestation"
                      />
                    </div>
                    {segment.provider && (
                      <div className="text-sm text-muted-foreground">
                        <EditableText
                          value={segment.provider}
                          onChange={(newValue) =>
                            onSegmentProviderChange(stepIndex, segmentIndex, newValue)
                          }
                          placeholder="Prestataire"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
