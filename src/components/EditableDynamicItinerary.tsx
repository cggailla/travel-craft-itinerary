import { useState, useEffect } from "react";
import { BookletData, BookletOptions, formatSegmentType, getSegmentIcon } from "@/services/bookletService";
import { generateAllDaysContent } from "@/services/gptContentService";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, MapPin, Clock, Edit3 } from "lucide-react";
import { Progress } from "./ui/progress";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { RichTextEditor } from "./RichTextEditor";

interface EditableDynamicItineraryProps {
  data: BookletData;
  options: BookletOptions;
  tripId: string;
  isEditing: boolean;
}

export function EditableDynamicItinerary({ 
  data, 
  options, 
  tripId, 
  isEditing 
}: EditableDynamicItineraryProps) {
  const [dayContents, setDayContents] = useState<Record<number, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dayStatus, setDayStatus] = useState<string>('');
  const [hasGenerated, setHasGenerated] = useState(false);

  useEffect(() => {
    if (data.timeline.length > 0 && tripId && !hasGenerated) {
      generateContent();
    }
  }, [data.timeline, tripId, hasGenerated]);

  const generateContent = async () => {
    if (data.timeline.length === 0 || !tripId) return;
    
    setIsGenerating(true);
    setProgress(0);
    setError(null);
    setDayStatus('Initialisation...');

    try {
      const results = await generateAllDaysContent(
        tripId,
        data.timeline.length,
        (currentDay, status) => {
          setProgress((currentDay / data.timeline.length) * 100);
          setDayStatus(`Génération du jour ${currentDay + 1}/${data.timeline.length}... ${status}`);
        }
      );

      const contents: Record<number, string> = {};
      results.forEach(result => {
        if (result.success) {
          contents[result.dayIndex] = result.html;
        }
      });

      setDayContents(contents);
      setHasGenerated(true);
      setDayStatus('Génération terminée !');
    } catch (err) {
      console.error('Erreur lors de la génération:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setDayStatus('Erreur lors de la génération');
    } finally {
      setIsGenerating(false);
      setTimeout(() => setDayStatus(''), 3000);
    }
  };

  const cleanHtmlContent = (html: string): string => {
    return html
      .replace(/```html\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
  };

  const updateDayContent = (dayIndex: number, content: string) => {
    setDayContents(prev => ({
      ...prev,
      [dayIndex]: content
    }));
  };

  const regenerateDay = async (dayIndex: number) => {
    if (!tripId) return;
    
    setDayStatus(`Régénération du jour ${dayIndex + 1}...`);
    
    try {
      // Créer une timeline temporaire avec seulement le jour à régénérer
      const singleDayTimeline = [data.timeline[dayIndex]];
      const tempData = { ...data, timeline: singleDayTimeline };
      
      const results = await generateAllDaysContent(
        tripId,
        1,
        (current, status) => setDayStatus(`Régénération du jour ${dayIndex + 1}... ${status}`)
      );
      
      if (results[0]?.success) {
        updateDayContent(dayIndex, results[0].html);
        setDayStatus('Jour régénéré avec succès !');
      } else {
        setError('Erreur lors de la régénération du jour');
      }
    } catch (err) {
      console.error('Erreur lors de la régénération:', err);
      setError(`Erreur lors de la régénération: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    }
    
    setTimeout(() => setDayStatus(''), 3000);
  };

  if (isGenerating) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">Génération du contenu en cours...</div>
          <Progress value={progress} className="w-full mb-2" />
          <div className="text-sm text-muted-foreground">{dayStatus}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertDescription>
          {error}
          <Button 
            onClick={generateContent} 
            className="ml-2" 
            size="sm"
          >
            Réessayer
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8">
      {dayStatus && (
        <Alert>
          <AlertDescription>{dayStatus}</AlertDescription>
        </Alert>
      )}
      
      {data.timeline.map((day, dayIndex) => (
        <div key={dayIndex} className="border-l-4 border-primary/30 pl-6 relative">
          {/* Date header */}
          <div className="flex items-center mb-4">
            <div className="absolute -left-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
              {dayIndex + 1}
            </div>
            <Calendar className="mr-2 h-5 w-5 text-primary" />
            <h3 className="text-xl font-semibold">
              {format(day.date, 'EEEE dd MMMM yyyy', { locale: fr })}
            </h3>
            {isEditing && (
              <Button
                onClick={() => regenerateDay(dayIndex)}
                size="sm"
                variant="outline"
                className="ml-auto"
              >
                <Edit3 className="h-4 w-4 mr-1" />
                Régénérer
              </Button>
            )}
          </div>

          {/* Segments du jour */}
          <div className="space-y-3 mb-6">
            {day.segments.map((segment, segIndex) => (
              <div key={segIndex} className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-1">{getSegmentIcon(segment.segment_type)}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{segment.title}</h4>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        {formatSegmentType(segment.segment_type)}
                      </span>
                    </div>
                    {segment.address && (
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <MapPin className="mr-1 h-3 w-3" />
                        {segment.address}
                      </div>
                    )}
                    {segment.description && (
                      <p className="text-sm text-gray-600 mt-2">{segment.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Contenu généré par IA */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold mb-3 text-primary">Détails et recommandations</h4>
            {isEditing ? (
              <RichTextEditor
                content={dayContents[dayIndex] ? cleanHtmlContent(dayContents[dayIndex]) : ''}
                onChange={(content) => updateDayContent(dayIndex, content)}
                placeholder="Contenu généré par IA pour cette journée..."
                className="min-h-[200px]"
              />
            ) : (
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: dayContents[dayIndex] ? cleanHtmlContent(dayContents[dayIndex]) : 
                    '<p class="text-gray-500 italic">Contenu en cours de génération...</p>' 
                }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}