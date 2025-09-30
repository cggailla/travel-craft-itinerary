import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EmergencyContactsSectionProps {
  tripId: string;
}

export function EmergencyContactsSection({ tripId }: EmergencyContactsSectionProps) {
  const [localPhone, setLocalPhone] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPhone = async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("local_correspondent_phone")
        .eq("id", tripId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching phone:", error);
      } else if (data?.local_correspondent_phone) {
        setLocalPhone(data.local_correspondent_phone);
      }
      setLoading(false);
    };

    fetchPhone();
  }, [tripId]);

  const handleSave = async () => {
    const { error } = await supabase
      .from("trips")
      .update({ local_correspondent_phone: localPhone })
      .eq("id", tripId);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le numéro",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sauvegardé",
        description: "Le numéro a été enregistré avec succès",
      });
      setIsEditing(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold theme-text border-b-2 theme-border pb-2">
        Qui contacter pendant votre voyage en cas de nécessité ?
      </h2>

      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* 1. Avant votre départ */}
          <div className="keep-together">
            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="text-primary">1.</span> Avant votre départ
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed ml-6">
              Avant votre départ, votre voyagiste reste le contact à privilégier en cas de changement 
              à réaliser ou d'annulations à effectuer.
            </p>
          </div>

          {/* 2. Le jour de votre départ */}
          <div className="keep-together">
            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="text-primary">2.</span> Le jour de votre départ
            </h3>
            
            <div className="ml-6 space-y-4">
              {/* a. Les vols */}
              <div>
                <h4 className="text-base font-medium text-foreground mb-2">
                  a. Les vols
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed ml-4">
                  En cas de retard ou de problèmes concernant les vols, la compagnie aérienne 
                  est le contact à privilégier pour tout renseignement. C'est cette dernière qui 
                  vous proposera la meilleure solution possible afin de vous acheminer dans les 
                  meilleurs délais.
                </p>
              </div>

              {/* b. Votre voyagiste */}
              <div>
                <h4 className="text-base font-medium text-foreground mb-2">
                  b. Votre voyagiste
                </h4>
              </div>
            </div>
          </div>

          {/* 3. Après votre départ */}
          <div className="keep-together">
            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="text-primary">3.</span> Après votre départ
            </h3>
            
            <p className="text-sm text-muted-foreground leading-relaxed ml-6 mb-4">
              Afin de pouvoir répondre au mieux et le plus rapidement à vos besoins, veuillez 
              contacter dans l'ordre suivant :
            </p>

            <div className="ml-6 space-y-4">
              {/* a. Les vols */}
              <div>
                <h4 className="text-base font-medium text-foreground mb-2">
                  a. Les vols
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed ml-4">
                  En cas de retard ou de problèmes concernant les vols, la compagnie aérienne 
                  est le contact à privilégier pour tout renseignement. C'est cette dernière qui 
                  vous proposera la meilleure solution possible afin de vous acheminer dans les 
                  meilleurs délais.
                </p>
              </div>

              {/* b. Nos correspondants locaux */}
              <div>
                <h4 className="text-base font-medium text-foreground mb-3">
                  b. Nos correspondants locaux
                </h4>
                
                {/* Phone input field */}
                <div className="ml-4 mb-3 p-4 bg-accent/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-primary flex-shrink-0" />
                    {isEditing ? (
                      <div className="flex-1 flex gap-2">
                        <Input
                          type="tel"
                          value={localPhone}
                          onChange={(e) => setLocalPhone(e.target.value)}
                          placeholder="Entrez le numéro de téléphone"
                          className="flex-1"
                        />
                        <Button onClick={handleSave} size="sm">
                          Sauvegarder
                        </Button>
                        <Button 
                          onClick={() => {
                            setIsEditing(false);
                            // Reset to original value if needed
                          }} 
                          variant="outline" 
                          size="sm"
                        >
                          Annuler
                        </Button>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-between">
                        <span className="font-medium text-foreground">
                          {localPhone || "Numéro non défini"}
                        </span>
                        <Button 
                          onClick={() => setIsEditing(true)} 
                          variant="outline" 
                          size="sm"
                          className="no-print"
                        >
                          Modifier
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <ul className="ml-4 space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Pour signaler un retard important à votre arrivée</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Pour toute demande de modification de programme/circuit (sous réserve)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Pour des renseignements complémentaires au sujet des prestations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Pour tout manquement ou mécontentement relatif au programme</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>
                      Pour un problème d'hébergement, après avoir vérifié auprès de la réception 
                      de votre hôtel si une solution peut être trouvée sur place.
                    </span>
                  </li>
                </ul>

                <p className="text-sm text-muted-foreground leading-relaxed ml-4 mt-4 italic">
                  Si le cas n'a pas pu être résolu après prise de contact avec notre correspondant 
                  local, alors contactez :
                </p>
              </div>

              {/* c. Votre voyagiste */}
              <div>
                <h4 className="text-base font-medium text-foreground mb-2">
                  c. Votre voyagiste
                </h4>
              </div>
            </div>
          </div>

          {/* 4. Pour les cas d'extrême urgence */}
          <div className="border-t pt-6 keep-together">
            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="text-primary">4.</span> Pour les cas d'extrême urgence
            </h3>
            
            <div className="ml-6 space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="font-medium">*Sont considérées comme extrême urgence</span> (maladie, accident, décès…), 
                veuillez contacter votre assurance voyage.
              </p>
              
              <p className="text-sm text-muted-foreground leading-relaxed">
                Si notre correspondant local ou votre assurance ne peut résoudre votre problème, 
                vous pouvez nous contacter sur notre numéro d'urgence au{" "}
                <span className="font-semibold text-primary">0041 76 296 25 40</span>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
