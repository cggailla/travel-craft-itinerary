import { useState, useEffect } from "react";
import { EditableText } from "./EditableText";
import { EditableDate } from "./EditableDate";
import { EditableContent } from "./EditableContent";
import { ImageUploader } from "./ImageUploader";
import { listSessionImages, type SupabaseImage } from "@/services/supabaseImageService";
import { Check, Star } from "lucide-react";
import { QuoteData } from "@/services/quoteService";

interface QuoteTemplateProps {
  data: QuoteData;
}

export function QuoteTemplate({ data }: QuoteTemplateProps) {
  // États généraux
  const [mainTitle, setMainTitle] = useState(data.title || "Votre voyage");
  const [destination, setDestination] = useState(data.destination || "");
  const [startDate, setStartDate] = useState<Date>(data.startDate ? new Date(data.startDate) : new Date());
  const [endDate, setEndDate] = useState<Date>(data.endDate ? new Date(data.endDate) : new Date());
  const [participants, setParticipants] = useState(data.participants || "");
  const [description, setDescription] = useState("Embarquez pour un voyage inoubliable...");
  const [price, setPrice] = useState(data.price?.toString() || "");
  const [pricePerPerson, setPricePerPerson] = useState("");
  const [numberOfPeople, setNumberOfPeople] = useState(data.numberOfPeople?.toString() || "");
  const tripDuration = data.duration || 0;

  // États pour les sections
  const [highlights, setHighlights] = useState([
    "Point fort 1",
    "Point fort 2", 
    "Point fort 3",
    "Point fort 4",
    "Point fort 5"
  ]);

  const [whyBookPoints, setWhyBookPoints] = useState([
    "Fondée en 1998 : plus de 25 ans d'expérience dans le voyage sur mesure",
    "Une équipe de spécialistes passionnés, chacun connaissant intimement ses destinations",
    "Un accompagnement complet avant, pendant et après votre voyage",
    "Des partenaires de confiance rigoureusement sélectionnés",
    "Une agence suisse reconnue, avec un service sérieux et transparent",
    "Une assistance 24h/24 pour votre tranquillité"
  ]);

  const [advisorMessage, setAdvisorMessage] = useState(
    "J'ai créé cet itinéraire en regroupant au maximum tout ce que vous aimez. J'espère que ce voyage vous plaira, n'hésitez pas à me contacter si vous avez des commentaires ou si vous souhaitez faire des ajustements, je suis là pour ça. Bonne découverte !"
  );

  const [includedItems, setIncludedItems] = useState([
    "Tous les transferts privés",
    "Les entrées des sites mentionnés dans le programme",
    "Hébergement en chambre double",
    "La demi-pension (petits-déjeuners et dîners)",
    "Les visites et excursions accompagnées par un guide francophone",
    "L'assistance du personnel de nos correspondants locaux"
  ]);

  const [excludedItems, setExcludedItems] = useState([
    "Les vols internationaux",
    "Les boissons et les dépenses personnelles",
    "Les pourboires (hôtels, restaurants, chauffeurs, guides)",
    "Le visa d'entrée (environ 45 CHF, sujet à modification)"
  ]);

  const [entryFormalities, setEntryFormalities] = useState(
    "Un passeport valable au moins 6 mois après la date de retour est requis. Un visa d'entrée est obligatoire et peut être obtenu à l'arrivée (coût d'environ 45 CHF, sujet à modification)."
  );

  const [healthRequirements, setHealthRequirements] = useState(
    "Aucun vaccin n'est obligatoire. Nous recommandons d'être à jour dans vos vaccinations habituelles."
  );

  const [cancellationPolicy, setCancellationPolicy] = useState(
    "Les conditions d'annulation spécifiques à ce voyage vous seront communiquées lors de la réservation. Des frais peuvent s'appliquer en fonction de la date d'annulation."
  );

  const [testimonials, setTestimonials] = useState([
    {
      quote: "Un voyage absolument merveilleux ! L'organisation était parfaite et nous avons pu découvrir des endroits extraordinaires.",
      author: "Marie & Pierre - Voyage en Italie"
    },
    {
      quote: "Service impeccable, équipe très professionnelle et à l'écoute. Nous recommandons vivement Ad Gentes !",
      author: "Sophie - Voyage au Japon"
    },
    {
      quote: "Une expérience unique du début à la fin. L'accompagnement personnalisé a fait toute la différence.",
      author: "Thomas - Voyage en Thaïlande"
    }
  ]);

  const [faqs, setFaqs] = useState([
    {
      question: "Pourquoi réserver avec une agence plutôt qu'en ligne ?",
      answer: "Réserver avec nous, c'est bénéficier de conseils personnalisés, d'un suivi avant, pendant et après le voyage, ainsi que de la sécurité d'une agence suisse expérimentée."
    },
    {
      question: "Que se passe-t-il si un problème survient pendant mon voyage ?",
      answer: "Vous n'êtes jamais seul : nous offrons une assistance 24h/24 et nous intervenons directement auprès de nos partenaires locaux pour trouver une solution rapide."
    },
    {
      question: "Les prix proposés sont-ils tout compris ?",
      answer: "Nos devis incluent toutes les prestations mentionnées dans le programme détaillé. Nous vous informons clairement des éventuels frais non inclus (repas libres, pourboires, dépenses personnelles). Pas de mauvaises surprises."
    },
    {
      question: "Puis-je modifier ou annuler mon voyage après confirmation ?",
      answer: "Oui, des modifications ou annulations sont possibles selon les conditions des prestataires (compagnies aériennes, hôtels, etc.). Nous vous accompagnerons dans ces démarches pour limiter au maximum les frais."
    }
  ]);

  const [legalMentions, setLegalMentions] = useState(
    "Ad Gentes est une agence de voyages basée en Suisse. Toutes nos prestations sont soumises aux conditions générales de vente disponibles sur demande. Garantie financière conforme à la législation suisse."
  );

  const [contactName, setContactName] = useState("Votre conseiller");
  const [contactEmail, setContactEmail] = useState("contact@ad-gentes.ch");
  const [contactPhone, setContactPhone] = useState("+41 22 908 61 83");

  // États pour les steps
  const [steps, setSteps] = useState(
    data.steps.map(step => ({
      ...step,
      title: step.title || "",
      date: step.date || "",
      description: step.description || "",
      segments: step.segments.map(seg => ({
        ...seg,
        title: seg.title || "",
        description: seg.description || "",
        provider: seg.provider || ""
      }))
    }))
  );

  // Images
  const [quoteCoverImage, setQuoteCoverImage] = useState<SupabaseImage | undefined>();
  const [stepImages, setStepImages] = useState<(SupabaseImage | undefined)[]>([]);

  useEffect(() => {
    const loadImages = async () => {
      const result = await listSessionImages(data.tripId);
      if (result.success && result.data) {
        const quoteCover = result.data.find(img => img.file_name.startsWith('quote_cover'));
        if (quoteCover) setQuoteCoverImage(quoteCover);

        const images: (SupabaseImage | undefined)[] = [];
        for (let i = 0; i < steps.length; i++) {
          const stepImage = result.data.find(img => img.file_name.startsWith(`quote_step_${i}`));
          images.push(stepImage);
        }
        setStepImages(images);
      }
    };
    loadImages();
  }, [data.tripId, steps.length]);

  const handleQuoteCoverUploaded = (image: SupabaseImage) => {
    setQuoteCoverImage(image);
  };

  const handleQuoteCoverDeleted = () => {
    setQuoteCoverImage(undefined);
  };

  const handleStepImageUploaded = (index: number, image: SupabaseImage) => {
    setStepImages(prev => {
      const newImages = [...prev];
      newImages[index] = image;
      return newImages;
    });
  };

  const handleStepImageDeleted = (index: number) => {
    setStepImages(prev => {
      const newImages = [...prev];
      newImages[index] = undefined;
      return newImages;
    });
  };

  const updateStepTitle = (index: number, newTitle: string) => {
    setSteps(prev => prev.map((step, i) => i === index ? { ...step, title: newTitle } : step));
  };

  const updateStepDescription = (index: number, newDesc: string) => {
    setSteps(prev => prev.map((step, i) => i === index ? { ...step, description: newDesc } : step));
  };

  const updateStepDate = (index: number, newDate: Date) => {
    setSteps(prev => prev.map((step, i) => i === index ? { ...step, date: newDate.toISOString() } : step));
  };

  const updateSegmentTitle = (stepIndex: number, segIndex: number, newTitle: string) => {
    setSteps(prev => prev.map((step, i) => 
      i === stepIndex 
        ? { ...step, segments: step.segments.map((seg, j) => j === segIndex ? { ...seg, title: newTitle } : seg) }
        : step
    ));
  };

  const updateSegmentProvider = (stepIndex: number, segIndex: number, newProvider: string) => {
    setSteps(prev => prev.map((step, i) => 
      i === stepIndex 
        ? { ...step, segments: step.segments.map((seg, j) => j === segIndex ? { ...seg, provider: newProvider } : seg) }
        : step
    ));
  };

  // Calculer le numéro de version automatique (VYYYYMMDD)
  const versionNumber = `V${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;

  return (
    <div className="quote-container max-w-5xl mx-auto bg-background p-8">
      {/* VERSION NUMBER - Top Right */}
      <div className="text-right text-sm text-muted-foreground mb-4 no-print">
        <span className="font-mono">{versionNumber}</span>
      </div>

      {/* PAGE DE GARDE */}
      <section className="cover-page mb-16 text-center" data-pdf-section="cover">
        <div className="mb-6 no-print">
          <ImageUploader
            tripId={data.tripId}
            imageType="quote"
            position={1}
            currentImage={quoteCoverImage}
            onImageUploaded={handleQuoteCoverUploaded}
            onImageDeleted={handleQuoteCoverDeleted}
          />
        </div>

        {quoteCoverImage && (
          <div className="mb-8 rounded-lg overflow-hidden print-only">
            <img 
              src={quoteCoverImage.public_url} 
              alt="Cover" 
              className="w-full h-[400px] object-cover"
            />
          </div>
        )}

        <h1 className="text-5xl font-bold mb-6" data-pdf-title>
          <EditableText
            value={mainTitle}
            onChange={setMainTitle}
            className="text-5xl font-bold"
          />
        </h1>

        <div className="text-2xl text-muted-foreground mb-4 uppercase tracking-wide" data-pdf-client>
          <EditableText
            value={participants}
            onChange={setParticipants}
            className="text-2xl"
            placeholder="NOM DES PARTICIPANTS"
          />
        </div>

        <div className="text-xl text-muted-foreground" data-pdf-dates>
          du <EditableDate value={startDate} onChange={setStartDate} /> au{" "}
          <EditableDate value={endDate} onChange={setEndDate} />
        </div>
      </section>

      {/* RÉSUMÉ DU VOYAGE */}
      <section className="summary-section mb-16 p-8 bg-muted/30 rounded-lg" data-pdf-section="summary">
        <h2 className="text-3xl font-bold mb-4">
          <EditableText
            value={mainTitle}
            onChange={setMainTitle}
            className="text-3xl font-bold"
          />
        </h2>

        <div className="mb-6">
          <EditableText
            value={description}
            onChange={setDescription}
            multiline
            className="text-lg leading-relaxed text-muted-foreground"
            placeholder="Description du voyage..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="text-2xl font-semibold">
            {tripDuration} nuits
          </div>
          <div className="text-2xl font-bold text-primary">
            <EditableText
              value={price}
              onChange={setPrice}
              className="text-2xl font-bold"
              placeholder="Prix"
            /> CHF
          </div>
        </div>

        <h3 className="text-xl font-semibold mb-4">Les points forts de ce voyage</h3>
        <ul className="space-y-2 mb-8">
          {highlights.map((highlight, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
              <EditableText
                value={highlight}
                onChange={(newValue) => {
                  const newHighlights = [...highlights];
                  newHighlights[index] = newValue;
                  setHighlights(newHighlights);
                }}
                className="flex-1"
              />
            </li>
          ))}
        </ul>

        <div className="p-6 bg-background rounded-lg border border-border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-semibold mb-1">Destination</div>
              <EditableText value={destination} onChange={setDestination} placeholder="Destination" />
            </div>
            <div>
              <div className="font-semibold mb-1">Dates</div>
              <div>
                <EditableDate value={startDate} onChange={setStartDate} /> au{" "}
                <EditableDate value={endDate} onChange={setEndDate} />
              </div>
            </div>
            <div>
              <div className="font-semibold mb-1">Durée</div>
              <div>{tripDuration} nuits</div>
            </div>
            <div>
              <div className="font-semibold mb-1">Voyageurs</div>
              <EditableText 
                value={numberOfPeople} 
                onChange={setNumberOfPeople}
                placeholder="4 pers."
              />
            </div>
          </div>
        </div>
      </section>

      {/* POURQUOI RÉSERVER AVEC AD GENTES */}
      <section className="why-book-section mb-16 p-8 bg-primary/5 rounded-lg" data-pdf-section="why-book">
        <h2 className="text-3xl font-bold mb-6">Pourquoi réserver avec Ad Gentes ?</h2>
        <ul className="space-y-3">
          {whyBookPoints.map((point, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
              <EditableText
                value={point}
                onChange={(newValue) => {
                  const newPoints = [...whyBookPoints];
                  newPoints[index] = newValue;
                  setWhyBookPoints(newPoints);
                }}
                className="flex-1"
              />
            </li>
          ))}
        </ul>
      </section>

      {/* BLOC TARIFAIRE */}
      <section className="pricing-section mb-16 p-8 bg-muted/30 rounded-lg" data-pdf-section="pricing">
        <h2 className="text-3xl font-bold mb-6">Notre proposition</h2>
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-4">
            <EditableText value={mainTitle} onChange={setMainTitle} />
          </h3>
          <div className="grid grid-cols-2 gap-4 text-2xl font-bold">
            <div>
              <EditableText value={pricePerPerson} onChange={setPricePerPerson} placeholder="2 595" /> CHF/pers.
            </div>
            <div className="text-primary">
              <EditableText value={price} onChange={setPrice} placeholder="10 380" /> CHF au total
            </div>
          </div>
        </div>

        <div className="p-6 bg-background/50 rounded-lg border-l-4 border-primary">
          <p className="text-sm text-muted-foreground mb-2 font-semibold">Le mot de votre conseiller</p>
          <EditableText
            value={advisorMessage}
            onChange={setAdvisorMessage}
            multiline
            className="text-muted-foreground italic"
            placeholder="Message personnalisé de votre conseiller..."
          />
        </div>
      </section>

      {/* PROGRAMME JOUR PAR JOUR */}
      <section className="itinerary-section mb-16" data-pdf-section="itinerary">
        <h2 className="text-3xl font-bold mb-8">Votre programme détaillé</h2>
        
        <div className="space-y-8">
          {steps.map((step, stepIndex) => (
            <div key={stepIndex} className="step-card p-6 bg-muted/20 rounded-lg border border-border">
              {/* Image de l'étape */}
              <div className="mb-4 no-print">
                <ImageUploader
                  tripId={data.tripId}
                  stepId={steps[stepIndex].id}
                  imageType="quote-step"
                  position={stepIndex + 1}
                  currentImage={stepImages[stepIndex]}
                  onImageUploaded={(image) => handleStepImageUploaded(stepIndex, image)}
                  onImageDeleted={() => handleStepImageDeleted(stepIndex)}
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
                      onChange={(newValue) => updateStepTitle(stepIndex, newValue)}
                      className="text-xl font-semibold"
                      placeholder={`Jour ${stepIndex + 1}`}
                    />
                  </h3>
                  <div className="text-sm text-muted-foreground mb-2">
                    <EditableDate 
                      value={step.date ? new Date(step.date) : new Date()} 
                      onChange={(newValue) => updateStepDate(stepIndex, newValue)}
                    />
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <EditableText
                  value={step.description}
                  onChange={(newValue) => updateStepDescription(stepIndex, newValue)}
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
                            updateSegmentTitle(stepIndex, segmentIndex, newValue)
                          }
                          placeholder="Prestation"
                        />
                      </div>
                      {segment.provider && (
                        <div className="text-sm text-muted-foreground">
                          <EditableText
                            value={segment.provider}
                            onChange={(newValue) =>
                              updateSegmentProvider(stepIndex, segmentIndex, newValue)
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

      {/* INCLUS / NON INCLUS */}
      <section className="included-section mb-16" data-pdf-section="included">
        <h2 className="text-3xl font-bold mb-6">Ce qui est inclus</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="included-box p-6 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="text-xl font-semibold mb-4 text-green-700 dark:text-green-400">
              ✓ Inclus dans le prix
            </h3>
            <ul className="space-y-2 text-sm">
              {includedItems.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
                  <EditableText
                    value={item}
                    onChange={(newValue) => {
                      const newItems = [...includedItems];
                      newItems[index] = newValue;
                      setIncludedItems(newItems);
                    }}
                    className="flex-1"
                  />
                </li>
              ))}
            </ul>
          </div>

          <div className="excluded-box p-6 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <h3 className="text-xl font-semibold mb-4 text-orange-700 dark:text-orange-400">
              ✗ Non inclus
            </h3>
            <ul className="space-y-2 text-sm">
              {excludedItems.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-orange-600 dark:text-orange-500 mt-0.5 flex-shrink-0">✗</span>
                  <EditableText
                    value={item}
                    onChange={(newValue) => {
                      const newItems = [...excludedItems];
                      newItems[index] = newValue;
                      setExcludedItems(newItems);
                    }}
                    className="flex-1"
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* SANTÉ & FORMALITÉS */}
      <section className="health-formalities-section mb-16 p-8 bg-muted/30 rounded-lg" data-pdf-section="health">
        <h2 className="text-3xl font-bold mb-6">Informations importantes</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold mb-3">Formalités d'entrée</h3>
            <EditableText
              value={entryFormalities}
              onChange={setEntryFormalities}
              multiline
              className="text-muted-foreground"
              placeholder="Informations sur les formalités d'entrée (passeport, visa, etc.)..."
            />
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-3">Santé</h3>
            <EditableText
              value={healthRequirements}
              onChange={setHealthRequirements}
              multiline
              className="text-muted-foreground"
              placeholder="Informations sur les vaccins, précautions sanitaires..."
            />
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-3">Conditions d'annulation</h3>
            <EditableText
              value={cancellationPolicy}
              onChange={setCancellationPolicy}
              multiline
              className="text-muted-foreground"
              placeholder="Conditions d'annulation spécifiques..."
            />
          </div>
        </div>
      </section>

      {/* AVIS CLIENTS */}
      <section className="reviews-section mb-16 p-8 bg-primary/5 rounded-lg" data-pdf-section="reviews">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <div className="text-2xl font-bold">4.9/5</div>
          <div className="text-sm text-muted-foreground">Basé sur les avis clients</div>
        </div>

        <div className="space-y-6">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="p-6 bg-background rounded-lg border border-border">
              <div className="flex items-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <blockquote className="mb-3 italic text-muted-foreground">
                "<EditableText
                  value={testimonial.quote}
                  onChange={(newValue) => {
                    const newTestimonials = [...testimonials];
                    newTestimonials[index].quote = newValue;
                    setTestimonials(newTestimonials);
                  }}
                  className="italic"
                />"
              </blockquote>
              <div className="text-sm font-semibold">
                <EditableText
                  value={testimonial.author}
                  onChange={(newValue) => {
                    const newTestimonials = [...testimonials];
                    newTestimonials[index].author = newValue;
                    setTestimonials(newTestimonials);
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-section mb-16" data-pdf-section="faq">
        <h2 className="text-3xl font-bold mb-4">Questions fréquentes</h2>
        <p className="text-muted-foreground mb-8">
          Tout ce que vous devez savoir sur votre séjour. Vous ne trouvez pas la réponse à votre question ? Contactez notre équipe.
        </p>

        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div key={index} className="p-6 bg-muted/20 rounded-lg border border-border">
              <h3 className="text-lg font-semibold mb-3">
                <EditableText
                  value={faq.question}
                  onChange={(newValue) => {
                    const newFaqs = [...faqs];
                    newFaqs[index].question = newValue;
                    setFaqs(newFaqs);
                  }}
                  className="text-lg font-semibold"
                />
              </h3>
              <div className="text-muted-foreground">
                <EditableText
                  value={faq.answer}
                  onChange={(newValue) => {
                    const newFaqs = [...faqs];
                    newFaqs[index].answer = newValue;
                    setFaqs(newFaqs);
                  }}
                  multiline
                  className="text-muted-foreground"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* MENTIONS LÉGALES */}
      <section className="legal-section mb-16 p-8 bg-muted/30 rounded-lg text-sm" data-pdf-section="legal">
        <h2 className="text-2xl font-bold mb-4">Mentions légales</h2>
        <EditableText
          value={legalMentions}
          onChange={setLegalMentions}
          multiline
          className="text-muted-foreground text-sm leading-relaxed"
          placeholder="Mentions légales, conditions générales de vente..."
        />
      </section>

      {/* CONTACT FINAL */}
      <section className="contact-section text-center p-8 bg-primary/5 rounded-lg" data-pdf-section="contact">
        <h2 className="text-2xl font-bold mb-4">Vous avez une question ?</h2>
        <p className="text-muted-foreground mb-6">
          Je reste personnellement à votre disposition pour affiner le programme selon vos souhaits !
        </p>

        <div className="space-y-2">
          <div className="font-semibold text-lg">
            <EditableText
              value={contactName}
              onChange={setContactName}
              placeholder="Nom du conseiller"
            />
          </div>
          <div className="text-primary">
            <EditableText
              value={contactEmail}
              onChange={setContactEmail}
              placeholder="email@ad-gentes.ch"
            />
          </div>
          <div className="text-muted-foreground">
            <EditableText
              value={contactPhone}
              onChange={setContactPhone}
              placeholder="+41 22 908 61 83"
            />
          </div>
        </div>

        {/* Logo Ad Gentes */}
        <div className="mt-8">
          <img 
            src="/src/assets/logo-adgentes.png" 
            alt="Ad Gentes" 
            className="h-12 mx-auto opacity-70"
          />
        </div>
      </section>
    </div>
  );
}
