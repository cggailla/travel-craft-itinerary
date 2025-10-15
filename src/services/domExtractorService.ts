import { BookletData, Segment, Step } from '@/components/pdf/BookletPDF';
import logoAdgentes from '@/assets/logo-adgentes.png';

/**
 * Extrait les données du carnet de voyage depuis le DOM
 * @param root Element HTML racine (#booklet-content)
 * @returns Données structurées pour le PDF
 */
export function extractBookletDataFromDOM(root: HTMLElement | null): BookletData {
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

  // Format dates as "dd/MM/yyyy"
  const formatDateLabel = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const startDateLabel = formatDateLabel(startDateStr);
  const endDateLabel = formatDateLabel(endDateStr);

  // Calculate total days
  let totalDays = 1;
  if (startDateStr && endDateStr) {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
  }

  // Extraction des images de couverture
  const coverPhotos: string[] = [];
  clone.querySelectorAll('[data-pdf-cover-image]').forEach((img: Element) => {
    const src = (img as HTMLImageElement).src || (img as HTMLElement).style.backgroundImage?.match(/url\(["']?([^"']*)["']?\)/)?.[1];
    if (src) {
      coverPhotos.push(src);
    }
  });

  // Extraction des informations générales
  const generalInfoText = clone.querySelector('[data-pdf-general-info]')?.textContent?.trim() || '';

  // Extraction des contacts d'urgence
  const emergencyContactsText = clone.querySelector('[data-pdf-emergency-contacts]')?.textContent?.trim() || '';

  // Extraction du message de remerciement
  const thankYouText = clone.querySelector('[data-pdf-thank-you]')?.textContent?.trim() || '';

  // Extraction des étapes
  const steps = extractSteps(clone);

  return {
    logoUrl: logoAdgentes,
    tripTitle,
    startDateLabel,
    endDateLabel,
    totalDays,
    coverPhotos: coverPhotos.slice(0, 2),
    steps,
    thankYouText,
    generalInfoText,
    emergencyContactsText,
    emergencyNotesText: '', // Page vierge pour notes personnelles
  };
}

/**
 * Retourne le HTML nettoyé (string) du DOM utilisé pour l'extraction du booklet.
 * Utile pour debug/inspection sans lancer la génération du PDF.
 */
export function getBookletDOMSnapshot(root: HTMLElement | null): string {
  if (!root) {
    throw new Error('Element #booklet-content introuvable');
  }

  const clone = root.cloneNode(true) as HTMLElement;

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

  // Inline styles that could rely on app CSS (optional): keep as-is for now
  return clone.outerHTML;
}

/**
 * Retourne le HTML brut (string) en préservant le contenu des éléments
 * contenteditable. Utile pour récupérer le HTML affiché tel quel (titre,
 * aperçus, textes éditables) afin de développer l'extracteur.
 *
 * Contrairement à `getBookletDOMSnapshot`, cette fonction ne supprime pas
 * les éléments possédant l'attribut `contenteditable` ; au lieu de cela
 * elle les remplace par des éléments statiques contenant leur textContent.
 */
export function getBookletDOMFullSnapshot(root: HTMLElement | null): string {
  if (!root) {
    throw new Error('Element #booklet-content introuvable');
  }

  const clone = root.cloneNode(true) as HTMLElement;

  // Retirer uniquement les contrôles/interactifs, mais garder le contenu texte
  const selectorsToRemove = [
    'button',
    'input',
    'textarea',
    '.upload-zone',
    '.no-print',
    '.edit-button',
    '.delete-button',
    '.drag-handle'
  ];

  selectorsToRemove.forEach(selector => {
    clone.querySelectorAll(selector).forEach(el => el.remove());
  });

  // Remplacer les éléments contenteditable par un élément statique contenant le texte
  clone.querySelectorAll('[contenteditable]').forEach((el) => {
    const text = (el as HTMLElement).textContent || '';
    const replacement = document.createElement('div');
    replacement.textContent = text;
    // Conserver certains attributs utiles pour le debug (data-pdf-title, etc.)
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('data-pdf')) {
        replacement.setAttribute(attr.name, attr.value);
      }
    });
    el.replaceWith(replacement);
  });

  return clone.outerHTML;
}

