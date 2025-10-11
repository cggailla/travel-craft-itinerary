import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SegmentCreationForm } from '@/components/SegmentCreationForm';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Plane, 
  Hotel, 
  Car, 
  Activity, 
  FileText, 
  Plus,
  Trash2,
  Save,
  CheckCircle
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TravelSegment } from '@/types/travel';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserId } from '@/utils/authHelpers';


interface ManualStep {
  id: string;
  title: string;
  segments: TravelSegment[];
  startDate?: Date;
  endDate?: Date;
}

interface ManualStepGrouperProps {
  timeline: { date: string; segments: TravelSegment[] }[];
  undatedSegments: TravelSegment[];
  tripId: string;
  onStepsCreated: () => void;
  onSegmentCreated?: () => Promise<void>; // ✅ Nouveau callback pour notifier le parent
}

export default function ManualStepGrouper({
  timeline,
  undatedSegments,
  tripId,
  onStepsCreated,
  onSegmentCreated
}: ManualStepGrouperProps) {
  const [manualSteps, setManualSteps] = useState<ManualStep[]>([]);
  const [currentStepTitle, setCurrentStepTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [isCreatingSegment, setIsCreatingSegment] = useState(false);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const { toast } = useToast();

  // ❌ SUPPRIMÉ : State local pour undatedSegments (on utilise directement la prop)
  // ❌ SUPPRIMÉ : refreshUndatedSegments() (le parent gère le refresh)

  // Initialize with first step
  useEffect(() => {
    if (manualSteps.length === 0) {
      const newStep = createNewStep();
      // Make the freshly created step active
      setActiveStepId(newStep.id);
    }
  }, []);

  const createNewStep = () => {
    const newStep: ManualStep = {
      id: `step-${Date.now()}`,
      title: `Étape ${manualSteps.length + 1}`,
      segments: [],
    };
    setManualSteps(prev => [...prev, newStep]);
    setCurrentStepTitle(newStep.title);
    setActiveStepId(newStep.id);
    return newStep;
  };

  const updateStepDates = (step: ManualStep, allSteps: ManualStep[], stepIndex: number) => {
    if (step.segments.length === 0) {
      return { ...step, startDate: undefined, endDate: undefined };
    }

    const dates = step.segments
      .map(s => s.start_date)
      .filter(d => d)
      .map(d => new Date(d!))
      .sort((a, b) => a.getTime() - b.getTime());

    const startDate = dates.length > 0 ? dates[0] : undefined;
    
    // Calculer la date de fin basée sur la prochaine étape
    let endDate = startDate;
    if (startDate && stepIndex < allSteps.length - 1) {
      // Chercher la prochaine étape avec une date
      for (let i = stepIndex + 1; i < allSteps.length; i++) {
        const nextStep = allSteps[i];
        const nextStepDates = nextStep.segments
          .map(s => s.start_date)
          .filter(d => d)
          .map(d => new Date(d!))
          .sort((a, b) => a.getTime() - b.getTime());
        
        if (nextStepDates.length > 0) {
          const nextStepStart = nextStepDates[0];
          const dayBefore = new Date(nextStepStart);
          dayBefore.setDate(dayBefore.getDate() - 1);
          
          // Si c'est moins d'un jour, garder la date de début
          if (dayBefore.getTime() <= startDate.getTime()) {
            endDate = startDate;
          } else {
            endDate = dayBefore;
          }
          break;
        }
      }
    }

    return {
      ...step,
      startDate,
      endDate,
    };
  };

  const addSegmentToCurrentStep = (segment: TravelSegment) => {
    console.log('➕ addSegmentToCurrentStep called');
    console.log('  - Segment to add:', segment);
    console.log('  - Current manualSteps count:', manualSteps.length);
    
    if (manualSteps.length === 0) {
      console.warn('⚠️ Cannot add segment: no manual steps exist');
      return;
    }

    setManualSteps(prev => {
      console.log('  - Previous steps:', prev);
      
      const updated = prev.map((step, index) => {
        // Determine target step: activeStepId if set, otherwise fallback to last step
        const isTarget = activeStepId ? step.id === activeStepId : index === prev.length - 1;
        if (isTarget) { // target step to add into
          // ✅ Vérifier si le segment n'est pas déjà présent
          const isAlreadyAdded = step.segments.some(s => s.id === segment.id);
          
          if (isAlreadyAdded) {
            console.log('  - ⚠️ Segment already in step, skipping');
            return step;
          }
          
          console.log('  - Adding to step:', step);
          const updatedStep = {
            ...step,
            segments: [...step.segments, segment]
          };
          console.log('  - Updated step:', updatedStep);
          return updateStepDates(updatedStep, prev, index);
        }
        return step;
      });
      
      console.log('  - Final updated steps:', updated);
      return updated;
    });
  };

  // ✅ Calculer les segments disponibles (non utilisés dans les étapes)
  const availableSegments = useMemo(() => {
    console.log('🔢 Calculating available segments...');
    console.log('  - Total undated segments:', undatedSegments.length);
    console.log('  - Total manual steps:', manualSteps.length);
    
    // Récupérer tous les IDs des segments déjà utilisés
    const usedSegmentIds = new Set(
      manualSteps.flatMap(step => step.segments.map(seg => seg.id))
    );
    
    console.log('  - Used segment IDs:', Array.from(usedSegmentIds));
    
    // Filtrer pour ne garder que les segments non utilisés
    const available = undatedSegments.filter(seg => !usedSegmentIds.has(seg.id));
    
    console.log('  - Available segments:', available.length);
    
    return available;
  }, [undatedSegments, manualSteps]);

  const removeSegmentFromStep = (stepId: string, segmentId: string) => {
    setManualSteps(prev => prev.map((step, index) => {
      if (step.id === stepId) {
        const updatedStep = {
          ...step,
          segments: step.segments.filter(s => s.id !== segmentId)
        };
        return updateStepDates(updatedStep, prev, index);
      }
      return step;
    }));
  };

  const deleteStep = (stepId: string) => {
    if (manualSteps.length <= 1) {
      toast({
        title: "Impossible de supprimer",
        description: "Au moins une étape est nécessaire",
        variant: "destructive"
      });
      return;
    }
    setManualSteps(prev => prev.filter(step => step.id !== stepId));
  };

  const getSegmentIcon = (type: string) => {
    switch (type) {
      case 'flight': return <Plane className="h-3 w-3" />;
      case 'hotel': return <Hotel className="h-3 w-3" />;
      case 'car': return <Car className="h-3 w-3" />;
      case 'activity': return <Activity className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  const getSegmentColor = (type: string) => {
    switch (type) {
      case 'flight': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'hotel': return 'bg-green-100 text-green-800 border-green-200';
      case 'car': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'activity': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return dateString;
      return format(date, 'dd/MM', { locale: fr });
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return '';
      return format(date, 'HH:mm');
    } catch {
      return '';
    }
  };

  const isSegmentUsed = (segmentId: string) => {
    return manualSteps.some(step => step.segments.some(s => s.id === segmentId));
  };

  const saveSteps = async () => {
    if (manualSteps.some(step => step.segments.length === 0)) {
      toast({
        title: "Étapes vides",
        description: "Toutes les étapes doivent contenir au moins un segment",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      // Appeler le service pour sauvegarder les étapes manuelles
      // TODO: Implémenter le service de sauvegarde
      await saveManualSteps(tripId, manualSteps);
      
      toast({
        title: "Étapes sauvegardées",
        description: `${manualSteps.length} étapes créées avec succès`
      });
      
      onStepsCreated();
    } catch (error) {
      console.error('Error saving steps:', error);
      toast({
        title: "Erreur de sauvegarde",
        description: "Impossible de sauvegarder les étapes",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // ✅ Callback après création de segment : notifier le parent
  const handleSegmentCreated = async (newSegment: TravelSegment) => {
    console.log('🎯 Segment created:', newSegment.title);
    
    setIsCreatingSegment(false);

    // ✅ Notifier le parent pour qu'il recharge les segments depuis la BDD
    if (onSegmentCreated) {
      await onSegmentCreated();
    }
    
    // ✅ Toast de succès
    toast({
      title: "Segment créé !",
      description: `"${newSegment.title}" a été ajouté avec succès`,
    });
  };

  return (
    <div className="grid grid-cols-2 gap-6 h-[80vh]">
      {/* Segments disponibles - Colonne gauche */}
      <Card className="overflow-hidden flex flex-col">
        <CardHeader className="pb-4 flex-shrink-0">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Segments disponibles</span>
            </div>
            <Button 
              onClick={() => setIsCreatingSegment(true)} 
              size="sm"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Créer un segment
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-4 pb-4">
          {/* ✅ Section Segments Disponibles (utilise availableSegments au lieu de undatedSegments) */}
          {availableSegments.length > 0 ? (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center">
                <FileText className="h-4 w-4 mr-1" />
                Segments disponibles ({availableSegments.length})
              </h4>
              <div className="space-y-2">
                {availableSegments.map(segment => (
                  <div
                    key={segment.id}
                    className="p-2 border rounded-lg cursor-pointer transition-all hover:shadow-sm hover:border-primary bg-background"
                    onClick={() => addSegmentToCurrentStep(segment)}
                  >
                    <div className="flex items-start space-x-2">
                      <div className={`p-1 rounded border ${getSegmentColor(segment.segment_type)}`}>
                        {getSegmentIcon(segment.segment_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs truncate">{segment.title}</p>
                        {segment.provider && (
                          <p className="text-xs text-muted-foreground truncate">{segment.provider}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          </div>
        ) : null}          {/* Segments par date */}
          {timeline.map((day, dayIndex) => (
            <div key={dayIndex}>
              <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {formatDate(day.date)} ({day.segments.length})
              </h4>
              <div className="space-y-2">
                {day.segments.map(segment => (
                  <div
                    key={segment.id}
                    className={`p-2 border rounded-lg cursor-pointer transition-all hover:shadow-sm ${
                      isSegmentUsed(segment.id) 
                        ? 'opacity-50 bg-muted cursor-not-allowed' 
                        : 'hover:border-primary bg-background'
                    }`}
                    onClick={() => !isSegmentUsed(segment.id) && addSegmentToCurrentStep(segment)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-2 flex-1">
                        <div className={`p-1 rounded border ${getSegmentColor(segment.segment_type)}`}>
                          {getSegmentIcon(segment.segment_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs truncate">{segment.title}</p>
                          {segment.provider && (
                            <p className="text-xs text-muted-foreground truncate">{segment.provider}</p>
                          )}
                        </div>
                      </div>
                      {segment.start_date && (
                        <Badge variant="outline" className="text-xs">
                          {formatTime(segment.start_date)}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Étapes créées - Colonne droite */}
      <Card className="overflow-hidden flex flex-col">
        <CardHeader className="pb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Étapes du voyage</span>
            </CardTitle>
            <div className="flex space-x-2">
              <Button onClick={createNewStep} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Nouvelle étape
              </Button>
              <Button 
                onClick={saveSteps} 
                disabled={saving || manualSteps.some(s => s.segments.length === 0)}
                size="sm"
              >
                {saving ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    Valider les étapes
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-4 pb-4">
          {manualSteps.map((step, stepIndex) => (
            <Card 
              key={step.id} 
              className={`${stepIndex === manualSteps.length - 1 ? 'border-primary' : 'border-border'} ${activeStepId === step.id ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setActiveStepId(step.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                      <Badge variant={stepIndex === manualSteps.length - 1 ? "default" : "secondary"}>
                        {step.title}
                      </Badge>
                    {step.startDate && step.endDate && (
                      <Badge variant="outline" className="text-xs">
                        {format(step.startDate, 'dd/MM', { locale: fr })}
                        {step.startDate.getTime() !== step.endDate.getTime() && 
                          ` - ${format(step.endDate, 'dd/MM', { locale: fr })}`
                        }
                      </Badge>
                    )}
                  </div>
                    {manualSteps.length > 1 && (
                      <Button
                        onClick={(e) => { e.stopPropagation(); deleteStep(step.id); }}
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {step.segments.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground border-2 border-dashed border-muted rounded-lg">
                    <Activity className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Cliquez sur des segments à gauche pour les ajouter</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {step.segments.map(segment => (
                        <div key={segment.id} className="flex items-center justify-between p-2 bg-muted/50 rounded border">
                        <div className="flex items-center space-x-2 flex-1">
                          <div className={`p-1 rounded border ${getSegmentColor(segment.segment_type)}`}>
                            {getSegmentIcon(segment.segment_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs truncate">{segment.title}</p>
                            {segment.provider && (
                              <p className="text-xs text-muted-foreground truncate">{segment.provider}</p>
                            )}
                          </div>
                        </div>
                          <Button
                            onClick={(e) => { e.stopPropagation(); removeSegmentFromStep(step.id, segment.id); }}
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Dialog pour créer un nouveau segment */}
      <Dialog open={isCreatingSegment} onOpenChange={setIsCreatingSegment}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer un nouveau segment</DialogTitle>
          </DialogHeader>
          <SegmentCreationForm 
            tripId={tripId}
            onSuccess={handleSegmentCreated}
            onCancel={() => setIsCreatingSegment(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// primary_location resolution now shared in services/locationService.ts

// Service function to save manual steps
async function saveManualSteps(tripId: string, steps: ManualStep[]) {
  const { supabase } = await import('@/integrations/supabase/client');
  const rid = Date.now().toString();
  console.info('[saveManualSteps:start]', { rid, tripId, stepCount: steps.length });
  
  // Delete existing steps for this trip
  const existingStepsRes = await supabase.from('travel_steps').select('id').eq('trip_id', tripId);
  console.info('[saveManualSteps:existingSteps]', { rid, tripId, existingStepsCount: existingStepsRes.data?.length || 0, error: existingStepsRes.error });

  await supabase
    .from('travel_step_segments')
    .delete()
    .in('step_id', existingStepsRes.data?.map((s: any) => s.id) || []);

  const delStepsRes = await supabase
    .from('travel_steps')
    .delete()
    .eq('trip_id', tripId);
  console.info('[saveManualSteps:deletedStepsResult]', { rid, tripId, deletedCount: delStepsRes.data?.length || 0, error: delStepsRes.error });

  // Create new steps
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    
    // Insert step
    const { data: stepData, error: stepError } = await supabase
      .from('travel_steps')
      .insert({
        trip_id: tripId,
        step_id: `step-${i + 1}`,
        step_title: step.title,
        step_type: 'manual',
        primary_location: null,
        start_date: step.startDate?.toISOString().split('T')[0],
        end_date: step.endDate?.toISOString().split('T')[0],
      })
      .select()
      .single();

    if (stepError) {
      console.error('[saveManualSteps:insertStepError]', { rid, tripId, stepIndex: i, stepError });
      throw stepError;
    } else {
      console.info('[saveManualSteps:insertStepOk]', { rid, tripId, stepIndex: i, stepId: stepData?.id });
    }

    // Insert step segments
    for (let j = 0; j < step.segments.length; j++) {
      const segment = step.segments[j];
      const { error: segmentError } = await supabase
        .from('travel_step_segments')
        .insert({
          step_id: stepData.id,
          segment_id: segment.id,
          position_in_step: j,
          role: segment.segment_type,
        });

      if (segmentError) {
        console.error('[saveManualSteps:insertStepSegmentError]', { rid, tripId, stepIndex: i, segmentId: segment.id, segmentError });
        throw segmentError;
      }
    }
  }
}