import { TravelSegment } from './travel';

export interface EnrichedStep {
  stepId: string;
  stepTitle: string;
  stepType: string;
  primaryLocation: string;
  startDate: Date;
  endDate: Date;
  sections: StepSection[];
  aiContent?: {
    overview: string;
    tips: string[];
    localContext?: string;
    images?: string[];
  };
  rawData: any; // Original step data from DB
}

export interface StepSection {
  title: string;
  segments: TravelSegment[];
  role: 'transport' | 'accommodation' | 'activities' | 'services';
  icon: string;
}

export interface StepTemplate {
  stepType: string;
  name: string;
  sections: TemplateSectionConfig[];
}

export interface TemplateSectionConfig {
  title: string;
  role: 'transport' | 'accommodation' | 'activities' | 'services';
  icon: string;
  roles: string[]; // List of segment roles that belong to this section
  aiPrompts?: {
    description?: string;
    tips?: string;
    context?: string;
  };
}

export interface AIContentRequest {
  stepId: string;
  stepTitle: string;
  primaryLocation: string;
  sections: StepSection[];
  tripSummary?: string;
}

export interface AIContentResult {
  stepId: string;
  overview: string;
  tips: string[];
  localContext?: string;
  images?: string[];
  success: boolean;
  error?: string;
}