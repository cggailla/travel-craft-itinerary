import { EditableText } from "../EditableText";
import { EditableDate } from "../EditableDate";
import { ImageUploader } from "../ImageUploader";
import { SupabaseImage } from "@/services/supabaseImageService";

import { QuoteSlide } from "./QuoteSlide";

interface QuoteStep {
  id: string;
  title: string;
  date: string;
  description: string;
  segments: Array<{
    id: string;
    type: string;
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
      {steps.map((step, stepIndex) => (
        <QuoteSlide key={stepIndex}>
          <div className="quote-slide-number">{slideStartNumber + stepIndex}</div>
          
          <div className="h-full flex flex-col">
            
            {/* Layout 2 colonnes 50/50: Image à gauche, Contenu à droite */}
            <div className="flex gap-8 flex-1 h-full">
              {/* Colonne gauche: Image - 50% */}
              <div className="relative rounded-3xl overflow-hidden w-1/2 h-full">
                <ImageUploader
                  tripId={tripId}
                  stepId={step.id}
                  imageType="quote-step"
                  position={stepIndex + 1}
                  currentImage={stepImages[stepIndex]}
                  onImageUploaded={(image) => onStepImageUploaded(stepIndex, image)}
                  onImageDeleted={() => onStepImageDeleted(stepIndex)}
                  height="h-full"
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Colonne droite: Contenu - 50% */}
              <div className="flex flex-col justify-center w-1/2 py-8">
                {/* Titre */}
                <h3 className="text-3xl md:text-4xl font-bold mb-4 leading-tight" data-pdf-editable={`step-title-${stepIndex}`}>
                  <EditableText
                    value={step.title}
                    onChange={(newValue) => onStepTitleChange(stepIndex, newValue)}
                    className="text-3xl md:text-4xl font-bold"
                    placeholder={`Jour ${stepIndex + 1}`}
                  />
                </h3>

                {/* Infos: Date et Hébergement */}
                <div className="space-y-1 mb-6">
                  <div className="flex items-center gap-3 text-foreground/80">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <EditableDate 
                      value={step.date ? new Date(step.date) : new Date()} 
                      onChange={(newValue) => onStepDateChange(stepIndex, newValue)}
                      className="font-medium text-base"
                    />
                  </div>
                  
                  {/* Afficher l'hébergement s'il existe */}
                  {step.segments.some(seg => seg.type === 'hotel' || seg.type === 'accommodation') && (
                    <div className="flex items-center gap-3 text-foreground/80" data-pdf-editable={`step-accommodation-${stepIndex}`}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="font-medium text-base">
                        Logement {step.segments.find(seg => seg.type === 'hotel' || seg.type === 'accommodation')?.title || 'Non spécifié'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="mb-8" data-pdf-editable={`step-description-${stepIndex}`}>
                  <EditableText
                    value={step.description}
                    onChange={(newValue) => onStepDescriptionChange(stepIndex, newValue)}
                    multiline
                    className="text-foreground leading-relaxed text-sm text-justify"
                    placeholder="Description de la journée..."
                  />
                </div>

                {/* Expériences prévues (segments non-hébergement) - Optionnel ou plus discret */}
                {step.segments.filter(seg => seg.type !== 'hotel' && seg.type !== 'accommodation').length > 0 && (
                  <div className="mt-auto pt-4 border-t border-border/50">
                    <h4 className="font-bold text-base mb-3 text-primary">Expériences prévues</h4>
                    <div className="space-y-1.5">
                      {step.segments
                        .filter(seg => seg.type !== 'hotel' && seg.type !== 'accommodation')
                        .map((segment, segmentIndex) => (
                          <div key={segmentIndex} className="flex items-center gap-3 text-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                            <div className="font-medium">
                              <EditableText
                                value={segment.title}
                                onChange={(newValue) =>
                                  onSegmentTitleChange(stepIndex, segmentIndex, newValue)
                                }
                                placeholder="Expérience"
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </QuoteSlide>
      ))}
    </>
  );
}
