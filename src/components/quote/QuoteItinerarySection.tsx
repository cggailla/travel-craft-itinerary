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
  pdfMode?: boolean;
  slideStartNumber?: number;
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
  pdfMode = false,
  slideStartNumber = 5,
}: QuoteItinerarySectionProps) {
  return (
    <>
      {!pdfMode && (
        <section className="itinerary-section mb-12" data-pdf-section="itinerary">
          <h2 className="text-3xl font-bold mb-8">Votre programme détaillé</h2>
        </section>
      )}
      
      {steps.map((step, stepIndex) => (
        <div key={stepIndex} className={pdfMode ? "quote-slide" : "mb-8"}>
          {pdfMode && <div className="quote-slide-number">{slideStartNumber + stepIndex}</div>}
          
          <div className={pdfMode ? "" : "step-card p-6 bg-muted/20 rounded-lg border border-border"}>
            {/* Titre de section en mode PDF */}
            {pdfMode && stepIndex === 0 && (
              <h2 className="text-2xl font-bold mb-6">Votre programme détaillé</h2>
            )}
            
            {/* Image de l'étape */}
            {!pdfMode && (
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
            )}

            {stepImages[stepIndex] && (
              <div className={pdfMode ? "mb-6" : "mb-4 rounded-lg overflow-hidden"}>
                <img 
                  src={stepImages[stepIndex]!.public_url} 
                  alt={`Step ${stepIndex + 1}`} 
                  className={pdfMode ? "quote-slide-image" : "w-full h-48 object-cover"}
                />
              </div>
            )}

            <div className={pdfMode ? "flex items-start gap-6 mb-6" : "flex items-start gap-4 mb-4"}>
              <div className={pdfMode ? "flex-shrink-0 w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl" : "flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold"}>
                J{stepIndex + 1}
              </div>
              <div className="flex-1">
                <h3 className={pdfMode ? "text-2xl font-bold mb-2" : "text-xl font-semibold mb-2"}>
                  <EditableText
                    value={step.title}
                    onChange={(newValue) => onStepTitleChange(stepIndex, newValue)}
                    className={pdfMode ? "text-2xl font-bold" : "text-xl font-semibold"}
                    placeholder={`Jour ${stepIndex + 1}`}
                  />
                </h3>
                <div className={pdfMode ? "text-base text-muted-foreground mb-3" : "text-sm text-muted-foreground mb-2"}>
                  <EditableDate 
                    value={step.date ? new Date(step.date) : new Date()} 
                    onChange={(newValue) => onStepDateChange(stepIndex, newValue)}
                  />
                </div>
              </div>
            </div>

            <div className={pdfMode ? "mb-6" : "mb-4"}>
              <EditableText
                value={step.description}
                onChange={(newValue) => onStepDescriptionChange(stepIndex, newValue)}
                multiline
                className={pdfMode ? "text-foreground leading-relaxed" : "text-muted-foreground leading-relaxed"}
                placeholder="Description de la journée..."
              />
            </div>

            {step.segments.length > 0 && (
              <div className="mt-4 space-y-3">
                <h4 className={pdfMode ? "font-bold text-base uppercase tracking-wide" : "font-semibold text-sm uppercase tracking-wide text-muted-foreground"}>
                  Prestations
                </h4>
                {step.segments.map((segment, segmentIndex) => (
                  <div key={segmentIndex} className="pl-4 border-l-2 border-primary/30">
                    <div className={pdfMode ? "font-semibold text-base" : "font-medium"}>
                      <EditableText
                        value={segment.title}
                        onChange={(newValue) =>
                          onSegmentTitleChange(stepIndex, segmentIndex, newValue)
                        }
                        placeholder="Prestation"
                      />
                    </div>
                    {segment.provider && (
                      <div className={pdfMode ? "text-sm text-muted-foreground mt-1" : "text-sm text-muted-foreground"}>
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
        </div>
      ))}
    </>
  );
}
