import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { EnrichedStep } from '@/types/enrichedStep';
import { formatSegmentType } from '@/services/bookletService';
import { ParsedStepInfo } from '@/services/aiContentService';
import { EditableText } from './EditableText';
import { StepImageGallery } from './StepImageGallery';
import { listSessionImages, SupabaseImage } from '@/services/supabaseImageService';
interface StepTemplateProps {
  step: EnrichedStep;
  tripId: string;
  aiContent?: {
    overview: string;
    tips: string[];
    localContext?: string;
  };
  isLoading?: boolean;
  nextStepStartDate?: Date;
  parsedStepInfo?: ParsedStepInfo;
}
export function StepTemplate({
  step,
  tripId,
  aiContent,
  isLoading,
  nextStepStartDate,
  parsedStepInfo
}: StepTemplateProps) {
  const [deletedSegments, setDeletedSegments] = useState<Set<string>>(new Set());
  const [hiddenOverview, setHiddenOverview] = useState(false);
  const [hiddenTips, setHiddenTips] = useState(false);
  const [hiddenLocalContext, setHiddenLocalContext] = useState(false);
  
  // Images management
  const [stepImages, setStepImages] = useState<SupabaseImage[]>([]);
  
  // Editable content states
  const [editableOverview, setEditableOverview] = useState(aiContent?.overview || '');
  const [editableTips, setEditableTips] = useState<string[]>(aiContent?.tips || []);
  const [editableLocalContext, setEditableLocalContext] = useState(aiContent?.localContext || '');
  const [editableStepTitle, setEditableStepTitle] = useState(parsedStepInfo?.title || step.stepTitle);
  
  // Editable segment data - Map avec id du segment comme clé
  type SegmentEditableData = {
    title: string;
    description: string;
    provider: string;
    address: string;
    phone: string;
    duration: string;
  };
  
  const [editableSegments, setEditableSegments] = useState<Map<string, SegmentEditableData>>(new Map());

  React.useEffect(() => {
    if (aiContent?.overview) setEditableOverview(aiContent.overview);
    if (aiContent?.tips) setEditableTips(aiContent.tips);
    if (aiContent?.localContext) setEditableLocalContext(aiContent.localContext);
  }, [aiContent]);
  
  React.useEffect(() => {
    setEditableStepTitle(parsedStepInfo?.title || step.stepTitle);
  }, [parsedStepInfo, step.stepTitle]);

  // Load step images from Supabase
  useEffect(() => {
    const loadStepImages = async () => {
      const result = await listSessionImages(tripId);
      if (result.success && result.data) {
        // Filter images for this specific step
        const stepImagesList = result.data.filter(img => 
          img.storage_path.includes(`/${tripId}/step_`) && 
          img.file_name.includes(`step_${step.stepId}`)
        );
        setStepImages(stepImagesList);
      }
    };
    loadStepImages();
  }, [tripId, step.stepId]);

  const handleImagesChange = async () => {
    const result = await listSessionImages(tripId);
    if (result.success && result.data) {
      const stepImagesList = result.data.filter(img => 
        img.storage_path.includes(`/${tripId}/step_`) && 
        img.file_name.includes(`step_${step.stepId}`)
      );
      setStepImages(stepImagesList);
    }
  };

  // Initialiser les données éditables des segments
  React.useEffect(() => {
    const newMap = new Map<string, SegmentEditableData>();
    step.sections.forEach(section => {
      section.segments?.forEach(segment => {
        newMap.set(segment.id, {
          title: segment.title,
          description: segment.description || '',
          provider: segment.provider || '',
          address: segment.address || '',
          phone: segment.phone || '',
          duration: segment.duration || ''
        });
      });
    });
    setEditableSegments(newMap);
  }, [step.sections]);

  const updateSegmentField = (segmentId: string, field: keyof SegmentEditableData, value: string) => {
    setEditableSegments(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(segmentId) || {
        title: '', description: '', provider: '', address: '', phone: '', duration: ''
      };
      newMap.set(segmentId, { ...current, [field]: value });
      return newMap;
    });
  };
  const formatDate = (date: Date) => format(date, 'EEEE d MMMM yyyy', {
    locale: fr
  });
  const calculateEndDate = () => {
    if (nextStepStartDate) {
      const calculatedEndDate = new Date(nextStepStartDate);
      calculatedEndDate.setDate(calculatedEndDate.getDate() - 1);
      return calculatedEndDate;
    }
    return step.endDate;
  };
  const endDate = calculateEndDate();
  const isSingleDay = step.startDate.toDateString() === endDate.toDateString();
  return <>
      <style>{`
        @media print {
          .hidden-in-pdf { display: none !important; }
        }
      `}</style>
      
      <div className="itinerary-step mb-8 pb-6 border-b border-gray-200">
        {/* En-tête + premier contenu = groupe insécable */}
        <div className="step-header-group keep-together mb-6">
          {/* En-tête horodaté avec fond gris */}
          <div className="step-header">
            <div className="w-full bg-gray-100 p-4 rounded-lg border border-gray-200 flex items-center gap-4">
              {/* Dates horodatées */}
              <div className="flex items-center gap-2 text-gray-700 font-semibold whitespace-nowrap">
                <span>{format(step.startDate, 'dd/MM')}</span>
                {!isSingleDay && (
                  <>
                    <span>→</span>
                    <span>{format(endDate, 'dd/MM')}</span>
                  </>
                )}
                <span className="text-gray-400">:</span>
              </div>
              
              {/* Titre de l'étape */}
              <EditableText
                value={editableStepTitle}
                onChange={setEditableStepTitle}
                className="text-xl font-bold text-gray-900 uppercase flex-1"
                as="h2"
              />
            </div>
          </div>

          {/* Overview - collé au header */}
          {editableOverview && !hiddenOverview && <div className="mt-4 relative group first-paragraph">
              <EditableText
                value={editableOverview}
                onChange={setEditableOverview}
                className="text-sm text-gray-700 leading-relaxed italic pl-4 border-l-2 border-gray-300"
                multiline
                as="p"
              />
              <button onClick={() => setHiddenOverview(true)} className="absolute top-0 right-0 text-gray-400 hover:text-gray-600 print:hidden" aria-label="Supprimer">
                ×
              </button>
            </div>}
        </div>

        {/* Segments */}
        <div className="space-y-4">
          {step.sections.map((section, sectionIndex) => {
          if (!section.segments || section.segments.length === 0) return null;
          const visibleSegments = section.segments.filter(segment => !deletedSegments.has(segment.id));
          if (visibleSegments.length === 0) return null;
          return <div key={sectionIndex} className="space-y-3">
                {visibleSegments.map(segment => {
              const startDate = segment.start_date ? new Date(segment.start_date) : null;
              const endDate = segment.end_date ? new Date(segment.end_date) : null;
              const formatTime = (date: Date | null) => {
                if (!date) return null;
                return format(date, 'HH:mm', {
                  locale: fr
                });
              };
              const startTime = formatTime(startDate);
              const endTime = formatTime(endDate);
              const segmentData = editableSegments.get(segment.id) || {
                title: segment.title,
                description: segment.description || '',
                provider: segment.provider || '',
                address: segment.address || '',
                phone: segment.phone || '',
                duration: segment.duration || ''
              };
              
              return <div key={segment.id} className="relative group">
                      <div className="flex gap-4">
                        {/* Type de segment */}
                        <p className="text-sm font-semibold text-gray-800 capitalize w-24 flex-shrink-0">
                          {formatSegmentType(segment.segment_type)}
                        </p>
                        
                        {/* Contenu indenté */}
                        <div className="flex-1">
                          <EditableText
                            value={segmentData.title}
                            onChange={(val) => updateSegmentField(segment.id, 'title', val)}
                            className="text-sm text-gray-900 font-medium"
                            as="p"
                          />
                          
                          {/* Description */}
                          {segmentData.description && <EditableText
                              value={segmentData.description}
                              onChange={(val) => updateSegmentField(segment.id, 'description', val)}
                              className="text-sm text-gray-700 mt-1 leading-relaxed"
                              multiline
                              as="p"
                            />}
                          
                          {/* Détails */}
                          <div className="mt-1 space-y-0.5">
                            {segmentData.provider && <p className="text-xs text-gray-600">
                                • {segment.segment_type === 'flight' && 'Vol : '}
                                {segment.segment_type === 'train' && 'Train : '}
                                {segment.segment_type === 'hotel' && 'Hôtel : '}
                                {segment.segment_type === 'activity' && 'Activité : '}
                                <EditableText
                                  value={segmentData.provider}
                                  onChange={(val) => updateSegmentField(segment.id, 'provider', val)}
                                  className="inline"
                                  as="span"
                                />
                                {segment.reference_number && ` - ${segment.reference_number}`}
                              </p>}
                            
                            {segmentData.address && <p className="text-xs text-gray-600">
                                • Adresse : <EditableText
                                  value={segmentData.address}
                                  onChange={(val) => updateSegmentField(segment.id, 'address', val)}
                                  className="inline"
                                  as="span"
                                />
                              </p>}
                            
                            {segmentData.phone && <p className="text-xs text-gray-600">
                                • Tél : <EditableText
                                  value={segmentData.phone}
                                  onChange={(val) => updateSegmentField(segment.id, 'phone', val)}
                                  className="inline"
                                  as="span"
                                />
                              </p>}
                            
                            {segment.checkin_time && <p className="text-xs text-gray-600">
                                • Check-in : {segment.checkin_time} | Check-out : {segment.checkout_time || 'N/A'}
                              </p>}
                            
                            {segmentData.duration && <p className="text-xs text-gray-600">
                                • Durée : <EditableText
                                  value={segmentData.duration}
                                  onChange={(val) => updateSegmentField(segment.id, 'duration', val)}
                                  className="inline"
                                  as="span"
                                />
                              </p>}
                            
                            {endTime && startTime !== endTime && <p className="text-xs text-gray-600">• Arrivée : {endTime}</p>}
                          </div>
                        </div>
                      </div>
                      
                      {/* Bouton suppression */}
                      <button onClick={() => setDeletedSegments(prev => new Set(prev).add(segment.id))} className="absolute top-0 right-0 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 print:hidden" aria-label="Supprimer">
                        ×
                      </button>
                    </div>;
            })}
              </div>;
        })}
        </div>

        {/* Tips */}
        {editableTips && editableTips.length > 0 && !hiddenTips && <div className="mt-4 pl-4 border-l-2 border-yellow-400 relative group">
            <p className="text-xs font-semibold text-gray-700 mb-2"> NOTE</p>
            <ul className="space-y-1">
              {editableTips.map((tip, index) => <EditableText
                  key={index}
                  value={tip}
                  onChange={(val) => {
                    const newTips = [...editableTips];
                    newTips[index] = val;
                    setEditableTips(newTips);
                  }}
                  className="text-xs text-gray-700 leading-relaxed"
                  multiline
                  as="li"
                />)}
            </ul>
            <button onClick={() => setHiddenTips(true)} className="absolute top-0 right-0 text-gray-400 hover:text-gray-600 print:hidden" aria-label="Supprimer">
              ×
            </button>
          </div>}

        {/* Local Context */}
        {editableLocalContext && !hiddenLocalContext && <div className="mt-4 pl-4 border-l-2 border-green-400 relative group">
            <p className="text-xs font-semibold text-gray-700 mb-1">🌍 Info locale</p>
            <EditableText
              value={editableLocalContext}
              onChange={setEditableLocalContext}
              className="text-xs text-gray-700 leading-relaxed"
              multiline
              as="p"
            />
            <button onClick={() => setHiddenLocalContext(true)} className="absolute top-0 right-0 text-gray-400 hover:text-gray-600 print:hidden" aria-label="Supprimer">
              ×
            </button>
          </div>}

        {/* Step Images Gallery */}
        <StepImageGallery
          tripId={step.rawData?.trip_id || ''}
          stepId={step.stepId}
          images={stepImages}
          onImagesChange={handleImagesChange}
        />

        {/* Step Images - Display for PDF */}
        {stepImages.length > 0 && (
          <div className="print-only mt-4 space-y-2">
            {stepImages.map((image) => (
              <div key={image.storage_path} className="w-full">
                <img
                  src={image.public_url}
                  alt={image.file_name}
                  className="w-full h-auto object-contain"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </>;
}