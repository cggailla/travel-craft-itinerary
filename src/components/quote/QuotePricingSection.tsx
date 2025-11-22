import { EditableText } from "../EditableText";

interface QuotePricingSectionProps {
  title: string;
  onTitleChange: (value: string) => void;
  pricePerPerson: string;
  onPricePerPersonChange: (value: string) => void;
  totalPrice: string;
  onTotalPriceChange: (value: string) => void;
  advisorMessage: string;
  onAdvisorMessageChange: (value: string) => void;
}

export function QuotePricingSection({
  title,
  onTitleChange,
  pricePerPerson,
  onPricePerPersonChange,
  totalPrice,
  onTotalPriceChange,
  advisorMessage,
  onAdvisorMessageChange,
}: QuotePricingSectionProps) {
  return (
    <section className="pricing-section mb-16 p-8 bg-muted/30 rounded-lg" data-pdf-section="pricing">
      <h2 className="text-3xl font-bold mb-6">Notre proposition</h2>
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-4">
          <EditableText value={title} onChange={onTitleChange} />
        </h3>
        <div className="grid grid-cols-2 gap-4 text-2xl font-bold">
          <div>
            <EditableText value={pricePerPerson} onChange={onPricePerPersonChange} placeholder="2 595" /> CHF/pers.
          </div>
          <div className="text-primary">
            <EditableText value={totalPrice} onChange={onTotalPriceChange} placeholder="10 380" /> CHF au total
          </div>
        </div>
      </div>

      <div className="p-6 bg-background/50 rounded-lg border-l-4 border-primary">
        <p className="text-sm text-muted-foreground mb-2 font-semibold">Le mot de votre conseiller</p>
        <EditableText
          value={advisorMessage}
          onChange={onAdvisorMessageChange}
          multiline
          className="text-muted-foreground italic"
          placeholder="Message personnalisé de votre conseiller..."
        />
      </div>
    </section>
  );
}
