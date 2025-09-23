import { TravelSegment } from '@/types/travel';
import { EnrichedStep, StepSection, StepTemplate, TemplateSectionConfig, AIContentRequest } from '@/types/enrichedStep';
import { supabase } from "@/integrations/supabase/client";

/**
 * Step templates with predefined sections and roles
 */
export const STEP_TEMPLATES: StepTemplate[] = [
  {
    stepType: 'arrival_day',
    name: 'Jour d\'arrivée',
    sections: [
      {
        title: 'Transport d\'arrivée',
        role: 'transport',
        icon: '✈️',
        roles: ['arrival_transport', 'flight'],
        aiPrompts: {
          description: 'Décris brièvement ce vol d\'arrivée',
          tips: 'Donne 2-3 conseils pratiques pour l\'arrivée'
        }
      },
      {
        title: 'Transfert',
        role: 'transport',
        icon: '🚗',
        roles: ['transfer'],
        aiPrompts: {
          tips: 'Conseils pour le transfert depuis l\'aéroport'
        }
      },
      {
        title: 'Hébergement',
        role: 'accommodation',
        icon: '🏨',
        roles: ['accommodation_checkin', 'hotel'],
        aiPrompts: {
          description: 'Présente brièvement cet hébergement',
          context: 'Contexte local sur ce quartier/lieu'
        }
      }
    ]
  },
  {
    stepType: 'travel_day',
    name: 'Jour de voyage',
    sections: [
      {
        title: 'Transport',
        role: 'transport',
        icon: '🚗',
        roles: ['transfer', 'flight', 'train', 'car'],
        aiPrompts: {
          description: 'Décris ce déplacement',
          tips: 'Conseils pratiques pour ce voyage'
        }
      },
      {
        title: 'Activités',
        role: 'activities',
        icon: '🎯',
        roles: ['main_activity', 'activity'],
        aiPrompts: {
          description: 'Présente ces activités',
          context: 'Contexte culturel/historique'
        }
      },
      {
        title: 'Hébergement',
        role: 'accommodation',
        icon: '🏨',
        roles: ['accommodation_checkin', 'hotel'],
        aiPrompts: {
          description: 'Présente cet hébergement'
        }
      }
    ]
  },
  {
    stepType: 'safari_experience',
    name: 'Expérience Safari',
    sections: [
      {
        title: 'Safaris & Activités',
        role: 'activities',
        icon: '🦁',
        roles: ['main_activity', 'activity'],
        aiPrompts: {
          description: 'Décris cette expérience safari',
          tips: 'Conseils pour un safari réussi',
          context: 'Informations sur la faune et la région'
        }
      },
      {
        title: 'Hébergement',
        role: 'accommodation',
        icon: '🏕️',
        roles: ['hotel', 'accommodation_checkin', 'accommodation_checkout'],
        aiPrompts: {
          description: 'Présente ce lodge/hébergement'
        }
      },
      {
        title: 'Services',
        role: 'services',
        icon: '🎫',
        roles: ['pass', 'other'],
        aiPrompts: {
          tips: 'Informations pratiques sur ces services'
        }
      }
    ]
  },
  {
    stepType: 'beach_stay',
    name: 'Séjour plage',
    sections: [
      {
        title: 'Hébergement',
        role: 'accommodation',
        icon: '🏖️',
        roles: ['hotel', 'accommodation_checkin'],
        aiPrompts: {
          description: 'Présente cet hébergement en bord de mer',
          tips: 'Conseils pour profiter de la plage',
          context: 'Attractions locales et activités'
        }
      }
    ]
  },
  {
    stepType: 'departure_day',
    name: 'Jour de départ',
    sections: [
      {
        title: 'Transfert',
        role: 'transport',
        icon: '🚗',
        roles: ['transfer'],
        aiPrompts: {
          tips: 'Conseils pour le transfert vers l\'aéroport'
        }
      },
      {
        title: 'Transport de départ',
        role: 'transport',
        icon: '✈️',
        roles: ['departure_transport', 'flight'],
        aiPrompts: {
          description: 'Informations sur ce vol de départ'
        }
      }
    ]
  }
];

/**
 * Get template configuration for a step type
 */
export function getStepTemplate(stepType: string): StepTemplate | null {
  return STEP_TEMPLATES.find(template => template.stepType === stepType) || null;
}

/**
 * Group segments by role according to template configuration
 */
export function groupSegmentsByRole(segments: TravelSegment[], template: StepTemplate): StepSection[] {
  const sections: StepSection[] = [];

  template.sections.forEach(sectionConfig => {
    const sectionSegments = segments.filter(segment => 
      sectionConfig.roles.includes(segment.raw_data?.role || segment.segment_type)
    );

    if (sectionSegments.length > 0) {
      sections.push({
        title: sectionConfig.title,
        segments: sectionSegments,
        role: sectionConfig.role,
        icon: sectionConfig.icon
      });
    }
  });

  return sections;
}

/**
 * Convert raw step data to enriched step structure
 */
export function enrichStep(rawStep: any): EnrichedStep {
  const template = getStepTemplate(rawStep.step_type);
  
  // Extract segments from travel_step_segments relation
  const segments: TravelSegment[] = rawStep.travel_step_segments?.map((tss: any) => ({
    ...tss.travel_segments,
    raw_data: { ...tss.travel_segments.raw_data, role: tss.role }
  })) || [];

  // Group segments by role
  const sections = template ? groupSegmentsByRole(segments, template) : [];

  return {
    stepId: rawStep.step_id,
    stepTitle: rawStep.step_title,
    stepType: rawStep.step_type,
    primaryLocation: rawStep.primary_location || '',
    startDate: new Date(rawStep.start_date),
    endDate: new Date(rawStep.end_date),
    sections,
    rawData: rawStep
  };
}

/**
 * Get enriched steps for a trip
 */
export async function getEnrichedSteps(tripId: string): Promise<{ success: boolean; steps: EnrichedStep[]; error?: string }> {
  try {
    const { data: steps, error } = await supabase
      .from('travel_steps')
      .select(`
        *,
        travel_step_segments(
          position_in_step,
          role,
          travel_segments(*)
        )
      `)
      .eq('trip_id', tripId)
      .order('step_id');

    if (error) {
      console.error('Error fetching travel steps:', error);
      return { success: false, error: error.message, steps: [] };
    }

    const enrichedSteps = (steps || []).map(enrichStep);

    return { success: true, steps: enrichedSteps };

  } catch (error) {
    console.error('Error in getEnrichedSteps:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      steps: []
    };
  }
}

/**
 * Generate AI content request for a step
 */
export function createAIContentRequest(step: EnrichedStep): AIContentRequest {
  return {
    stepId: step.stepId,
    stepTitle: step.stepTitle,
    primaryLocation: step.primaryLocation,
    sections: step.sections
  };
}