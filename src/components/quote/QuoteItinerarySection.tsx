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
      {!pdfMode && (
        <section className="itinerary-section mb-12" data-pdf-section="itinerary">
          <h2 className="text-3xl font-bold mb-8">Votre programme détaillé</h2>
        </section>
      )}
      
      {steps.map((step, stepIndex) => (
        <div key={stepIndex} className={pdfMode ? "quote-slide" : "mb-8"}>
          {pdfMode && <div className="quote-slide-number">{slideStartNumber + stepIndex}</div>}
          
          <div className={pdfMode ? "h-full flex flex-col" : "step-card p-6 bg-card rounded-lg border border-border"}>
            {/* Titre de section en mode PDF */}
            {pdfMode && stepIndex === 0 && (
              <h2 className="text-2xl font-bold mb-6">Votre programme détaillé</h2>
            )}
            
            {/* Layout 2 colonnes: Image à gauche, Contenu à droite */}
            <div className={pdfMode ? "flex gap-8 flex-1" : "grid grid-cols-1 md:grid-cols-[40%_1fr] gap-6"}>
              {/* Colonne gauche: Image */}
              <div className="flex-shrink-0">
                {/* Upload zone en mode non-PDF */}
                {!pdfMode && (
                  <div className="mb-2">
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

                {/* Affichage de l'image */}
                {stepImages[stepIndex] ? (
                  <div className={pdfMode ? "h-full" : ""}>
                    <img 
                      src={stepImages[stepIndex]!.public_url} 
                      alt={step.title} 
                      className={pdfMode ? "w-full h-full object-cover rounded-3xl" : "w-full h-64 md:h-96 object-cover rounded-3xl"}
                    />
                  </div>
                ) : (
                  <div className={pdfMode ? "h-full bg-muted rounded-3xl flex items-center justify-center" : "w-full h-64 md:h-96 bg-muted rounded-3xl flex items-center justify-center"}>
                    <p className="text-muted-foreground text-sm">Image de l'étape</p>
                  </div>
                )}
              </div>

              {/* Colonne droite: Contenu */}
              <div className="flex flex-col">
                {/* Badge jour */}
                <div className="inline-flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    J{stepIndex + 1}
                  </div>
                </div>

                {/* Titre */}
                <h3 className={pdfMode ? "text-2xl font-bold mb-4" : "text-xl md:text-2xl font-bold mb-4"}>
                  <EditableText
                    value={step.title}
                    onChange={(newValue) => onStepTitleChange(stepIndex, newValue)}
                    className={pdfMode ? "text-2xl font-bold" : "text-xl md:text-2xl font-bold"}
                    placeholder={`Jour ${stepIndex + 1}`}
                  />
                </h3>

                {/* Infos: Date et Hébergement */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <EditableDate 
                      value={step.date ? new Date(step.date) : new Date()} 
                      onChange={(newValue) => onStepDateChange(stepIndex, newValue)}
                    />
                  </div>
                  
                  {/* Afficher l'hébergement s'il existe */}
                  {step.segments.some(seg => seg.type === 'hotel' || seg.type === 'accommodation') && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="font-medium">
                        Logement {step.segments.find(seg => seg.type === 'hotel' || seg.type === 'accommodation')?.title || 'Non spécifié'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className={pdfMode ? "mb-6 flex-1" : "mb-6"}>
                  <EditableText
                    value={step.description}
                    onChange={(newValue) => onStepDescriptionChange(stepIndex, newValue)}
                    multiline
                    className={pdfMode ? "text-foreground leading-relaxed text-sm" : "text-foreground leading-relaxed"}
                    placeholder="Description de la journée..."
                  />
                </div>

                {/* Expériences prévues (segments non-hébergement) */}
                {step.segments.filter(seg => seg.type !== 'hotel' && seg.type !== 'accommodation').length > 0 && (
                  <div className="mt-auto">
                    <h4 className="font-bold text-base mb-3">Expériences prévues</h4>
                    <div className="space-y-2">
                      {step.segments
                        .filter(seg => seg.type !== 'hotel' && seg.type !== 'accommodation')
                        .map((segment, segmentIndex) => (
                          <div key={segmentIndex} className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                              <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">
                                <EditableText
                                  value={segment.title}
                                  onChange={(newValue) =>
                                    onSegmentTitleChange(stepIndex, segmentIndex, newValue)
                                  }
                                  placeholder="Expérience"
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
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
