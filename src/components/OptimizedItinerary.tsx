import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { BookletData, BookletOptions } from "@/services/bookletService";
import { generateOptimizedContent, generateOptimizedDayContent, OptimizedContentResult } from "@/services/optimizedContentService";
import { getGroupedSegments, autoGroupSegmentsOnValidation } from "@/services/segmentGroupingService";

interface OptimizedItineraryProps {
  data: BookletData;
  options: BookletOptions;
  tripId: string;
}

export function OptimizedItinerary({ data, options, tripId }: OptimizedItineraryProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [contentResult, setContentResult] = useState<OptimizedContentResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  useEffect(() => {
    if (data.timeline && data.timeline.length > 0) {
      generateContent();
    }
  }, [data.timeline, tripId]);

  const generateContent = async () => {
    setIsGenerating(true);
    setProgress(0);
    setCurrentStep('Regroupement des segments similaires...');

    try {
      // First, auto-group segments for optimization
      await autoGroupSegmentsOnValidation(tripId);
      setProgress(20);

      setCurrentStep('Génération du contenu optimisé...');
      const result = await generateOptimizedContent(tripId);
      
      setProgress(100);
      setContentResult(result);

      if (result.success) {
        const successRate = result.stats ? 
          `${result.stats.successfulDays}/${result.stats.totalDays}` : '';
        const optimization = result.stats?.optimizationRatio || '';
        
        toast.success(
          `Contenu généré avec succès ! ${successRate} jours générés. ${optimization}`
        );
      } else {
        toast.error('Erreur lors de la génération du contenu');
      }
    } catch (error) {
      console.error('Erreur génération:', error);
      toast.error('Erreur lors de la génération du contenu');
    } finally {
      setIsGenerating(false);
      setCurrentStep('');
    }
  };

  const regenerateDay = async (dayIndex: number) => {
    try {
      const result = await generateOptimizedDayContent(tripId, dayIndex);
      
      if (contentResult && result.success) {
        const updatedContents = [...contentResult.dayContents];
        updatedContents[dayIndex] = {
          ...result,
          date: data.timeline[dayIndex].date.toISOString().split('T')[0]
        };
        setContentResult({
          ...contentResult,
          dayContents: updatedContents
        });
        toast.success(`Jour ${dayIndex + 1} régénéré avec succès`);
      } else {
        toast.error(`Erreur lors de la régénération du jour ${dayIndex + 1}`);
      }
    } catch (error) {
      console.error('Erreur régénération:', error);
      toast.error(`Erreur lors de la régénération du jour ${dayIndex + 1}`);
    }
  };

  const renderStaticDay = (day: any, dayIndex: number) => {
    return (
      <div className="space-y-4">
        <div className="text-lg font-semibold text-muted-foreground">
          {day.date.toLocaleDateString('fr-FR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
        
        {day.segments.length === 0 ? (
          <p className="text-muted-foreground italic">Aucun segment pour ce jour</p>
        ) : (
          <div className="space-y-3">
            {day.segments.map((segment: any, segIndex: number) => (
              <div key={segIndex} className="border-l-4 border-primary/30 pl-4">
                <div className="flex items-center gap-2 font-medium">
                  <span className="text-2xl">
                    {segment.segment_type === 'flight' && '✈️'}
                    {segment.segment_type === 'hotel' && '🏨'}
                    {segment.segment_type === 'activity' && '🎯'}
                    {segment.segment_type === 'car' && '🚗'}
                    {segment.segment_type === 'train' && '🚂'}
                    {segment.segment_type === 'boat' && '⛵'}
                    {segment.segment_type === 'pass' && '🎫'}
                    {segment.segment_type === 'transfer' && '🚌'}
                    {!['flight', 'hotel', 'activity', 'car', 'train', 'boat', 'pass', 'transfer'].includes(segment.segment_type) && '📍'}
                  </span>
                  <span>{segment.title}</span>
                </div>
                
                {segment.provider && (
                  <p className="text-sm text-muted-foreground">{segment.provider}</p>
                )}
                
                {segment.reference_number && (
                  <p className="text-sm text-muted-foreground">
                    Référence: {segment.reference_number}
                  </p>
                )}
                
                {segment.address && (
                  <p className="text-sm text-muted-foreground">📍 {segment.address}</p>
                )}
                
                {segment.description && (
                  <p className="text-sm">{segment.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!data.timeline || data.timeline.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Aucune donnée de timeline disponible pour générer l'itinéraire.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec statistiques d'optimisation */}
      {contentResult?.stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Génération Optimisée
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium">{contentResult.stats.totalDays}</div>
                <div className="text-muted-foreground">Jours</div>
              </div>
              <div>
                <div className="font-medium">{contentResult.stats.totalGroups}</div>
                <div className="text-muted-foreground">Groupes</div>
              </div>
              <div>
                <div className="font-medium">{contentResult.stats.totalSegments}</div>
                <div className="text-muted-foreground">Segments</div>
              </div>
              <div>
                <div className="font-medium text-green-600">
                  {Math.round((1 - contentResult.stats.totalGroups/contentResult.stats.totalSegments) * 100)}%
                </div>
                <div className="text-muted-foreground">Optimisation</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress de génération */}
      {isGenerating && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">{currentStep}</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bouton de régénération globale */}
      <div className="flex justify-center">
        <Button
          onClick={generateContent}
          disabled={isGenerating}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
          Régénérer le contenu optimisé
        </Button>
      </div>

      {/* Contenu par jour */}
      <div className="space-y-6">
        {data.timeline.map((day, dayIndex) => {
          const dayContent = contentResult?.dayContents?.find(
            content => content.dayIndex === dayIndex
          );

          return (
            <Card key={dayIndex}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Jour {dayIndex + 1}</span>
                  <div className="flex items-center gap-2">
                    {dayContent?.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : dayContent && !dayContent.success ? (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => regenerateDay(dayIndex)}
                      className="gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Régénérer
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dayContent?.success && dayContent.html ? (
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: dayContent.html }}
                  />
                ) : dayContent && !dayContent.success ? (
                  <div className="space-y-4">
                    <div className="text-red-600 text-sm">
                      Erreur de génération: {dayContent.error}
                    </div>
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">Contenu statique:</h4>
                      {renderStaticDay(day, dayIndex)}
                    </div>
                  </div>
                ) : (
                  renderStaticDay(day, dayIndex)
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}