/**
 * Retourne l'HTML strictement brut tel qu'il est dans le DOM (aucune modification).
 * Utiliser avec prudence (contient tous les contrôles interactifs, commentaires, data-attrs, etc.).
 */
/**
 * Retourne l'HTML réellement rendu dans le navigateur,
 * y compris les attributs dynamiques comme src, href, value, checked, etc.
 */
export function getBookletDOMRawExport(root: HTMLElement | null): string {
  if (!root) {
    throw new Error('Element #booklet-content introuvable');
  }

  try {
    const serializer = new XMLSerializer();
    const html = serializer.serializeToString(root);

    console.log("🧩 [Export] HTML size:", html.length);
    return html;
  } catch (err) {
    console.error("❌ XMLSerializer failed, fallback to outerHTML:", err);
    return root.outerHTML;
  }
}


/**
 * Console logs some infos utiles et le snapshot HTML nettoyé.
 * Affiche: titre, dates, nombre d'étapes et le HTML nettoyé (troncature si très long).
 */
export function debugLogBookletDOM(root: HTMLElement | null) {
  try {
    if (!root) {
      console.warn('debugLogBookletDOM: Element #booklet-content introuvable');
      return;
    }

    const snapshot = getBookletDOMSnapshot(root);

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = snapshot;

    const title = tempDiv.querySelector('[data-pdf-title]')?.getAttribute('data-pdf-title') || 'Carnet de voyage (titre introuvable)';
    const startDate = tempDiv.querySelector('[data-pdf-start-date]')?.getAttribute('data-pdf-start-date') || '(start date missing)';
    const endDate = tempDiv.querySelector('[data-pdf-end-date]')?.getAttribute('data-pdf-end-date') || '(end date missing)';
    const stepsCount = tempDiv.querySelectorAll('[data-pdf-step]').length;

    console.group('Booklet DOM Snapshot');
    console.log('Title:', title);
    console.log('Start date:', startDate);
    console.log('End date:', endDate);
    console.log('Steps found:', stepsCount);

    const maxLen = 20_000;
    if (snapshot.length > maxLen) {
      console.log('Snapshot (truncated):', snapshot.slice(0, maxLen) + '\n... (truncated)');
    } else {
      console.log('Snapshot:', snapshot);
    }
    console.groupEnd();
  } catch (err) {
    console.error('debugLogBookletDOM error', err);
  }
}

/**
 * Ouvre une nouvelle fenêtre et y écrit le snapshot HTML nettoyé.
 * Utile pour inspection visuelle hors-app (dev only).
 */
export function openBookletSnapshotWindow(root: HTMLElement | null) {
  try {
    if (!root) {
      throw new Error('Element #booklet-content introuvable');
    }

    const snapshot = getBookletDOMSnapshot(root);
    const w = window.open('', '_blank');
    if (!w) {
      console.warn('openBookletSnapshotWindow: popup blocked');
      return;
    }

    w.document.open();
    w.document.write(snapshot);
    w.document.close();
  } catch (err) {
    console.error('openBookletSnapshotWindow error', err);
  }
}

/**
 * Extrait toutes les étapes du voyage
 */
