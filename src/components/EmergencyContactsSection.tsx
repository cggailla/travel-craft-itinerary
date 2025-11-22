import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EditableText } from "./EditableText";
import { EditableContent } from "./EditableContent";

interface EmergencyContactsSectionProps {
  tripId: string;
}

export function EmergencyContactsSection({ tripId }: EmergencyContactsSectionProps) {
  const [localPhone, setLocalPhone] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  // Editable text states
  const [texts, setTexts] = useState({
    title: "Qui contacter pendant votre voyage en cas de nécessité ?",
    section1Title: "1. Avant votre départ",
    section1Text: "Avant votre départ, votre voyagiste reste le contact à privilégier en cas de changement à réaliser ou d'annulations à effectuer.",
    section2Title: "2. Le jour de votre départ",
    section2aTitle: "a. Les vols",
    section2aText: "En cas de retard ou de problèmes concernant les vols, la compagnie aérienne est le contact à privilégier pour tout renseignement. C'est cette dernière qui vous proposera la meilleure solution possible afin de vous acheminer dans les meilleurs délais.",
    section2bTitle: "b. Votre voyagiste",
    section3Title: "3. Après votre départ",
    section3Intro: "Afin de pouvoir répondre au mieux et le plus rapidement à vos besoins, veuillez contacter dans l'ordre suivant :",
    section3aTitle: "a. Les vols",
    section3aText: "En cas de retard ou de problèmes concernant les vols, la compagnie aérienne est le contact à privilégier pour tout renseignement. C'est cette dernière qui vous proposera la meilleure solution possible afin de vous acheminer dans les meilleurs délais.",
    section3bTitle: "b. Nos correspondants locaux",
    section3bItem1: "Pour signaler un retard important à votre arrivée",
    section3bItem2: "Pour toute demande de modification de programme/circuit (sous réserve)",
    section3bItem3: "Pour des renseignements complémentaires au sujet des prestations",
    section3bItem4: "Pour tout manquement ou mécontentement relatif au programme",
    section3bItem5: "Pour un problème d'hébergement, après avoir vérifié auprès de la réception de votre hôtel si une solution peut être trouvée sur place.",
    section3bNote: "Si le cas n'a pas pu être résolu après prise de contact avec notre correspondant local, alors contactez :",
    section3cTitle: "c. Votre voyagiste",
    section4Title: "4. Pour les cas d'extrême urgence",
    section4Text1: "*Sont considérées comme extrême urgence (maladie, accident, décès…), veuillez contacter votre assurance voyage.",
    section4Text2: "Si notre correspondant local ou votre assurance ne peut résoudre votre problème, vous pouvez nous contacter sur notre numéro d'urgence au 0041 76 296 25 40."
  });

  const updateText = (key: keyof typeof texts, value: string) => {
    setTexts(prev => ({ ...prev, [key]: value }));
  };

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
      <EditableText
        value={texts.title}
        onChange={(val) => updateText('title', val)}
        className="text-lg font-bold pb-2 border-b border-gray-300"
        as="h2"
        multiline
        data-pdf-contact-title
      />

      <div className="space-y-6 text-sm leading-relaxed">
        {/* 1. Avant votre départ */}
        <div className="keep-together">
          <EditableText
            value={texts.section1Title}
            onChange={(val) => updateText('section1Title', val)}
            className="font-semibold mb-2"
            as="h3"
            data-pdf-contact-before-title
          />
          <EditableText
            value={texts.section1Text}
            onChange={(val) => updateText('section1Text', val)}
            className="ml-6 text-gray-700"
            multiline
            as="p"
            data-pdf-contact-before-text
          />
        </div>

        {/* 2. Le jour de votre départ */}
        <div className="keep-together">
          <h3 
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => updateText('section2Title', e.currentTarget.textContent || texts.section2Title)}
            className="font-semibold mb-2 outline-none"
            data-pdf-contact-day-title
          >
            {texts.section2Title}
          </h3>
          
          <div className="ml-6 space-y-3">
            {/* a. Les vols */}
            <div>
              <h4 
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => updateText('section2aTitle', e.currentTarget.textContent || texts.section2aTitle)}
                className="font-medium mb-1 outline-none"
                data-pdf-contact-day-flights-title
              >
                {texts.section2aTitle}
              </h4>
              <p 
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => updateText('section2aText', e.currentTarget.textContent || texts.section2aText)}
                className="ml-4 text-gray-700 outline-none"
                data-pdf-contact-day-flights-text
              >
                {texts.section2aText}
              </p>
            </div>

            {/* b. Votre voyagiste */}
            <div>
              <h4 
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => updateText('section2bTitle', e.currentTarget.textContent || texts.section2bTitle)}
                className="font-medium outline-none"
                data-pdf-contact-day-agency-title
              >
                {texts.section2bTitle}
              </h4>
            </div>
          </div>
        </div>

        {/* 3. Après votre départ */}
        <div className="keep-together">
          <h3 
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => updateText('section3Title', e.currentTarget.textContent || texts.section3Title)}
            className="font-semibold mb-2 outline-none"
            data-pdf-contact-after-title
          >
            {texts.section3Title}
          </h3>
          
          <p 
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => updateText('section3Intro', e.currentTarget.textContent || texts.section3Intro)}
            className="ml-6 text-gray-700 mb-3 outline-none"
            data-pdf-contact-after-intro
          >
            {texts.section3Intro}
          </p>

          <div className="ml-6 space-y-3">
            {/* a. Les vols */}
            <div>
              <h4 
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => updateText('section3aTitle', e.currentTarget.textContent || texts.section3aTitle)}
                className="font-medium mb-1 outline-none"
                data-pdf-contact-after-flights-title
              >
                {texts.section3aTitle}
              </h4>
              <p 
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => updateText('section3aText', e.currentTarget.textContent || texts.section3aText)}
                className="ml-4 text-gray-700 outline-none"
                data-pdf-contact-after-flights-text
              >
                {texts.section3aText}
              </p>
            </div>

            {/* b. Nos correspondants locaux */}
            <div>
              <h4 
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => updateText('section3bTitle', e.currentTarget.textContent || texts.section3bTitle)}
                className="font-medium mb-2 outline-none"
                data-pdf-contact-after-local-title
              >
                {texts.section3bTitle}
              </h4>
              
              {/* Phone input field */}
              <div className="ml-4 mb-2 p-3 border border-gray-300">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 flex-shrink-0" />
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
                        onClick={() => setIsEditing(false)} 
                        variant="outline" 
                        size="sm"
                      >
                        Annuler
                      </Button>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-between">
                      <span className="font-medium" data-pdf-contact-local-phone>
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

              <ul className="ml-4 space-y-1 text-gray-700">
                <li 
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => updateText('section3bItem1', e.currentTarget.textContent?.replace('• ', '') || texts.section3bItem1)}
                  className="outline-none"
                  data-pdf-contact-local-item1
                >
                  • {texts.section3bItem1}
                </li>
                <li 
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => updateText('section3bItem2', e.currentTarget.textContent?.replace('• ', '') || texts.section3bItem2)}
                  className="outline-none"
                  data-pdf-contact-local-item2
                >
                  • {texts.section3bItem2}
                </li>
                <li 
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => updateText('section3bItem3', e.currentTarget.textContent?.replace('• ', '') || texts.section3bItem3)}
                  className="outline-none"
                  data-pdf-contact-local-item3
                >
                  • {texts.section3bItem3}
                </li>
                <li 
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => updateText('section3bItem4', e.currentTarget.textContent?.replace('• ', '') || texts.section3bItem4)}
                  className="outline-none"
                  data-pdf-contact-local-item4
                >
                  • {texts.section3bItem4}
                </li>
                <li 
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => updateText('section3bItem5', e.currentTarget.textContent?.replace('• ', '') || texts.section3bItem5)}
                  className="outline-none"
                  data-pdf-contact-local-item5
                >
                  • {texts.section3bItem5}
                </li>
              </ul>

              <p 
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => updateText('section3bNote', e.currentTarget.textContent || texts.section3bNote)}
                className="ml-4 mt-3 text-gray-700 italic text-xs outline-none"
                data-pdf-contact-after-local-note
              >
                {texts.section3bNote}
              </p>
            </div>

            {/* c. Votre voyagiste */}
            <div>
              <h4 
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => updateText('section3cTitle', e.currentTarget.textContent || texts.section3cTitle)}
                className="font-medium outline-none"
                data-pdf-contact-after-agency-title
              >
                {texts.section3cTitle}
              </h4>
            </div>
          </div>
        </div>

        {/* 4. Pour les cas d'extrême urgence */}
        <div className="border-t border-gray-300 pt-6 keep-together">
          <h3 
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => updateText('section4Title', e.currentTarget.textContent || texts.section4Title)}
            className="font-semibold mb-2 outline-none"
            data-pdf-contact-emergency-title
          >
            {texts.section4Title}
          </h3>
          
          <div className="ml-6 space-y-2">
            <p 
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => updateText('section4Text1', e.currentTarget.textContent || texts.section4Text1)}
              className="text-gray-700 outline-none"
              data-pdf-contact-emergency-text1
            >
              {texts.section4Text1}
            </p>
            
            <p 
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => updateText('section4Text2', e.currentTarget.textContent || texts.section4Text2)}
              className="text-gray-700 outline-none"
              data-pdf-contact-emergency-text2
            >
              {texts.section4Text2}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
