import { useState, useEffect } from "react";
import { QuoteData } from "@/services/quoteService";
import { listSessionImages, type SupabaseImage } from "@/services/supabaseImageService";

// Import des composants de sections
import { QuoteCoverPage } from "./quote/QuoteCoverPage";
import { QuotePricingSection } from "./quote/QuotePricingSection";
import { QuoteIncludedSection } from "./quote/QuoteIncludedSection";
import { QuoteHealthFormalities } from "./quote/QuoteHealthFormalities";
import { QuoteItinerarySection } from "./quote/QuoteItinerarySection";
import { QuoteAccommodationSection } from "./quote/QuoteAccommodationSection";
import { QuoteLegalSection } from "./quote/QuoteLegalSection";

interface QuoteTemplateProps {
  data: QuoteData;
}

export function QuoteTemplate({ data }: QuoteTemplateProps) {
  // États généraux
  const [mainTitle, setMainTitle] = useState(data.title || "Votre voyage");
  const [participants, setParticipants] = useState(data.participants || "");
  const [startDate, setStartDate] = useState<Date>(data.startDate ? new Date(data.startDate) : new Date());
  const [endDate, setEndDate] = useState<Date>(data.endDate ? new Date(data.endDate) : new Date());
  const [price, setPrice] = useState(data.price?.toString() || "");
  const [pricePerPerson, setPricePerPerson] = useState("");

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

  const [entryFormalities, setEntryFormalities] = useState(
    "Un passeport valable au moins 6 mois après la date de retour est requis. Un visa d'entrée peut être obligatoire selon votre nationalité."
  );

  const [healthRequirements, setHealthRequirements] = useState(
    "Aucun vaccin n'est obligatoire. Nous recommandons d'être à jour dans vos vaccinations habituelles. Consultez votre médecin avant le départ."
  );

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
          // Calculer le nombre de nuits si les dates sont disponibles
          let nights = "1 nuit";
          let startDate = new Date();
          
          if (step.date) {
            startDate = new Date(step.date);
          }

          // Utiliser les données enrichies si disponibles
          const enrichedData = (seg as any).enriched;
          const starRating = (seg as any).star_rating;
          
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

      {/* 1. PAGE DE GARDE */}
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

      {/* 2. BLOC TARIFAIRE */}
      <QuotePricingSection
        title={mainTitle}
        onTitleChange={setMainTitle}
        pricePerPerson={pricePerPerson}
        onPricePerPersonChange={setPricePerPerson}
        totalPrice={price}
        onTotalPriceChange={setPrice}
        advisorMessage={advisorMessage}
        onAdvisorMessageChange={setAdvisorMessage}
      />

      {/* 3. INCLUS / NON INCLUS */}
      <QuoteIncludedSection
        includedItems={includedItems}
        onIncludedItemsChange={setIncludedItems}
        excludedItems={excludedItems}
        onExcludedItemsChange={setExcludedItems}
      />

      {/* 4. SANTÉ & FORMALITÉS */}
      <QuoteHealthFormalities
        entryFormalities={entryFormalities}
        onEntryFormalitiesChange={setEntryFormalities}
        healthRequirements={healthRequirements}
        onHealthRequirementsChange={setHealthRequirements}
        cancellationPolicy={cancellationPolicy}
        onCancellationPolicyChange={setCancellationPolicy}
      />

      {/* 5. PROGRAMME JOUR PAR JOUR */}
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
      />

      {/* 6. HÉBERGEMENTS */}
      <QuoteAccommodationSection
        accommodations={accommodations}
        onAccommodationsChange={setAccommodations}
      />

      {/* 7. MENTIONS LÉGALES & CONTACT */}
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
    </div>
  );
}
