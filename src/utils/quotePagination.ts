/**
 * Utility functions for paginating quote content into slides
 */

import { QuoteStep } from "@/services/quoteService";

export interface PaginatedSteps {
  slideNumber: number;
  steps: QuoteStep[];
  title: string;
}

/**
 * Estimate the height needed for a step in the itinerary
 * Returns height in arbitrary units
 */
export function estimateStepHeight(step: QuoteStep): number {
  let height = 150; // Base height for step header + date

  // Add height for description
  if (step.description) {
    const descLength = step.description.length;
    height += Math.ceil(descLength / 100) * 20; // ~20 units per 100 chars
  }

  // Add height for segments
  height += step.segments.length * 40; // ~40 units per segment

  return height;
}

/**
 * Split itinerary steps into multiple slides
 * Target: 2-3 steps per slide depending on content density
 */
export function paginateItinerarySteps(
  steps: QuoteStep[],
  maxHeightPerSlide: number = 500
): PaginatedSteps[] {
  const slides: PaginatedSteps[] = [];
  let currentSlide: QuoteStep[] = [];
  let currentHeight = 0;
  let slideNumber = 1;

  for (const step of steps) {
    const stepHeight = estimateStepHeight(step);

    // Check if adding this step would exceed the max height
    if (currentSlide.length > 0 && currentHeight + stepHeight > maxHeightPerSlide) {
      // Save current slide and start a new one
      slides.push({
        slideNumber,
        steps: currentSlide,
        title: `Programme détaillé (${slideNumber}/${Math.ceil(steps.length / 2)})`,
      });
      currentSlide = [];
      currentHeight = 0;
      slideNumber++;
    }

    currentSlide.push(step);
    currentHeight += stepHeight;
  }

  // Add the last slide if it has content
  if (currentSlide.length > 0) {
    slides.push({
      slideNumber,
      steps: currentSlide,
      title: slides.length > 0 
        ? `Programme détaillé (${slideNumber}/${slideNumber})` 
        : "Programme détaillé",
    });
  }

  return slides;
}

/**
 * Split a long text into chunks that fit on slides
 */
export function paginateText(
  text: string,
  maxCharsPerSlide: number = 1500
): string[] {
  if (text.length <= maxCharsPerSlide) {
    return [text];
  }

  const chunks: string[] = [];
  const paragraphs = text.split('\n\n');
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length <= maxCharsPerSlide) {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      // If a single paragraph is too long, split it
      if (paragraph.length > maxCharsPerSlide) {
        const words = paragraph.split(' ');
        let tempChunk = '';
        for (const word of words) {
          if (tempChunk.length + word.length + 1 <= maxCharsPerSlide) {
            tempChunk += (tempChunk ? ' ' : '') + word;
          } else {
            chunks.push(tempChunk);
            tempChunk = word;
          }
        }
        currentChunk = tempChunk;
      } else {
        currentChunk = paragraph;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Split array items into multiple slides
 */
export function paginateItems<T>(
  items: T[],
  itemsPerSlide: number
): T[][] {
  const slides: T[][] = [];
  
  for (let i = 0; i < items.length; i += itemsPerSlide) {
    slides.push(items.slice(i, i + itemsPerSlide));
  }
  
  return slides;
}
