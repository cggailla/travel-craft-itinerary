import { EditableText } from "../EditableText";
import { Check, X, Plus, MinusCircle } from "lucide-react";
import { Button } from "../ui/button";

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

  const addIncludedItem = () => {
    onIncludedItemsChange([...includedItems, "Nouvel élément inclus"]);
  };

  const removeIncludedItem = (index: number) => {
    const newItems = [...includedItems];
    newItems.splice(index, 1);
    onIncludedItemsChange(newItems);
  };

  const addExcludedItem = () => {
    onExcludedItemsChange([...excludedItems, "Nouvel élément non inclus"]);
  };

  const removeExcludedItem = (index: number) => {
    const newItems = [...excludedItems];
    newItems.splice(index, 1);
    onExcludedItemsChange(newItems);
  };

  return (
    <section className="included-section h-full flex flex-col" data-pdf-section="included">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-primary">Le prix comprend</h2>
        <div className="h-1.5 w-24 bg-primary mt-2 rounded-full opacity-20"/>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-8">
        {/* INCLUDED */}
        <div className="flex flex-col h-full">
          <div className="bg-green-50 rounded-t-xl p-4 border border-green-200 border-b-0">
            <h3 className="text-lg font-bold text-green-700 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center shadow-sm">
                <Check className="w-5 h-5" />
              </div>
              Ce qui est inclus
            </h3>
          </div>
          
          <div className="flex-1 bg-green-50/30 border border-green-200 border-t-0 rounded-b-xl p-4 shadow-sm overflow-y-auto">
            <ul className="space-y-3">
              {includedItems.map((item, index) => (
                <li key={index} className="group flex items-start gap-3 relative pl-1">
                  <Check className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                  <div className="flex-1 text-foreground/80 leading-relaxed text-sm">
                    <EditableText
                      value={item}
                      onChange={(newValue) => {
                        const newItems = [...includedItems];
                        newItems[index] = newValue;
                        onIncludedItemsChange(newItems);
                      }}
                      multiline
                    />
                  </div>
                  <button 
                    onClick={() => removeIncludedItem(index)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity absolute -right-1 top-0 p-1 text-muted-foreground hover:text-destructive"
                    title="Supprimer"
                  >
                    <MinusCircle className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
            
            <div className="mt-4 pt-3 border-t border-dashed border-green-200">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={addIncludedItem}
                className="text-green-700 hover:text-green-800 hover:bg-green-100 gap-2 w-full justify-start h-8 text-sm"
              >
                <Plus className="w-4 h-4" />
                Ajouter un élément inclus
              </Button>
            </div>
          </div>
        </div>

        {/* EXCLUDED */}
        <div className="flex flex-col h-full">
          <div className="bg-orange-50 rounded-t-xl p-4 border border-orange-200 border-b-0">
            <h3 className="text-lg font-bold text-orange-700 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center shadow-sm">
                <X className="w-5 h-5" />
              </div>
              Ce qui n'est pas inclus
            </h3>
          </div>
          
          <div className="flex-1 bg-orange-50/30 border border-orange-200 border-t-0 rounded-b-xl p-4 shadow-sm overflow-y-auto">
            <ul className="space-y-3">
              {excludedItems.map((item, index) => (
                <li key={index} className="group flex items-start gap-3 relative pl-1">
                  <X className="w-4 h-4 text-orange-600 mt-1 flex-shrink-0" />
                  <div className="flex-1 text-foreground/80 leading-relaxed text-sm">
                    <EditableText
                      value={item}
                      onChange={(newValue) => {
                        const newItems = [...excludedItems];
                        newItems[index] = newValue;
                        onExcludedItemsChange(newItems);
                      }}
                      multiline
                    />
                  </div>
                  <button 
                    onClick={() => removeExcludedItem(index)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity absolute -right-1 top-0 p-1 text-muted-foreground hover:text-destructive"
                    title="Supprimer"
                  >
                    <MinusCircle className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-4 pt-3 border-t border-dashed border-orange-200">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={addExcludedItem}
                className="text-orange-700 hover:text-orange-800 hover:bg-orange-100 gap-2 w-full justify-start h-8 text-sm"
              >
                <Plus className="w-4 h-4" />
                Ajouter un élément non inclus
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
