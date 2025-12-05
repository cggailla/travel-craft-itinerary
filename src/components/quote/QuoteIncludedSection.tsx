import { EditableText } from "../EditableText";
import { Check } from "lucide-react";

interface QuoteIncludedSectionProps {
  includedItems: string[];
  onIncludedItemsChange: (items: string[]) => void;
  excludedItems: string[];
  onExcludedItemsChange: (items: string[]) => void;
}

export function QuoteIncludedSection({
  includedItems,
  onIncludedItemsChange,
  excludedItems,
  onExcludedItemsChange,
}: QuoteIncludedSectionProps) {
  return (
    <section className="included-section mb-16" data-pdf-section="included">
      <h2 className="text-3xl font-bold mb-6">Ce qui est inclus</h2>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="included-box p-6 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
          <h3 className="text-xl font-semibold mb-4 text-green-700 dark:text-green-400">
            ✓ Inclus dans le prix
          </h3>
          <ul className="space-y-2 text-sm">
            {includedItems.map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
                <EditableText
                  value={item}
                  onChange={(newValue) => {
                    const newItems = [...includedItems];
                    newItems[index] = newValue;
                    onIncludedItemsChange(newItems);
                  }}
                  className="flex-1"
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="excluded-box p-6 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <h3 className="text-xl font-semibold mb-4 text-orange-700 dark:text-orange-400">
            ✗ Non inclus
          </h3>
          <ul className="space-y-2 text-sm">
            {excludedItems.map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-orange-600 dark:text-orange-500 mt-0.5 flex-shrink-0">✗</span>
                <EditableText
                  value={item}
                  onChange={(newValue) => {
                    const newItems = [...excludedItems];
                    newItems[index] = newValue;
                    onExcludedItemsChange(newItems);
                  }}
                  className="flex-1"
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
