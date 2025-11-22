import { EditableText } from "../EditableText";
import { HelpCircle } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

interface QuoteFAQProps {
  title: string;
  onTitleChange: (value: string) => void;
  faqItems: FAQItem[];
  onFaqItemsChange: (items: FAQItem[]) => void;
}

export function QuoteFAQ({
  title,
  onTitleChange,
  faqItems,
  onFaqItemsChange,
}: QuoteFAQProps) {
  const updateQuestion = (index: number, newQuestion: string) => {
    const newItems = [...faqItems];
    newItems[index] = { ...newItems[index], question: newQuestion };
    onFaqItemsChange(newItems);
  };

  const updateAnswer = (index: number, newAnswer: string) => {
    const newItems = [...faqItems];
    newItems[index] = { ...newItems[index], answer: newAnswer };
    onFaqItemsChange(newItems);
  };

  return (
    <section className="faq-section mb-16 p-8 bg-background rounded-lg border border-border" data-pdf-section="faq">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">
          <EditableText
            value={title}
            onChange={onTitleChange}
            placeholder="Questions fréquentes"
            className="text-3xl font-bold"
          />
        </h2>
        <div className="w-24 h-1 bg-primary mx-auto rounded-full"></div>
      </div>

      <div className="space-y-6">
        {faqItems.map((item, index) => (
          <div
            key={index}
            className="p-6 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <HelpCircle className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-3">
                  <EditableText
                    value={item.question}
                    onChange={(val) => updateQuestion(index, val)}
                    placeholder="Votre question ici..."
                    className="font-semibold text-lg"
                  />
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  <EditableText
                    value={item.answer}
                    onChange={(val) => updateAnswer(index, val)}
                    multiline
                    placeholder="Réponse détaillée..."
                    className="text-muted-foreground text-sm leading-relaxed"
                  />
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
