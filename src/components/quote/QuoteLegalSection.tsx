import { EditableText } from "../EditableText";

interface QuoteLegalSectionProps {
  legalMentions: string;
  onLegalMentionsChange: (value: string) => void;
  contactName: string;
  onContactNameChange: (value: string) => void;
  contactEmail: string;
  onContactEmailChange: (value: string) => void;
  contactPhone: string;
  onContactPhoneChange: (value: string) => void;
}

export function QuoteLegalSection({
  legalMentions,
  onLegalMentionsChange,
  contactName,
  onContactNameChange,
  contactEmail,
  onContactEmailChange,
  contactPhone,
  onContactPhoneChange,
}: QuoteLegalSectionProps) {
  return (
    <>
      {/* MENTIONS LÉGALES */}
      <section className="legal-section mb-16 p-8 bg-muted/30 rounded-lg text-sm" data-pdf-section="legal">
        <h2 className="text-2xl font-bold mb-4">Mentions légales</h2>
        <EditableText
          value={legalMentions}
          onChange={onLegalMentionsChange}
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
              onChange={onContactNameChange}
              placeholder="Nom du conseiller"
            />
          </div>
          <div className="text-primary">
            <EditableText
              value={contactEmail}
              onChange={onContactEmailChange}
              placeholder="email@ad-gentes.ch"
            />
          </div>
          <div className="text-muted-foreground">
            <EditableText
              value={contactPhone}
              onChange={onContactPhoneChange}
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
    </>
  );
}
