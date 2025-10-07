/**
 * Utilitaire d'estimation de hauteur pour la génération PDF
 * Permet de décider intelligemment où insérer des sauts de page
 */

export interface StepMetrics {
  headerHeight: number;
  textHeight: number;
  imagesHeight: number;
  notesHeight: number;
  totalHeight: number;
}

// Constantes de calcul (en mm)
const MM_PER_LINE = 4.5;
const LINE_HEIGHT = 1.4;
const CHARS_PER_LINE = 85;
const IMAGE_ROW_HEIGHT = 65; // hauteur d'une ligne d'images (60mm + gap)
const HEADER_HEIGHT = 20;
const NOTES_HEIGHT = 25;
const MARGIN_HEIGHT = 16;
const PAGE_HEIGHT = 277; // A4 height
const PAGE_MARGINS = 30; // top + bottom margins
const USABLE_PAGE_HEIGHT = PAGE_HEIGHT - PAGE_MARGINS;

/**
 * Estime la hauteur d'une étape en millimètres
 */
export function estimateStepHeight(step: any): number {
  // Hauteur du header
  const headerHeight = HEADER_HEIGHT;
  
  // Hauteur du texte (description)
  let textHeight = 0;
  if (step.description) {
    const textLength = step.description.length;
    const lineCount = Math.ceil(textLength / CHARS_PER_LINE);
    textHeight = lineCount * MM_PER_LINE * LINE_HEIGHT;
  }
  
  // Hauteur des images (grille 3 colonnes)
  let imagesHeight = 0;
  if (step.images && step.images.length > 0) {
    const rows = Math.ceil(step.images.length / 3);
    imagesHeight = rows * IMAGE_ROW_HEIGHT;
  }
  
  // Hauteur des notes
  const notesHeight = step.notes ? NOTES_HEIGHT : 0;
  
  // Total avec marges
  const total = headerHeight + textHeight + imagesHeight + notesHeight + MARGIN_HEIGHT;
  
  return total;
}

/**
 * Estime la hauteur d'un segment en millimètres
 */
export function estimateSegmentHeight(segment: any): number {
  // Header du segment
  const headerHeight = 15;
  
  // Contenu du segment
  let contentHeight = 0;
  if (segment.ai_content) {
    const textLength = segment.ai_content.length;
    const lineCount = Math.ceil(textLength / CHARS_PER_LINE);
    contentHeight = lineCount * MM_PER_LINE * LINE_HEIGHT;
  }
  
  // Images du segment
  let imagesHeight = 0;
  if (segment.images && segment.images.length > 0) {
    const rows = Math.ceil(segment.images.length / 3);
    imagesHeight = rows * IMAGE_ROW_HEIGHT;
  }
  
  return headerHeight + contentHeight + imagesHeight + 12; // + marges
}

/**
 * Détermine si un saut de page devrait être inséré avant cette étape
 * @param step L'étape à évaluer
 * @param previousStepsHeight Hauteur cumulée des étapes précédentes sur la page courante
 * @returns true si un saut de page est recommandé
 */
export function shouldBreakBefore(step: any, previousStepsHeight: number): boolean {
  const stepHeight = estimateStepHeight(step);
  const remaining = USABLE_PAGE_HEIGHT - (previousStepsHeight % USABLE_PAGE_HEIGHT);
  
  // Si l'étape prend plus de 70% de l'espace restant, forcer un saut
  // Cela évite d'avoir une étape coupée de manière inélégante
  return stepHeight > remaining * 0.7;
}

/**
 * Détermine si un saut de page devrait être inséré avant ce segment
 */
export function shouldBreakBeforeSegment(segment: any, previousHeight: number): boolean {
  const segmentHeight = estimateSegmentHeight(segment);
  const remaining = USABLE_PAGE_HEIGHT - (previousHeight % USABLE_PAGE_HEIGHT);
  
  // Si le segment prend plus de 75% de l'espace restant, forcer un saut
  return segmentHeight > remaining * 0.75;
}

/**
 * Calcule les métriques détaillées d'une étape
 */
export function getStepMetrics(step: any): StepMetrics {
  const headerHeight = HEADER_HEIGHT;
  
  let textHeight = 0;
  if (step.description) {
    const textLength = step.description.length;
    const lineCount = Math.ceil(textLength / CHARS_PER_LINE);
    textHeight = lineCount * MM_PER_LINE * LINE_HEIGHT;
  }
  
  let imagesHeight = 0;
  if (step.images && step.images.length > 0) {
    const rows = Math.ceil(step.images.length / 3);
    imagesHeight = rows * IMAGE_ROW_HEIGHT;
  }
  
  const notesHeight = step.notes ? NOTES_HEIGHT : 0;
  const totalHeight = headerHeight + textHeight + imagesHeight + notesHeight + MARGIN_HEIGHT;
  
  return {
    headerHeight,
    textHeight,
    imagesHeight,
    notesHeight,
    totalHeight
  };
}

/**
 * Découpe un texte long en paragraphes gérables
 */
export function splitIntoParagraphs(text: string): string[] {
  if (!text) return [];
  
  // Séparer par double saut de ligne
  let paragraphs = text.split(/\n{2,}/);
  
  // Si pas de double saut, séparer par saut simple
  if (paragraphs.length === 1) {
    paragraphs = text.split(/\n/);
  }
  
  // Nettoyer et filtrer
  return paragraphs
    .map(p => p.trim())
    .filter(p => p.length > 0);
}
