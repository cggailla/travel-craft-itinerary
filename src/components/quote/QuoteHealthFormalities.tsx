import { EditableText } from "../EditableText";
import { 
  FileCheck, 
  CalendarDays, 
  Syringe, 
  ShieldAlert, 
  Droplet, 
  AlertCircle,
  Plane,
  Info
} from "lucide-react";

interface QuoteHealthFormalitiesProps {
  entryFormalities: string;
  onEntryFormalitiesChange: (value: string) => void;
  healthRequirements: string;
  onHealthRequirementsChange: (value: string) => void;
  cancellationPolicy: string;
  onCancellationPolicyChange: (value: string) => void;
}

const StructuredItem = ({ label, content, onChange }: { label: string, content: string, onChange: (v: string) => void }) => {
  let Icon = Info;
  const l = label.toLowerCase();
  if (l.includes('passeport')) Icon = FileCheck;
  else if (l.includes('visa')) Icon = Plane;
  else if (l.includes('validité') || l.includes('validite')) Icon = CalendarDays;
  else if (l.includes('vaccin')) Icon = Syringe;
  else if (l.includes('conseil') || l.includes('assurance')) Icon = ShieldAlert;
  else if (l.includes('eau')) Icon = Droplet;

  return (
    <div className="flex gap-2 items-start p-1 rounded-lg hover:bg-white/60 transition-colors group" data-pdf-item="health-formality">
      <div className="mt-0.5 p-1.5 rounded-full bg-white text-primary shadow-sm border border-primary/10 shrink-0 group-hover:border-primary/30 transition-colors">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 space-y-0">
        <span className="text-xs font-bold text-primary/70 uppercase tracking-wider block mb-0.5" data-pdf-label>{label}</span>
        <div className="text-sm text-foreground/90 leading-snug" data-pdf-content>
          <EditableText 
            value={content} 
            onChange={onChange} 
            multiline 
            className="min-w-[50px] block"
          />
        </div>
      </div>
    </div>
  );
};

const StructuredEditableText = ({ value, onChange, placeholder }: { value: string, onChange: (v: string) => void, placeholder?: string }) => {
  const lines = value.split('\n').filter(line => line.trim() !== '');
  const isStructured = lines.length > 0 && lines.some(line => line.includes(':'));

  if (!isStructured) {
    return (
      <div className="p-1">
        <EditableText
          value={value}
          onChange={onChange}
          multiline
          className="text-sm text-foreground/80 leading-snug"
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {lines.map((line, i) => {
        const colonIndex = line.indexOf(':');
        if (colonIndex !== -1) {
          const label = line.substring(0, colonIndex).trim();
          const content = line.substring(colonIndex + 1).trim();
          
          return (
            <StructuredItem 
              key={i} 
              label={label} 
              content={content} 
              onChange={(newContent) => {
                const newLines = [...lines];
                newLines[i] = `${label}: ${newContent}`;
                onChange(newLines.join('\n'));
              }} 
            />
          );
        }
        return (
          <div key={i} className="p-1 text-sm leading-snug text-foreground/80">
             <EditableText
                value={line}
                onChange={(newLine) => {
                  const newLines = [...lines];
                  newLines[i] = newLine;
                  onChange(newLines.join('\n'));
                }}
                multiline
              />
          </div>
        );
      })}
    </div>
  );
};

export function QuoteHealthFormalities({
  entryFormalities,
  onEntryFormalitiesChange,
  healthRequirements,
  onHealthRequirementsChange,
  cancellationPolicy,
  onCancellationPolicyChange,
}: QuoteHealthFormalitiesProps) {
  return (
    <section className="health-formalities-section h-full flex flex-col" data-pdf-section="health">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-primary">Santé & Formalités</h2>
        <div className="h-1.5 w-24 bg-primary mt-2 rounded-full opacity-20"/>
      </div>
      
      <div className="flex flex-col gap-6">
        {/* Top Row: Formalities & Health */}
        <div className="grid grid-cols-2 gap-6">
          {/* Formalities Card */}
          <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10 flex flex-col" data-pdf-group="formalities">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-primary/10">
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-sm">
                <FileCheck className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-primary">Formalités d'entrée</h3>
            </div>
            <div className="-mx-2 px-2">
              <StructuredEditableText
                value={entryFormalities}
                onChange={onEntryFormalitiesChange}
                placeholder="Les formalités d'entrée s'afficheront ici..."
              />
            </div>
          </div>

          {/* Health Card */}
          <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10 flex flex-col" data-pdf-group="health">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-primary/10">
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-sm">
                <Syringe className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-primary">Santé</h3>
            </div>
            <div className="-mx-2 px-2">
              <StructuredEditableText
                value={healthRequirements}
                onChange={onHealthRequirementsChange}
                placeholder="Les recommandations santé s'afficheront ici..."
              />
            </div>
          </div>
        </div>

        {/* Bottom Row: Cancellation */}
        <div className="bg-muted/30 rounded-2xl p-5 border border-border/50">
          <div className="flex items-start gap-4">
            <div className="mt-1 text-muted-foreground">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-foreground mb-2">Conditions d'annulation</h3>
              <div data-pdf-cancellation>
                <EditableText
                  value={cancellationPolicy}
                  onChange={onCancellationPolicyChange}
                  multiline
                  className="text-sm text-muted-foreground leading-relaxed"
                  placeholder="Conditions d'annulation spécifiques..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
