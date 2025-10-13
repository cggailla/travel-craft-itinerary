import { PDFBookletData, PDFStep, PDFSection, PDFSegment } from './pdfBookletService';

/**
 * Extrait les données du carnet de voyage depuis le DOM
 * @param root Element HTML racine (#booklet-content)
 * @returns Données structurées pour le PDF
 */
export function extractBookletDataFromDOM(root: HTMLElement | null): PDFBookletData {
  if (!root) {
    throw new Error('Element #booklet-content introuvable');
  }

  // Clone pour manipulation sans affecter le DOM visible
  const clone = root.cloneNode(true) as HTMLElement;

  // Supprimer tous les éléments interactifs et non-imprimables
  const selectorsToRemove = [
    '.editable',
    'button',
    'input',
    'textarea',
    '.upload-zone',
    '.no-print',
    '[contenteditable]',
    '.edit-button',
    '.delete-button',
    '.drag-handle'
  ];
  
  selectorsToRemove.forEach(selector => {
    clone.querySelectorAll(selector).forEach(el => el.remove());
  });

  // Extraction du titre et des dates
  const tripTitle = clone.querySelector('[data-pdf-title]')?.getAttribute('data-pdf-title') || 'Carnet de voyage';
  const startDateStr = clone.querySelector('[data-pdf-start-date]')?.getAttribute('data-pdf-start-date');
  const endDateStr = clone.querySelector('[data-pdf-end-date]')?.getAttribute('data-pdf-end-date');
  const destination = clone.querySelector('[data-pdf-destination]')?.getAttribute('data-pdf-destination');

  // Extraction des images de couverture
  const coverImages: any[] = [];
  clone.querySelectorAll('[data-pdf-cover-image]').forEach((img: Element) => {
    const src = (img as HTMLImageElement).src || (img as HTMLElement).style.backgroundImage?.match(/url\(["']?([^"']*)["']?\)/)?.[1];
    if (src) {
      coverImages.push({ url: src });
    }
  });

  // Extraction des informations générales
  const generalInfo = extractGeneralInfo(clone);

  // Extraction des étapes
  const steps = extractSteps(clone);

  // Extraction des contacts d'urgence
  const emergencyContacts = extractEmergencyContacts(clone);

  // Extraction du message de remerciement
  const thankYouMessage = clone.querySelector('[data-pdf-thank-you]')?.textContent?.trim();

  // Validate trip dates
  let tripStartDate: Date | undefined;
  let tripEndDate: Date | undefined;
  
  if (startDateStr) {
    const tempDate = new Date(startDateStr);
    if (!isNaN(tempDate.getTime())) {
      tripStartDate = tempDate;
    }
  }
  
  if (endDateStr) {
    const tempDate = new Date(endDateStr);
    if (!isNaN(tempDate.getTime())) {
      tripEndDate = tempDate;
    }
  }

  return {
    tripTitle,
    startDate: tripStartDate,
    endDate: tripEndDate,
    destination,
    coverImages: coverImages.length > 0 ? coverImages : undefined,
    generalInfo,
    steps,
    emergencyContacts: emergencyContacts.length > 0 ? emergencyContacts : undefined,
    thankYouMessage,
  };
}

/**
 * Extrait les informations générales du voyage
 */
function extractGeneralInfo(clone: HTMLElement): any {
  const generalInfoSection = clone.querySelector('[data-pdf-general-info]');
  if (!generalInfoSection) return undefined;

  const info: any = {};
  
  // Extraction de sections spécifiques
  const sections = [
    'climate',
    'currency',
    'language',
    'entry-requirements',
    'health',
    'safety',
    'culture'
  ];

  sections.forEach(section => {
    const element = generalInfoSection.querySelector(`[data-pdf-info="${section}"]`);
    if (element) {
      info[section] = element.textContent?.trim();
    }
  });

  return Object.keys(info).length > 0 ? info : undefined;
}

/**
 * Extrait toutes les étapes du voyage
 */
