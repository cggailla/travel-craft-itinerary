import { useState, useEffect } from "react";
import { QuoteData } from "@/services/quoteService";
import { listSessionImages, type SupabaseImage } from "@/services/supabaseImageService";
import { differenceInDays } from "date-fns";

// Import des composants de sections
import { QuoteCoverPage } from "./quote/QuoteCoverPage";
import { QuotePricingSection } from "./quote/QuotePricingSection";
import { QuoteIncludedSection } from "./quote/QuoteIncludedSection";
import { QuoteHealthFormalities } from "./quote/QuoteHealthFormalities";
import { QuoteItinerarySummary } from "./quote/QuoteItinerarySummary";
import { QuoteItinerarySection } from "./quote/QuoteItinerarySection";
import { QuoteAccommodationSection } from "./quote/QuoteAccommodationSection";
import { QuoteWhyChooseUs } from "./quote/QuoteWhyChooseUs";
import { QuoteReviews } from "./quote/QuoteReviews";
import { QuoteFAQ } from "./quote/QuoteFAQ";
import { QuoteLegalSection } from "./quote/QuoteLegalSection";

import { QuoteSlide } from "./quote/QuoteSlide";

interface QuoteTemplateProps {
  data: QuoteData;
  pdfMode?: boolean;
}

export function QuoteTemplate({ data, pdfMode = false }: QuoteTemplateProps) {
  // États généraux
  const [mainTitle, setMainTitle] = useState(data.title || "Votre voyage");
  const [participants, setParticipants] = useState(data.participants || "");
  const [startDate, setStartDate] = useState<Date>(data.startDate ? new Date(data.startDate) : new Date());
  const [endDate, setEndDate] = useState<Date>(data.endDate ? new Date(data.endDate) : new Date());
  const [price, setPrice] = useState(data.price?.toString() || "");
  
  // États pour la section tarifaire
  const [destination, setDestination] = useState(data.destination || "Égypte");
  const [numberOfTravelers, setNumberOfTravelers] = useState(data.numberOfPeople?.toString() + " pers." || "4 pers.");

  // États pour les sections
  const [advisorMessage, setAdvisorMessage] = useState(
    "J'ai créé cet itinéraire en regroupant au maximum tout ce que vous aimez. J'espère que ce voyage vous plaira, n'hésitez pas à me contacter si vous avez des commentaires ou si vous souhaitez faire des ajustements, je suis là pour ça. Bonne découverte !"
  );

  const [includedItems, setIncludedItems] = useState([
    "Tous les transferts privés en véhicule climatisé",
    "Les entrées des sites mentionnés dans le programme",
    "Hébergement en chambre double dans les établissements mentionnés (ou similaire)",
    "La demi-pension (petits-déjeuners et dîners)",
    "Les visites et excursions accompagnées par un guide francophone",
    "L'assistance du personnel de nos correspondants locaux",
    "Les vols nationaux et internationaux"
  ]);

  const [excludedItems, setExcludedItems] = useState([
    "Les boissons et les dépenses personnelles",
    "Les pourboires (hôtels, restaurants, chauffeurs, guides)",
    "Le visa d'entrée (coût d'environ 45 CHF, sujet à modification)",
    "Les assurances voyage"
  ]);

  const [entryFormalities, setEntryFormalities] = useState("");
  const [healthRequirements, setHealthRequirements] = useState("");

  useEffect(() => {
    if (data.generalInfo?.entry_requirements) {
      const reqs = data.generalInfo.entry_requirements;
      setEntryFormalities(`Passeport: ${reqs.passport}\nVisa: ${reqs.visa}\nValidité: ${reqs.validity}`);
    } else {
      setEntryFormalities("");
    }

    if (data.generalInfo?.health_requirements) {
      const health = data.generalInfo.health_requirements;
      const vaccines = Array.isArray(health.vaccines) ? health.vaccines.join(", ") : health.vaccines;
      setHealthRequirements(`Vaccins: ${vaccines}\nConseils: ${health.insurance_advice}\nEau: ${health.water_safety}`);
    } else {
      setHealthRequirements("");
    }
  }, [data.generalInfo]);

  const [cancellationPolicy, setCancellationPolicy] = useState(
    "Les conditions d'annulation spécifiques à ce voyage vous seront communiquées lors de la réservation. Des frais peuvent s'appliquer en fonction de la date d'annulation."
  );

  // Extraire automatiquement les hébergements depuis les segments de type 'hotel' ou 'accommodation'
  const [accommodations, setAccommodations] = useState(() => {
    const hotelSegments: Array<{
      name: string;
      type: string;
      nights: string;
      location: string;
      description: string;
      startDate: Date;
    }> = [];

    data.steps.forEach(step => {
      step.segments
        .filter(seg => seg.type === 'hotel' || seg.type === 'accommodation')
        .forEach(seg => {
          // Éviter les doublons (même nom d'hôtel)
          if (hotelSegments.some(h => h.name === seg.title)) {
            return;
          }

          // Récupérer les dates du segment
          const segmentData = seg as any;
          const startDate = segmentData.start_date ? new Date(segmentData.start_date) : (step.date ? new Date(step.date) : new Date());
          const endDate = segmentData.end_date ? new Date(segmentData.end_date) : null;
          
          // Calculer le nombre de nuits
          let nights = "1 nuit";
          if (endDate && startDate) {
            const numberOfNights = differenceInDays(endDate, startDate);
            if (numberOfNights > 0) {
              nights = numberOfNights === 1 ? "1 nuit" : `${numberOfNights} nuits`;
            }
          }

          // Utiliser les données enrichies si disponibles
          const starRating = segmentData.star_rating;
          
          hotelSegments.push({
            name: seg.title,
            type: starRating ? `Hôtel ${starRating}*` : "Hôtel",
            nights: nights,
            location: step.location || "",
            description: seg.description || "",
            startDate: startDate
          });
        });
    });

    // Trier par date de début
    hotelSegments.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    // Retirer le champ startDate après le tri (pas nécessaire dans l'interface)
    const sortedAccommodations = hotelSegments.map(({ startDate, ...rest }) => rest);

    // Si aucun hébergement trouvé, retourner des exemples
    if (sortedAccommodations.length === 0) {
      return [
        { name: "Hôtel exemple 1", type: "Hôtel 5*", nights: "3 nuits", location: "Ville 1", description: "" },
        { name: "Hôtel exemple 2", type: "Hôtel 4*", nights: "2 nuits", location: "Ville 2", description: "" }
      ];
    }

    return sortedAccommodations;
  });

  const [legalMentions, setLegalMentions] = useState(
    "Ad Gentes est une agence de voyages basée en Suisse. Toutes nos prestations sont soumises aux conditions générales de vente disponibles sur demande. Garantie financière conforme à la législation suisse."
  );

  const [contactName, setContactName] = useState("Votre conseiller");
  const [contactEmail, setContactEmail] = useState("contact@ad-gentes.ch");
  const [contactPhone, setContactPhone] = useState("+41 22 908 61 83");

  const [quoteDescription, setQuoteDescription] = useState(
    data.quoteDescription || "Embarquez pour un voyage à travers les âges, des pyramides majestueuses du Caire aux temples légendaires d'Abou Simbel. Naviguez sur les eaux mythiques du Nil et laissez-vous envoûter par les trésors millénaires des pharaons."
  );

  // Extraire les points forts (activités principales)
  const [highlights, setHighlights] = useState(() => {
    if (data.quoteHighlights && data.quoteHighlights.length > 0) {
      return data.quoteHighlights;
    }
    const activities: string[] = [];
    data.steps.forEach(step => {
      step.segments.forEach(seg => {
        // Exclure hôtels et transports pour ne garder que les activités/visites
        if (seg.type !== 'hotel' && seg.type !== 'accommodation' && seg.type !== 'transport' && seg.type !== 'flight') {
          activities.push(seg.title);
        }
      });
    });
    // Limiter à 5 points forts et supprimer les doublons
    return Array.from(new Set(activities)).slice(0, 5);
  });

  // États pour "Pourquoi nous choisir"
  const [whyChooseUsTitle, setWhyChooseUsTitle] = useState("Pourquoi choisir Ad Gentes ?");
  const [whyChooseUsItems, setWhyChooseUsItems] = useState([
    {
      icon: "headphones",
      title: "Accompagnement personnalisé",
      description: "Un conseiller dédié vous accompagne de A à Z dans la création de votre voyage sur mesure"
    },
    {
      icon: "award",
      title: "Conseillers spécialistes",
      description: "Notre équipe connaît personnellement les destinations et partenaires locaux"
    },
    {
      icon: "star",
      title: "Voyages testés et validés",
      description: "Tous nos circuits sont testés par nos équipes pour garantir la meilleure expérience"
    },
    {
      icon: "clock",
      title: "Réactivité 24/7",
      description: "Une assistance disponible avant, pendant et après votre voyage"
    },
    {
      icon: "shield",
      title: "Garantie suisse",
      description: "Sécurité financière et garantie de remboursement selon la législation suisse"
    },
    {
      icon: "mapPin",
      title: "Service premium",
      description: "Des prestations haut de gamme sélectionnées avec soin pour votre confort"
    }
  ]);

  // États pour les avis clients
  const [reviewsTitle, setReviewsTitle] = useState("Ce que nos voyageurs disent de nous");
  const [overallRating, setOverallRating] = useState("4.9");
  const [totalReviews, setTotalReviews] = useState("150");
  const [reviews, setReviews] = useState([
    {
      author: "Marie & Thomas",
      text: "Un voyage exceptionnel ! L'organisation était parfaite et notre conseiller a su créer un itinéraire qui correspondait exactement à nos attentes.",
      rating: 5
    },
    {
      author: "Sophie L.",
      text: "Service impeccable du début à la fin. Les hôtels étaient magnifiques et toutes les excursions mémorables. Je recommande vivement !",
      rating: 5
    },
    {
      author: "Jean-Pierre F.",
      text: "Professionnalisme et écoute. Ad Gentes a transformé notre rêve de voyage en réalité avec une attention aux détails remarquable.",
      rating: 5
    }
  ]);

  // États pour la FAQ
  const [faqTitle, setFaqTitle] = useState("Questions fréquentes");
  const [faqItems, setFaqItems] = useState([
    {
      question: "Comment fonctionnent les assurances voyage ?",
      answer: "Nous proposons des assurances complètes couvrant l'annulation, les frais médicaux, le rapatriement et la responsabilité civile. Nos conseillers vous aideront à choisir la formule adaptée à votre voyage."
    },
    {
      question: "Peut-on modifier le programme proposé ?",
      answer: "Absolument ! Nos devis sont entièrement personnalisables. Vous pouvez modifier les hébergements, ajouter des activités, ou ajuster les dates selon vos préférences. Votre conseiller est là pour adapter le voyage à vos souhaits."
    },
    {
      question: "Que se passe-t-il si un vol est retardé ou annulé ?",
      answer: "En cas de perturbation, notre service d'assistance 24/7 intervient immédiatement pour trouver des solutions alternatives et réorganiser votre voyage sans frais supplémentaires."
    },
    {
      question: "Comment fonctionne la garantie financière ?",
      answer: "Ad Gentes dispose d'une garantie financière complète selon la législation suisse. Vos paiements sont protégés et vous bénéficiez d'une couverture en cas d'insolvabilité de l'agence."
    }
  ]);

  // États pour les steps
  const [steps, setSteps] = useState(
    data.steps.map(step => ({
      ...step,
      title: step.title || "",
      date: step.date || "",
      description: step.quoteDescription || step.description || "",
      segments: step.segments.map(seg => ({
        ...seg,
        title: seg.title || "",
        description: seg.description || "",
        provider: seg.provider || ""
      }))
    }))
  );

  // État pour l'image du résumé
  const [summaryImage, setSummaryImage] = useState<SupabaseImage | undefined>(undefined);

  const handleSummaryImageUploaded = (image: SupabaseImage) => {
    setSummaryImage(image);
  };

  const handleSummaryImageDeleted = () => {
    setSummaryImage(undefined);
  };

  // Parse trip summary to extract step details (title, location, date)
  const [summarySteps, setSummarySteps] = useState(() => {
    const parseSteps = () => {
      if (data.tripSummary) {
        const summaryLines = data.tripSummary.split('\n');
        const parsedSteps: { id: string, title: string, date: string, location: string }[] = [];
        const stepRegex = /^Etape \d+ - (.*?) (?:\((\d{1,2}\/\d{1,2})\))?\s*\{([^}]+)\}/;
        
        let currentStepIndex = 0;
        summaryLines.forEach(line => {
          const match = line.match(stepRegex);
          if (match) {
            const existingStep = data.steps[currentStepIndex];
            const id = existingStep ? existingStep.id : `summary-step-${currentStepIndex}`;
            const date = existingStep ? existingStep.date : "";
            parsedSteps.push({
              id,
              title: match[1].trim(),
              date,
              location: match[3].trim()
            });
            currentStepIndex++;
          }
        });
        if (parsedSteps.length > 0) return parsedSteps;
      }
      
      // Fallback: use steps data with basic cleaning
      return data.steps.map(s => {
        let title = s.title;
        // Basic cleaning: remove "Etape X -" and date in parens
        title = title.replace(/^Etape \d+ - /, '').replace(/\(\d{1,2}\/\d{1,2}\)/, '').trim();
        
        let location = s.location || "";
        // Extract location if in title {Location}
        const locMatch = title.match(/\{([^}]+)\}/);
        if (locMatch) {
          location = locMatch[1];
          title = title.replace(/\{[^}]+\}/, '').trim();
        }
        
        return {
          id: s.id,
          title,
          date: s.date,
          location
        };
      });
    };
    return parseSteps();
  });

  // Update summary steps if tripSummary changes
  useEffect(() => {
    const parseSteps = () => {
      if (data.tripSummary) {
        const summaryLines = data.tripSummary.split('\n');
        const parsedSteps: { id: string, title: string, date: string, location: string }[] = [];
        const stepRegex = /^Etape \d+ - (.*?) (?:\((\d{1,2}\/\d{1,2})\))?\s*\{([^}]+)\}/;
        
        let currentStepIndex = 0;
        summaryLines.forEach(line => {
          const match = line.match(stepRegex);
          if (match) {
            const existingStep = data.steps[currentStepIndex];
            const id = existingStep ? existingStep.id : `summary-step-${currentStepIndex}`;
            const date = existingStep ? existingStep.date : "";
            parsedSteps.push({
              id,
              title: match[1].trim(),
              date,
              location: match[3].trim()
            });
            currentStepIndex++;
          }
        });
        if (parsedSteps.length > 0) return parsedSteps;
      }
      
      return data.steps.map(s => {
        let title = s.title;
        title = title.replace(/^Etape \d+ - /, '').replace(/\(\d{1,2}\/\d{1,2}\)/, '').trim();
        let location = s.location || "";
        const locMatch = title.match(/\{([^}]+)\}/);
        if (locMatch) {
          location = locMatch[1];
          title = title.replace(/\{[^}]+\}/, '').trim();
        }
        return {
          id: s.id,
          title,
          date: s.date,
          location
        };
      });
    };
    
    setSummarySteps(parseSteps());
  }, [data.tripSummary, data.steps]);

  const handleSummaryStepChange = (id: string, field: 'title' | 'location' | 'date', value: string) => {
    setSummarySteps(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  // Mettre à jour les steps si les données changent (ex: après génération IA)
  useEffect(() => {
    setSteps(data.steps.map(step => ({
      ...step,
      title: step.title || "",
      date: step.date || "",
      description: step.quoteDescription || step.description || "",
      segments: step.segments.map(seg => ({
        ...seg,
        title: seg.title || "",
        description: seg.description || "",
        provider: seg.provider || ""
      }))
    })));
  }, [data.steps]);

  // Mettre à jour la description et les points forts si les données changent (ex: après génération IA)
  useEffect(() => {
    if (data.quoteDescription) {
      setQuoteDescription(data.quoteDescription);
    }
    if (data.quoteHighlights && data.quoteHighlights.length > 0) {
      setHighlights(data.quoteHighlights);
    }
  }, [data.quoteDescription, data.quoteHighlights]);

  // Images
  const [quoteCoverImage, setQuoteCoverImage] = useState<SupabaseImage | undefined>();
  const [pricingImage, setPricingImage] = useState<SupabaseImage | undefined>();
  const [stepImages, setStepImages] = useState<(SupabaseImage | undefined)[]>([]);

  useEffect(() => {
    const loadImages = async () => {
      const result = await listSessionImages(data.tripId);
      if (result.success && result.data) {
        const quoteCover = result.data.find(img => img.file_name.startsWith('quote_cover'));
        if (quoteCover) setQuoteCoverImage(quoteCover);

        const pricingImg = result.data.find(img => img.file_name.startsWith('quote-pricing'));
        if (pricingImg) setPricingImage(pricingImg);

        const summaryImg = result.data.find(img => img.file_name.startsWith('quote-summary'));
        if (summaryImg) setSummaryImage(summaryImg);

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

  const handlePricingImageUploaded = (image: SupabaseImage) => {
    setPricingImage(image);
  };

  const handlePricingImageDeleted = () => {
    setPricingImage(undefined);
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
    <div id="quote-content" className="quote-container max-w-5xl mx-auto bg-background p-8" data-pdf-trip-id={data.tripId}>
      {/* VERSION NUMBER - Top Right */}
      {!pdfMode && (
        <div className="text-right text-sm text-muted-foreground mb-4 no-print">
          <span className="font-mono">{versionNumber}</span>
        </div>
      )}

      {/* 1. PAGE DE GARDE */}
      <QuoteSlide className="!bg-[#FDFBF7]">
        <div className="quote-slide-number">1</div>
        <QuoteCoverPage
          tripId={data.tripId}
          title={mainTitle}
          onTitleChange={setMainTitle}
          participants={participants}
          onParticipantsChange={setParticipants}
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
          coverImage={quoteCoverImage}
          onImageUploaded={handleQuoteCoverUploaded}
          onImageDeleted={handleQuoteCoverDeleted}
        />
      </QuoteSlide>

      {/* 2. BLOC TARIFAIRE */}
      <QuoteSlide>
        <div className="quote-slide-number">2</div>
        <QuotePricingSection
          tripId={data.tripId}
          title={mainTitle}
          onTitleChange={setMainTitle}
          destination={destination}
          onDestinationChange={setDestination}
          startDate={startDate}
          endDate={endDate}
          numberOfTravelers={numberOfTravelers}
          onNumberOfTravelersChange={setNumberOfTravelers}
          totalPrice={price}
          onTotalPriceChange={setPrice}
          pricingImage={pricingImage}
          onImageUploaded={handlePricingImageUploaded}
          onImageDeleted={handlePricingImageDeleted}
          highlights={highlights}
          onHighlightsChange={setHighlights}
          description={quoteDescription}
          onDescriptionChange={setQuoteDescription}
        />
      </QuoteSlide>

      {/* 3. INCLUS / NON INCLUS */}
      <QuoteSlide>
        <div className="quote-slide-number">3</div>
        <QuoteIncludedSection
          includedItems={includedItems}
          onIncludedItemsChange={setIncludedItems}
          excludedItems={excludedItems}
          onExcludedItemsChange={setExcludedItems}
        />
      </QuoteSlide>

      {/* 4. SANTÉ & FORMALITÉS */}
      <QuoteSlide>
        <div className="quote-slide-number">4</div>
        <QuoteHealthFormalities
          entryFormalities={entryFormalities}
          onEntryFormalitiesChange={setEntryFormalities}
          healthRequirements={healthRequirements}
          onHealthRequirementsChange={setHealthRequirements}
          cancellationPolicy={cancellationPolicy}
          onCancellationPolicyChange={setCancellationPolicy}
        />
      </QuoteSlide>

      {/* 5. RÉSUMÉ ITINÉRAIRE */}
      <QuoteSlide className="!bg-[#FDFBF7]">
        <div className="quote-slide-number">5</div>
        <QuoteItinerarySummary
          tripId={data.tripId}
          steps={summarySteps}
          onStepChange={handleSummaryStepChange}
          summaryImage={summaryImage}
          onImageUploaded={handleSummaryImageUploaded}
          onImageDeleted={handleSummaryImageDeleted}
        />
      </QuoteSlide>

      {/* 6. PROGRAMME JOUR PAR JOUR - Chaque étape = 1 slide */}
      <QuoteItinerarySection
        tripId={data.tripId}
        steps={steps}
        onStepTitleChange={updateStepTitle}
        onStepDescriptionChange={updateStepDescription}
        onStepDateChange={updateStepDate}
        onSegmentTitleChange={updateSegmentTitle}
        onSegmentProviderChange={updateSegmentProvider}
        stepImages={stepImages}
        onStepImageUploaded={handleStepImageUploaded}
        onStepImageDeleted={handleStepImageDeleted}
        pdfMode={pdfMode}
        slideStartNumber={6}
      />

      {/* 7. HÉBERGEMENTS */}
      <QuoteSlide>
        <div className="quote-slide-number">{6 + steps.length}</div>
        <QuoteAccommodationSection
          accommodations={accommodations}
          onAccommodationsChange={setAccommodations}
        />
      </QuoteSlide>

      {/* 8. POURQUOI NOUS CHOISIR */}
      <QuoteSlide className="!bg-gradient-to-br !from-primary/5 !to-primary/10">
        <div className="quote-slide-number">{7 + steps.length}</div>
        <QuoteWhyChooseUs
          title={whyChooseUsTitle}
          onTitleChange={setWhyChooseUsTitle}
          items={whyChooseUsItems}
          onItemsChange={setWhyChooseUsItems}
        />
      </QuoteSlide>

      {/* 9. AVIS CLIENTS */}
      <QuoteSlide className="!bg-gray-100">
        <div className="quote-slide-number">{8 + steps.length}</div>
        <QuoteReviews
          title={reviewsTitle}
          onTitleChange={setReviewsTitle}
          overallRating={overallRating}
          onOverallRatingChange={setOverallRating}
          totalReviews={totalReviews}
          onTotalReviewsChange={setTotalReviews}
          reviews={reviews}
          onReviewsChange={setReviews}
        />
      </QuoteSlide>

      {/* 10. FAQ */}
      <QuoteSlide className="!bg-[#FDFBF7]">
        <div className="quote-slide-number">{9 + steps.length}</div>
        <QuoteFAQ
          title={faqTitle}
          onTitleChange={setFaqTitle}
          faqItems={faqItems}
          onFaqItemsChange={setFaqItems}
        />
      </QuoteSlide>

      {/* 11. MENTIONS LÉGALES & CONTACT */}
      <QuoteSlide>
        <div className="quote-slide-number">{10 + steps.length}</div>
        <QuoteLegalSection
          legalMentions={legalMentions}
          onLegalMentionsChange={setLegalMentions}
          contactName={contactName}
          onContactNameChange={setContactName}
          contactEmail={contactEmail}
          onContactEmailChange={setContactEmail}
          contactPhone={contactPhone}
          onContactPhoneChange={setContactPhone}
        />
      </QuoteSlide>
    </div>
  );
}
