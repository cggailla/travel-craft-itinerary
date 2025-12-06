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
    <section className="faq-section h-full flex flex-col px-6 py-8" data-pdf-section="faq">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3" data-pdf-editable="faq-main-title">
          <EditableText
            value={title}
            onChange={onTitleChange}
            placeholder="Questions fréquentes"
            className="text-3xl font-bold"
          />
        </h2>
        <div className="w-20 h-1 bg-primary mx-auto rounded-full"></div>
      </div>

      <div className="grid grid-cols-2 gap-x-12 gap-y-6 content-start">
        {faqItems.map((item, index) => (
          <div
            key={index}
            className=""
            data-pdf-item="faq-item"
          >
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <HelpCircle className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2" data-pdf-editable={`faq-question-${index}`}>
                  <EditableText
                    value={item.question}
                    onChange={(val) => updateQuestion(index, val)}
                    placeholder="Votre question ici..."
                    className="font-semibold text-lg"
                  />
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed" data-pdf-editable={`faq-answer-${index}`}>
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