function extractSteps(clone: HTMLElement): Step[] {
  const steps: Step[] = [];
  const stepElements = clone.querySelectorAll('[data-pdf-step]');

  stepElements.forEach((stepEl: Element, index: number) => {
    const stepTitle = stepEl.querySelector('[data-pdf-step-title]')?.textContent?.trim() || `Étape ${index + 1}`;
    const startDateStr = stepEl.querySelector('[data-pdf-step-start-date]')?.getAttribute('data-pdf-step-start-date');
    const endDateStr = stepEl.querySelector('[data-pdf-step-end-date]')?.getAttribute('data-pdf-step-end-date');

    // Format date label (e.g., "Lundi 12 mai 2025")
    const formatLongDateLabel = (dateStr: string | undefined): string => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      };
      return date.toLocaleDateString('fr-FR', options);
    };

    const dateLabel = formatLongDateLabel(startDateStr) || `Jour ${index + 1}`;

    // Extraction du contenu AI (overview)
    const overview = stepEl.querySelector('[data-pdf-step-overview]')?.textContent?.trim();

    // Extraction de l'info locale
    const localInfo = stepEl.querySelector('[data-pdf-step-local-context]')?.textContent?.trim();

    // Extraction des tips
    const tips: string[] = [];
    stepEl.querySelectorAll('[data-pdf-step-tip]').forEach(tip => {
      const text = tip.textContent?.trim();
      if (text) tips.push(text);
    });

    // Extraction des segments
    const segments = extractSegments(stepEl as HTMLElement);

    // Extraction des images de l'étape
    const photos: string[] = [];
    stepEl.querySelectorAll('[data-pdf-step-image]').forEach((img: Element) => {
      const src = (img as HTMLImageElement).src || (img as HTMLElement).style.backgroundImage?.match(/url\(["']?([^"']*)["']?\)/)?.[1];
      if (src) {
        photos.push(src);
      }
    });

    steps.push({
      dateLabel,
      title: stepTitle,
      overview,
      segments,
      tips: tips.length > 0 ? tips : undefined,
      localInfo,
      photos: photos.length > 0 ? photos : undefined,
    });
  });

  return steps;
}

/**
 * Map segment role to type
 */
function mapRoleToType(role: string): Segment['type'] {
  const roleMap: Record<string, Segment['type']> = {
    'vol': 'flight',
    'flight': 'flight',
    'transfert': 'transfer',
    'transfer': 'transfer',
    'hotel': 'hotel',
    'hébergement': 'hotel',
    'accommodation': 'hotel',
    'train': 'train',
    'activité': 'activity',
    'activity': 'activity',
    'visite': 'activity',
    'transport': 'transport',
  };

  return roleMap[role.toLowerCase()] || 'other';
}

/**
 * Extrait les segments de tous les niveaux (sections et directement dans step)
 */
function extractSegments(stepEl: HTMLElement): Segment[] {
  const segments: Segment[] = [];
  const segmentElements = stepEl.querySelectorAll('[data-pdf-segment]');

  segmentElements.forEach((segmentEl: Element) => {
    const role = segmentEl.getAttribute('data-pdf-segment-role') || 'autre';
    const isExcluded = segmentEl.getAttribute('data-pdf-segment-excluded') === 'true';

    // Ne pas inclure les segments exclus
    if (isExcluded) return;

    const title = segmentEl.getAttribute('data-pdf-segment-title') || 
                  segmentEl.querySelector('[data-pdf-segment-title]')?.textContent?.trim() || 
                  'Prestation';

    // Collecter les informations (provider, address, time, etc.)
    const info: string[] = [];
    
    const provider = segmentEl.getAttribute('data-pdf-segment-provider');
    if (provider) info.push(`Prestataire: ${provider}`);

    const address = segmentEl.getAttribute('data-pdf-segment-address');
    if (address) info.push(`Adresse: ${address}`);

    const startTime = segmentEl.getAttribute('data-pdf-segment-start-time');
    const endTime = segmentEl.getAttribute('data-pdf-segment-end-time');
    if (startTime && endTime) {
      info.push(`Horaires: ${startTime} - ${endTime}`);
    } else if (startTime) {
      info.push(`Horaire: ${startTime}`);
    }

    const phone = segmentEl.getAttribute('data-pdf-segment-phone');
    if (phone) info.push(`Téléphone: ${phone}`);

    const duration = segmentEl.getAttribute('data-pdf-segment-duration');
    if (duration) info.push(`Durée: ${duration}`);

    const description = segmentEl.getAttribute('data-pdf-segment-description');
    if (description) info.push(description);

    segments.push({
      type: mapRoleToType(role),
      title,
      info,
    });
  });

  return segments;
}
