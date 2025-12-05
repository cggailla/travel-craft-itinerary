import { EditableText } from "../EditableText";
import { Shield, HeadphonesIcon, Award, Clock, Star, MapPin } from "lucide-react";

interface WhyChooseUsItem {
  icon: string;
  title: string;
  description: string;
}

interface QuoteWhyChooseUsProps {
  title: string;
  onTitleChange: (value: string) => void;
  items: WhyChooseUsItem[];
  onItemsChange: (items: WhyChooseUsItem[]) => void;
}

export function QuoteWhyChooseUs({
  title,
  onTitleChange,
  items,
  onItemsChange,
}: QuoteWhyChooseUsProps) {
  const updateItemTitle = (index: number, newTitle: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], title: newTitle };
    onItemsChange(newItems);
  };

  const updateItemDescription = (index: number, newDescription: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], description: newDescription };
    onItemsChange(newItems);
  };

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      shield: Shield,
      headphones: HeadphonesIcon,
      award: Award,
      clock: Clock,
      star: Star,
      mapPin: MapPin,
    };
    return icons[iconName] || Star;
  };

  return (
    <section className="why-choose-us-section h-full flex flex-col justify-center" data-pdf-section="why-choose-us">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">
          <EditableText
            value={title}
            onChange={onTitleChange}
            placeholder="Pourquoi choisir Ad Gentes ?"
            className="text-2xl font-bold"
          />
        </h2>
        <div className="w-20 h-1 bg-primary mx-auto rounded-full"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item, index) => {
          const IconComponent = getIconComponent(item.icon);
          return (
            <div
              key={index}
              className="flex flex-col items-center text-center p-4 bg-background rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <IconComponent className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-base mb-1">
                <EditableText
                  value={item.title}
                  onChange={(val) => updateItemTitle(index, val)}
                  placeholder="Titre de l'avantage"
                  className="font-semibold text-base"
                />
              </h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                <EditableText
                  value={item.description}
                  onChange={(val) => updateItemDescription(index, val)}
                  multiline
                  placeholder="Description de l'avantage"
                  className="text-muted-foreground text-xs"
                />
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
