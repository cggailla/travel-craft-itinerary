import { QuoteData } from "@/services/quoteService";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MapPin, Calendar, Star, CheckCircle2, MessageCircle } from "lucide-react";

interface QuotePreviewProps {
  data: QuoteData;
}

export function QuotePreview({ data }: QuotePreviewProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    return format(new Date(dateString), "d MMMM yyyy", { locale: fr });
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-background">
      {/* En-tête avec logo et titre */}
      <div className="relative h-64 bg-gradient-to-br from-primary/20 via-primary/10 to-background border-b">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
          <img 
            src="/src/assets/logo-adgentes.png" 
            alt="AD Gentes" 
            className="h-16 mb-6 object-contain"
          />
          <h1 className="text-4xl font-bold text-center mb-2">{data.title}</h1>
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{data.destination}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{data.duration} jours</span>
            </div>
          </div>
          {data.startDate && data.endDate && (
            <p className="text-sm text-muted-foreground mt-2">
              Du {formatDate(data.startDate)} au {formatDate(data.endDate)}
            </p>
          )}
        </div>
      </div>

      {/* Programme du voyage */}
      <div className="p-8">
        <h2 className="text-2xl font-bold mb-6">Votre programme</h2>
        <div className="space-y-6">
          {data.steps.map((step, index) => (
            <div key={step.id} className="border rounded-lg p-6 bg-card">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-1">{step.title}</h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {step.date && (
                      <span>{formatDate(step.date)}</span>
                    )}
                    {step.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {step.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {step.description && (
                <p className="text-muted-foreground mb-4">{step.description}</p>
              )}

              {step.segments.length > 0 && (
                <div className="space-y-2 mt-4">
                  {step.segments.map((segment) => (
                    <div key={segment.id} className="flex items-start gap-3 text-sm pl-16">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="font-medium">{segment.title}</span>
                        {segment.provider && (
                          <span className="text-muted-foreground ml-2">({segment.provider})</span>
                        )}
                        {segment.description && (
                          <p className="text-muted-foreground mt-1">{segment.description}</p>
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
      <div className="bg-muted/30 p-8 border-y">
        <h2 className="text-2xl font-bold mb-6">Pourquoi réserver avec AD Gentes ?</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <CheckCircle2 className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold">Expertise locale</h3>
            <p className="text-sm text-muted-foreground">
              Plus de 20 ans d'expérience dans l'organisation de voyages sur mesure
            </p>
          </div>
          <div className="space-y-2">
            <CheckCircle2 className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold">Accompagnement personnalisé</h3>
            <p className="text-sm text-muted-foreground">
              Un conseiller dédié pour vous accompagner avant, pendant et après votre voyage
            </p>
          </div>
          <div className="space-y-2">
            <CheckCircle2 className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold">Flexibilité garantie</h3>
            <p className="text-sm text-muted-foreground">
              Possibilité de modifier votre programme selon vos envies
            </p>
          </div>
        </div>
      </div>

      {/* Avis clients */}
      <div className="p-8">
        <h2 className="text-2xl font-bold mb-6">Ce que disent nos clients</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="border rounded-lg p-6 bg-card">
            <div className="flex gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="h-4 w-4 fill-primary text-primary" />
              ))}
            </div>
            <p className="text-muted-foreground mb-3">
              "Un voyage absolument merveilleux ! L'organisation était parfaite et nous avons pu découvrir des endroits extraordinaires."
            </p>
            <p className="text-sm font-medium">Marie & Pierre - Voyage en Italie</p>
          </div>
          <div className="border rounded-lg p-6 bg-card">
            <div className="flex gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="h-4 w-4 fill-primary text-primary" />
              ))}
            </div>
            <p className="text-muted-foreground mb-3">
              "Service impeccable, équipe très professionnelle et à l'écoute. Nous recommandons vivement AD Gentes !"
            </p>
            <p className="text-sm font-medium">Sophie - Voyage au Japon</p>
          </div>
        </div>
      </div>

      {/* Questions fréquentes */}
      <div className="bg-muted/30 p-8 border-t">
        <h2 className="text-2xl font-bold mb-6">Questions fréquentes</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Puis-je modifier mon programme ?
            </h3>
            <p className="text-muted-foreground text-sm pl-7">
              Oui, nous pouvons adapter le programme selon vos préférences. N'hésitez pas à nous contacter pour toute modification.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Quelles sont les conditions d'annulation ?
            </h3>
            <p className="text-muted-foreground text-sm pl-7">
              Les conditions d'annulation dépendent des prestataires. Nous vous fournirons tous les détails lors de la réservation.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Êtes-vous joignable pendant le voyage ?
            </h3>
            <p className="text-muted-foreground text-sm pl-7">
              Oui, une assistance 24h/24 et 7j/7 est disponible pendant toute la durée de votre voyage.
            </p>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="p-8 text-center border-t">
        <h2 className="text-2xl font-bold mb-4">Prêt à partir ?</h2>
        <p className="text-muted-foreground mb-6">
          Contactez-nous pour finaliser votre réservation ou pour toute question
        </p>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>📞 +33 1 23 45 67 89</p>
          <p>✉️ contact@adgentes.fr</p>
          <p>🌐 www.adgentes.fr</p>
        </div>
      </div>
    </div>
  );
}
