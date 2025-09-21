import React, { useState, useEffect } from 'react';
import { Calendar, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BookletData, BookletOptions } from '@/services/bookletService';
import { generateAllDaysContent, DayContentResult } from '@/services/gptContentService';
import { formatSegmentType, getSegmentIcon } from '@/services/bookletService';

interface DynamicItineraryProps {
  data: BookletData;
  options: BookletOptions;
}

export function DynamicItinerary({ data, options }: DynamicItineraryProps) {
  const [dayContents, setDayContents] = useState<DayContentResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (data.timeline.length > 0) {
      generateContent();
    }
  }, [data.timeline]);

  const generateContent = async () => {
    if (data.timeline.length === 0) return;
    
    setIsGenerating(true);
    setProgress(0);
    
    try {
      console.log('Début génération contenu GPT pour', data.timeline.length, 'jours');
      
      const results = await generateAllDaysContent(data.timeline);
      setDayContents(results);
      
      const successCount = results.filter(r => r.success).length;
      console.log(`Génération terminée: ${successCount}/${results.length} jours réussis`);
      
    } catch (error) {
      console.error('Erreur lors de la génération:', error);
    } finally {
      setIsGenerating(false);
      setProgress(100);
    }
  };

  const regenerateDay = async (dayIndex: number) => {
    const day = data.timeline[dayIndex];
    if (!day) return;
    
    setDayContents(prev => prev.map((content, i) => 
      i === dayIndex ? { ...content, success: false, html: '', error: undefined } : content
    ));

    try {
      const { generateDayPageHTML } = await import('@/services/gptContentService');
      const result = await generateDayPageHTML(day, dayIndex);
      
      setDayContents(prev => prev.map((content, i) => 
        i === dayIndex ? result : content
      ));
    } catch (error) {
      console.error(`Erreur régénération jour ${dayIndex + 1}:`, error);
    }
  };

  const renderStaticDay = (day: typeof data.timeline[0], dayIndex: number) => (
    <div key={`static-${dayIndex}`} className="border rounded-lg p-6">
      <h3 className="text-xl font-bold mb-4 theme-text flex items-center">
        <Calendar className="mr-2 h-5 w-5" />
        {format(day.date, 'EEEE dd MMMM yyyy', { locale: fr })}
        <span className="ml-2 text-sm font-normal text-gray-500">
          ({day.segments.length} activité{day.segments.length > 1 ? 's' : ''})
        </span>
      </h3>
      
      <div className="space-y-4">
        {day.segments.map((segment) => (
          <div key={segment.id} className="border-l-4 theme-border pl-4 py-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <span className="text-lg mr-2">{getSegmentIcon(segment.segment_type)}</span>
                  <h4 className="font-semibold text-lg">{segment.title}</h4>
                  <span className="ml-2 px-2 py-1 theme-bg rounded text-sm">
                    {formatSegmentType(segment.segment_type)}
                  </span>
                </div>
                
                {segment.provider && (
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Prestataire:</strong> {segment.provider}
                  </p>
                )}
                
                {segment.reference_number && (
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Référence:</strong> {segment.reference_number}
                  </p>
                )}
                
                {options.includeNotes && segment.description && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                    <strong>Description:</strong> {segment.description}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (data.timeline.length === 0) {
    return <p className="text-gray-500">Aucun segment avec date trouvé.</p>;
  }

  return (
    <div className="space-y-8">
      {isGenerating && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center mb-2">
            <Loader2 className="animate-spin mr-2 h-4 w-4 text-blue-600" />
            <span className="text-blue-800 font-medium">
              Génération du contenu enrichi par IA...
            </span>
          </div>
          <div className="text-sm text-blue-600">
            Recherche d'informations complémentaires et rédaction en cours
          </div>
        </div>
      )}

      {data.timeline.map((day, dayIndex) => {
        const dayContent = dayContents[dayIndex];
        
        if (isGenerating || !dayContent) {
          return (
            <div key={`loading-${dayIndex}`} className="border rounded-lg p-6">
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin mr-2 h-6 w-6 text-blue-600" />
                <span className="text-blue-600">
                  Génération jour {dayIndex + 1}...
                </span>
              </div>
            </div>
          );
        }

        if (dayContent.success && dayContent.html) {
          return (
            <div key={`gpt-${dayIndex}`} className="border rounded-lg p-6 relative">
              <button
                onClick={() => regenerateDay(dayIndex)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                title="Régénérer ce jour"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              
              <div 
                dangerouslySetInnerHTML={{ __html: dayContent.html }}
                className="gpt-content"
              />
            </div>
          );
        }

        // Fallback vers rendu statique en cas d'erreur
        return (
          <div key={`fallback-${dayIndex}`}>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-yellow-600 mr-2" />
                <span className="text-yellow-800 text-sm">
                  Erreur génération IA - Affichage standard
                </span>
                <button
                  onClick={() => regenerateDay(dayIndex)}
                  className="ml-auto text-yellow-600 hover:text-yellow-800"
                  title="Réessayer la génération IA"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
            {renderStaticDay(day, dayIndex)}
          </div>
        );
      })}
    </div>
  );
}