import { EditableText } from "../EditableText";

interface QuoteHealthFormalitiesProps {
  entryFormalities: string;
  onEntryFormalitiesChange: (value: string) => void;
  healthRequirements: string;
  onHealthRequirementsChange: (value: string) => void;
  cancellationPolicy: string;
  onCancellationPolicyChange: (value: string) => void;
}

export function QuoteHealthFormalities({
  entryFormalities,
  onEntryFormalitiesChange,
  healthRequirements,
  onHealthRequirementsChange,
  cancellationPolicy,
  onCancellationPolicyChange,
}: QuoteHealthFormalitiesProps) {
  return (
    <section className="health-formalities-section mb-16 p-8 bg-muted/30 rounded-lg" data-pdf-section="health">
      <h2 className="text-3xl font-bold mb-6">Santé & Formalités</h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold mb-3">Formalités d'entrée</h3>
          <EditableText
            value={entryFormalities}
            onChange={onEntryFormalitiesChange}
            multiline
            className="text-muted-foreground"
            placeholder="Informations sur les formalités d'entrée (passeport, visa, etc.)..."
          />
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-3">Santé</h3>
          <EditableText
            value={healthRequirements}
            onChange={onHealthRequirementsChange}
            multiline
            className="text-muted-foreground"
            placeholder="Informations sur les vaccins, précautions sanitaires..."
          />
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-3">Conditions d'annulation</h3>
          <EditableText
            value={cancellationPolicy}
            onChange={onCancellationPolicyChange}
            multiline
            className="text-muted-foreground"
            placeholder="Conditions d'annulation spécifiques..."
          />
        </div>
      </div>
    </section>
  );
}
