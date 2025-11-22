import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

interface EditableDateProps {
  value: Date | string;
  onChange?: (date: Date) => void;
  className?: string;
  formatString?: string;
  displayFormat?: string;
  placeholder?: string;
  [key: string]: any; // Allow data-* attributes
}

/**
 * Composant date éditable avec calendrier
 * Clic pour ouvrir un date picker
 */
export function EditableDate({
  value,
  onChange,
  className = "",
  formatString = "d MMMM yyyy",
  displayFormat,
  placeholder = "Choisir une date",
  ...rest
}: EditableDateProps) {
  const [date, setDate] = useState<Date>(
    typeof value === 'string' ? new Date(value) : value
  );

  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate);
      onChange?.(newDate);
    }
  };

  const formattedDate = date 
    ? format(date, displayFormat || formatString, { locale: fr })
    : placeholder;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "justify-start text-left font-normal p-0.5 h-auto hover:bg-muted/30",
            !date && "text-muted-foreground",
            className
          )}
          {...rest}
        >
          <span className="flex items-center gap-1">
            {formattedDate}
            <CalendarIcon className="h-3 w-3 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateChange}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