function extractSteps(clone: HTMLElement): PDFStep[] {
  const steps: PDFStep[] = [];
  const stepElements = clone.querySelectorAll('[data-pdf-step]');

  stepElements.forEach((stepEl: Element, index: number) => {
    const stepId = stepEl.getAttribute('data-pdf-step-id') || `step-${index}`;
    const stepTitle = stepEl.querySelector('[data-pdf-step-title]')?.textContent?.trim() || `Étape ${index + 1}`;
    const startDateStr = stepEl.querySelector('[data-pdf-step-start-date]')?.getAttribute('data-pdf-step-start-date');
    const endDateStr = stepEl.querySelector('[data-pdf-step-end-date]')?.getAttribute('data-pdf-step-end-date');

    // Extraction du contenu AI
    const aiContent: any = {};
    const overview = stepEl.querySelector('[data-pdf-step-overview]')?.textContent?.trim();
    const localContext = stepEl.querySelector('[data-pdf-step-local-context]')?.textContent?.trim();
    
    if (overview) aiContent.overview = overview;
    if (localContext) aiContent.localContext = localContext;

    // Extraction des tips
    const tips: string[] = [];
    stepEl.querySelectorAll('[data-pdf-step-tip]').forEach(tip => {
      const text = tip.textContent?.trim();
      if (text) tips.push(text);
    });
    if (tips.length > 0) aiContent.tips = tips;

    // Extraction des sections et segments
    const sections = extractSections(stepEl as HTMLElement);

    // Extraction des images de l'étape
    const images: any[] = [];
    stepEl.querySelectorAll('[data-pdf-step-image]').forEach((img: Element) => {
      const src = (img as HTMLImageElement).src || (img as HTMLElement).style.backgroundImage?.match(/url\(["']?([^"']*)["']?\)/)?.[1];
      if (src) {
        images.push({ url: src });
      }
    });

    // Validate dates before creating Date objects
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    
    if (startDateStr) {
      const tempStartDate = new Date(startDateStr);
      if (!isNaN(tempStartDate.getTime())) {
        startDate = tempStartDate;
      }
    }
    
    if (endDateStr) {
      const tempEndDate = new Date(endDateStr);
      if (!isNaN(tempEndDate.getTime())) {
        endDate = tempEndDate;
      }
    }

    steps.push({
      stepId,
      stepTitle,
      startDate,
      endDate,
      aiContent: Object.keys(aiContent).length > 0 ? aiContent : undefined,
      sections,
      images: images.length > 0 ? images : undefined,
    });
  });

  return steps;
}

/**
 * Extrait les sections d'une étape (Transport, Hébergement, Activités, etc.)
 */
function extractSections(stepEl: HTMLElement): PDFSection[] {
  const sections: PDFSection[] = [];
  const sectionElements = stepEl.querySelectorAll('[data-pdf-section]');

  sectionElements.forEach((sectionEl: Element) => {
    const title = sectionEl.getAttribute('data-pdf-section-title') || 
                  sectionEl.querySelector('[data-pdf-section-title]')?.textContent?.trim() || 
                  'Section';

    const segments = extractSegments(sectionEl as HTMLElement);

    if (segments.length > 0) {
      sections.push({ title, segments });
    }
  });

  return sections;
}

/**
 * Extrait les segments d'une section
 */
function extractSegments(sectionEl: HTMLElement): PDFSegment[] {
  const segments: PDFSegment[] = [];
  const segmentElements = sectionEl.querySelectorAll('[data-pdf-segment]');

  segmentElements.forEach((segmentEl: Element, index: number) => {
    const id = segmentEl.getAttribute('data-pdf-segment-id') || `segment-${index}`;
    const role = segmentEl.getAttribute('data-pdf-segment-role') || 'autre';
    const isExcluded = segmentEl.getAttribute('data-pdf-segment-excluded') === 'true';

    // Ne pas inclure les segments exclus
    if (isExcluded) return;

    const segment: PDFSegment = {
      id,
      role,
      title: segmentEl.querySelector('[data-pdf-segment-title]')?.textContent?.trim(),
      provider: segmentEl.querySelector('[data-pdf-segment-provider]')?.textContent?.trim(),
      description: segmentEl.querySelector('[data-pdf-segment-description]')?.textContent?.trim(),
      address: segmentEl.querySelector('[data-pdf-segment-address]')?.textContent?.trim(),
      startTime: segmentEl.querySelector('[data-pdf-segment-start-time]')?.textContent?.trim(),
      endTime: segmentEl.querySelector('[data-pdf-segment-end-time]')?.textContent?.trim(),
      phone: segmentEl.querySelector('[data-pdf-segment-phone]')?.textContent?.trim(),
      duration: segmentEl.querySelector('[data-pdf-segment-duration]')?.textContent?.trim(),
    };

    segments.push(segment);
  });

  return segments;
}

/**
 * Extrait les contacts d'urgence
 */
function extractEmergencyContacts(clone: HTMLElement): any[] {
  const contacts: any[] = [];
  const contactElements = clone.querySelectorAll('[data-pdf-emergency-contact]');

  contactElements.forEach((contactEl: Element) => {
    const name = contactEl.querySelector('[data-pdf-contact-name]')?.textContent?.trim();
    const phone = contactEl.querySelector('[data-pdf-contact-phone]')?.textContent?.trim();
    const description = contactEl.querySelector('[data-pdf-contact-description]')?.textContent?.trim();

    if (name || phone) {
      contacts.push({ name, phone, description });
    }
  });

  return contacts;
}
