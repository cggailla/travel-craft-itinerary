import { useState } from "react";
import { QuoteData } from "@/services/quoteService";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MapPin, Calendar, Star, CheckCircle2, MessageCircle, Phone, Mail, Globe } from "lucide-react";
import { EditableText } from "./EditableText";
import { EditableContent } from "./EditableContent";

interface QuoteTemplateProps {
  data: QuoteData;
}

export function QuoteTemplate({ data }: QuoteTemplateProps) {
  // États pour l'en-tête
  const [editableTitle, setEditableTitle] = useState(data.title);
  const [editableDestination, setEditableDestination] = useState(data.destination);
  
  // États pour "Pourquoi réserver"
  const [whyBookTitle, setWhyBookTitle] = useState("Pourquoi réserver avec AD Gentes ?");
  const [expertiseTitle, setExpertiseTitle] = useState("Expertise locale");
  const [expertiseDesc, setExpertiseDesc] = useState("Plus de 20 ans d'expérience dans l'organisation de voyages sur mesure");
  const [accompTitle, setAccompTitle] = useState("Accompagnement personnalisé");
  const [accompDesc, setAccompDesc] = useState("Un conseiller dédié pour vous accompagner avant, pendant et après votre voyage");
  const [flexTitle, setFlexTitle] = useState("Flexibilité garantie");
  const [flexDesc, setFlexDesc] = useState("Possibilité de modifier votre programme selon vos envies");
  
  // États pour les témoignages
  const [testimonialsTitle, setTestimonialsTitle] = useState("Ce que disent nos clients");
  const [testimonial1Quote, setTestimonial1Quote] = useState("Un voyage absolument merveilleux ! L'organisation était parfaite et nous avons pu découvrir des endroits extraordinaires.");
  const [testimonial1Author, setTestimonial1Author] = useState("Marie & Pierre - Voyage en Italie");
  const [testimonial2Quote, setTestimonial2Quote] = useState("Service impeccable, équipe très professionnelle et à l'écoute. Nous recommandons vivement AD Gentes !");
  const [testimonial2Author, setTestimonial2Author] = useState("Sophie - Voyage au Japon");
  
  // États pour la FAQ
  const [faqTitle, setFaqTitle] = useState("Questions fréquentes");
  const [faq1Question, setFaq1Question] = useState("Puis-je modifier mon programme ?");
  const [faq1Answer, setFaq1Answer] = useState("Oui, nous pouvons adapter le programme selon vos préférences. N'hésitez pas à nous contacter pour toute modification.");
  const [faq2Question, setFaq2Question] = useState("Quelles sont les conditions d'annulation ?");
  const [faq2Answer, setFaq2Answer] = useState("Les conditions d'annulation dépendent des prestataires. Nous vous fournirons tous les détails lors de la réservation.");
  const [faq3Question, setFaq3Question] = useState("Êtes-vous joignable pendant le voyage ?");
  const [faq3Answer, setFaq3Answer] = useState("Oui, une assistance 24h/24 et 7j/7 est disponible pendant toute la durée de votre voyage.");
  
  // États pour le contact
  const [contactTitle, setContactTitle] = useState("Prêt à partir ?");
  const [contactSubtitle, setContactSubtitle] = useState("Contactez-nous pour finaliser votre réservation ou pour toute question");
  const [contactPhone, setContactPhone] = useState("+33 1 23 45 67 89");
  const [contactEmail, setContactEmail] = useState("contact@adgentes.fr");
  const [contactWebsite, setContactWebsite] = useState("www.adgentes.fr");

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    return format(new Date(dateString), "d MMMM yyyy", { locale: fr });
  };

  return (
    <div id="quote-content" className="w-full max-w-4xl mx-auto bg-background" data-pdf-trip-id={data.tripId}>
      {/* En-tête avec logo et titre */}
      <div className="relative h-64 bg-gradient-to-br from-primary/20 via-primary/10 to-background border-b">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
          <img 
            src="/src/assets/logo-adgentes.png" 
            alt="AD Gentes" 
            className="h-16 mb-6 object-contain"
            data-pdf-logo
          />
          <EditableText
            value={editableTitle}
            onChange={setEditableTitle}
            as="h1"
            className="text-4xl font-bold text-center mb-2"
            data-pdf-quote-title
          />
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <EditableText
                value={editableDestination}
                onChange={setEditableDestination}
                inline
                data-pdf-quote-destination
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span data-pdf-quote-duration>{data.duration} jours</span>
            </div>
          </div>
          {data.startDate && data.endDate && (
            <p className="text-sm text-muted-foreground mt-2" data-pdf-quote-dates>
              Du {formatDate(data.startDate)} au {formatDate(data.endDate)}
            </p>
          )}
        </div>
      </div>

      {/* Programme du voyage */}
      <div className="p-8" data-pdf-program-section>
        <h2 className="text-2xl font-bold mb-6">Votre programme</h2>
        <div className="space-y-6">
          {data.steps.map((step, index) => (
            <div key={step.id} className="border rounded-lg p-6 bg-card" data-pdf-step data-pdf-step-id={step.id}>
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-1" data-pdf-step-title>{step.title}</h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {step.date && (
                      <span data-pdf-step-date>{formatDate(step.date)}</span>
                    )}
                    {step.location && (
                      <span className="flex items-center gap-1" data-pdf-step-location>
                        <MapPin className="h-3 w-3" />
                        {step.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {step.description && (
                <p className="text-muted-foreground mb-4" data-pdf-step-description>{step.description}</p>
              )}

              {step.segments.length > 0 && (
                <div className="space-y-2 mt-4" data-pdf-step-segments>
                  {step.segments.map((segment) => (
                    <div key={segment.id} className="flex items-start gap-3 text-sm pl-16" data-pdf-segment data-pdf-segment-id={segment.id}>
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="font-medium" data-pdf-segment-title>{segment.title}</span>
                        {segment.provider && (
                          <span className="text-muted-foreground ml-2" data-pdf-segment-provider>({segment.provider})</span>
                        )}
                        {segment.description && (
                          <p className="text-muted-foreground mt-1" data-pdf-segment-description>{segment.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pourquoi réserver avec AD Gentes */}
      <div className="bg-muted/30 p-8 border-y" data-pdf-why-section>
        <EditableText
          value={whyBookTitle}
          onChange={setWhyBookTitle}
          as="h2"
          className="text-2xl font-bold mb-6"
          data-pdf-why-title
        />
        <EditableContent className="grid md:grid-cols-3 gap-6">
          <div className="space-y-2" data-pdf-why-expertise>
            <CheckCircle2 className="h-8 w-8 text-primary mb-2" />
            <EditableText
              value={expertiseTitle}
              onChange={setExpertiseTitle}
              as="h3"
              className="font-semibold"
              data-pdf-why-expertise-title
            />
            <EditableText
              value={expertiseDesc}
              onChange={setExpertiseDesc}
              multiline
              as="p"
              className="text-sm text-muted-foreground"
              data-pdf-why-expertise-desc
            />
          </div>
          <div className="space-y-2" data-pdf-why-accomp>
            <CheckCircle2 className="h-8 w-8 text-primary mb-2" />
            <EditableText
              value={accompTitle}
              onChange={setAccompTitle}
              as="h3"
              className="font-semibold"
              data-pdf-why-accomp-title
            />
            <EditableText
              value={accompDesc}
              onChange={setAccompDesc}
              multiline
              as="p"
              className="text-sm text-muted-foreground"
              data-pdf-why-accomp-desc
            />
          </div>
          <div className="space-y-2" data-pdf-why-flex>
            <CheckCircle2 className="h-8 w-8 text-primary mb-2" />
            <EditableText
              value={flexTitle}
              onChange={setFlexTitle}
              as="h3"
              className="font-semibold"
              data-pdf-why-flex-title
            />
            <EditableText
              value={flexDesc}
              onChange={setFlexDesc}
              multiline
              as="p"
              className="text-sm text-muted-foreground"
              data-pdf-why-flex-desc
            />
          </div>
        </EditableContent>
      </div>

      {/* Avis clients */}
      <div className="p-8" data-pdf-testimonials-section>
        <EditableText
          value={testimonialsTitle}
          onChange={setTestimonialsTitle}
          as="h2"
          className="text-2xl font-bold mb-6"
          data-pdf-testimonials-title
        />
        <EditableContent className="grid md:grid-cols-2 gap-6">
          <div className="border rounded-lg p-6 bg-card" data-pdf-testimonial1>
            <div className="flex gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="h-4 w-4 fill-primary text-primary" />
              ))}
            </div>
            <EditableText
              value={testimonial1Quote}
              onChange={setTestimonial1Quote}
              multiline
              as="p"
              className="text-muted-foreground mb-3"
              data-pdf-testimonial1-quote
            />
            <EditableText
              value={testimonial1Author}
              onChange={setTestimonial1Author}
              as="p"
              className="text-sm font-medium"
              data-pdf-testimonial1-author
            />
          </div>
          <div className="border rounded-lg p-6 bg-card" data-pdf-testimonial2>
            <div className="flex gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="h-4 w-4 fill-primary text-primary" />
              ))}
            </div>
            <EditableText
              value={testimonial2Quote}
              onChange={setTestimonial2Quote}
              multiline
              as="p"
              className="text-muted-foreground mb-3"
              data-pdf-testimonial2-quote
            />
            <EditableText
              value={testimonial2Author}
              onChange={setTestimonial2Author}
              as="p"
              className="text-sm font-medium"
              data-pdf-testimonial2-author
            />
          </div>
        </EditableContent>
      </div>

      {/* Questions fréquentes */}
      <div className="bg-muted/30 p-8 border-t" data-pdf-faq-section>
        <EditableText
          value={faqTitle}
          onChange={setFaqTitle}
          as="h2"
          className="text-2xl font-bold mb-6"
          data-pdf-faq-title
        />
        <EditableContent className="space-y-4">
          <div data-pdf-faq1>
            <EditableText
              value={faq1Question}
              onChange={setFaq1Question}
              as="h3"
              className="font-semibold mb-2 flex items-center gap-2"
              data-pdf-faq1-q
            >
              <MessageCircle className="h-5 w-5 text-primary" />
              {faq1Question}
            </EditableText>
            <EditableText
              value={faq1Answer}
              onChange={setFaq1Answer}
              multiline
              as="p"
              className="text-muted-foreground text-sm pl-7"
              data-pdf-faq1-a
            />
          </div>
          <div data-pdf-faq2>
            <EditableText
              value={faq2Question}
              onChange={setFaq2Question}
              as="h3"
              className="font-semibold mb-2 flex items-center gap-2"
              data-pdf-faq2-q
            >
              <MessageCircle className="h-5 w-5 text-primary" />
              {faq2Question}
            </EditableText>
            <EditableText
              value={faq2Answer}
              onChange={setFaq2Answer}
              multiline
              as="p"
              className="text-muted-foreground text-sm pl-7"
              data-pdf-faq2-a
            />
          </div>
          <div data-pdf-faq3>
            <EditableText
              value={faq3Question}
              onChange={setFaq3Question}
              as="h3"
              className="font-semibold mb-2 flex items-center gap-2"
              data-pdf-faq3-q
            >
              <MessageCircle className="h-5 w-5 text-primary" />
              {faq3Question}
            </EditableText>
            <EditableText
              value={faq3Answer}
              onChange={setFaq3Answer}
              multiline
              as="p"
              className="text-muted-foreground text-sm pl-7"
              data-pdf-faq3-a
            />
          </div>
        </EditableContent>
      </div>

      {/* Contact */}
      <div className="p-8 text-center border-t" data-pdf-contact-section>
        <EditableText
          value={contactTitle}
          onChange={setContactTitle}
          as="h2"
          className="text-2xl font-bold mb-4"
          data-pdf-contact-title
        />
        <EditableText
          value={contactSubtitle}
          onChange={setContactSubtitle}
          as="p"
          className="text-muted-foreground mb-6"
          data-pdf-contact-subtitle
        />
        <EditableContent className="space-y-2 text-sm text-muted-foreground">
          <p className="flex items-center justify-center gap-2">
            <Phone className="h-4 w-4" />
            <EditableText
              value={contactPhone}
              onChange={setContactPhone}
              inline
              data-pdf-contact-phone
            />
          </p>
          <p className="flex items-center justify-center gap-2">
            <Mail className="h-4 w-4" />
            <EditableText
              value={contactEmail}
              onChange={setContactEmail}
              inline
              data-pdf-contact-email
            />
          </p>
          <p className="flex items-center justify-center gap-2">
            <Globe className="h-4 w-4" />
            <EditableText
              value={contactWebsite}
              onChange={setContactWebsite}
              inline
              data-pdf-contact-website
            />
          </p>
        </EditableContent>
      </div>
    </div>
  );
}
