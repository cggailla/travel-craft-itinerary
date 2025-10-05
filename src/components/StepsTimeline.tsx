import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getManualSteps } from '@/services/manualStepsService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Edit, FileText, Calendar, MapPin, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface StepsTimelineProps {
  tripId: string;
  onEditSteps: () => void;
  onGenerateBooklet?: () => void;
}

export default function StepsTimeline({ tripId, onEditSteps, onGenerateBooklet }: StepsTimelineProps) {
  const { data: stepsResult, isLoading, error } = useQuery({
    queryKey: ['manualSteps', tripId],
    queryFn: () => getManualSteps(tripId),
    enabled: !!tripId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  if (error || !stepsResult?.success) {
    return (
      <div className="p-6 bg-destructive/10 rounded-lg border border-destructive/30 text-center">
        <AlertCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
        <h4 className="font-semibold">Erreur de chargement des étapes</h4>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'Une erreur inconnue est survenue.'}
        </p>
      </div>
    );
  }

  if (stepsResult.steps.length === 0) {
    return (
      <div className="p-6 bg-muted/30 rounded-lg border text-center">
        <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <h4 className="font-semibold">Aucune étape n'a encore été créée</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Revenez à la vue des segments pour organiser votre voyage en étapes.
        </p>
        <Button onClick={onEditSteps} variant="secondary">
          <Edit className="h-4 w-4 mr-2" />
          Créer des étapes
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <Button onClick={onEditSteps} variant="outline">
          <Edit className="h-4 w-4 mr-2" />
          Modifier les étapes
        </Button>
        <Button onClick={onGenerateBooklet}>
          <FileText className="h-4 w-4 mr-2" />
          Générer le carnet
        </Button>
      </div>
      <div className="space-y-4">
        {stepsResult.steps.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()).map(step => (
          <Card key={step.id}>
            <CardHeader>
              <CardTitle className="text-lg">{step.step_title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground space-x-4">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>
                    {format(parseISO(step.start_date), 'd MMM', { locale: fr })} - {format(parseISO(step.end_date), 'd MMM yyyy', { locale: fr })}
                  </span>
                </div>
                {step.primary_location && (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{step.primary_location}</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground pt-2">
                {step.travel_step_segments?.length || 0} segment(s) inclus dans cette étape.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
