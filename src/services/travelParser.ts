import { TravelSegment, SegmentType } from '@/types/travel';

export function parseDocumentText(text: string, fileName: string): Partial<TravelSegment> {
  const lowerText = text.toLowerCase();
  
  // Detect segment type
  let type: SegmentType = 'other';
  if (lowerText.includes('boarding pass') || lowerText.includes('flight') || lowerText.includes('airline')) {
    type = 'flight';
  } else if (lowerText.includes('hotel') || lowerText.includes('reservation') || lowerText.includes('booking')) {
    type = 'hotel';
  } else if (lowerText.includes('activity') || lowerText.includes('tour') || lowerText.includes('ticket')) {
    type = 'activity';
  } else if (lowerText.includes('car') || lowerText.includes('rental') || lowerText.includes('vehicle')) {
    type = 'car';
  }

  // Extract common patterns
  const datePattern = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/g;
  const dates = text.match(datePattern) || [];
  
  const timePattern = /(\d{1,2}:\d{2})/g;
  const times = text.match(timePattern) || [];
  
  // Extract reference numbers (letters + numbers)
  const refPattern = /[A-Z]{2,}\d{3,}|\d{3,}[A-Z]{2,}/g;
  const references = text.match(refPattern) || [];

  // Extract providers/companies (capitalized words)
  const providerPattern = /\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b/g;
  const providers = text.match(providerPattern) || [];

  // Parse first date found
  let startDate = new Date();
  if (dates.length > 0) {
    const parsedDate = new Date(dates[0]);
    if (!isNaN(parsedDate.getTime())) {
      startDate = parsedDate;
    }
  }

  // Generate title based on type
  let title = fileName.split('.')[0];
  switch (type) {
    case 'flight':
      title = `Flight ${references[0] || 'TBD'}`;
      break;
    case 'hotel':
      title = `Hotel ${providers[0] || 'Booking'}`;
      break;
    case 'activity':
      title = `Activity ${providers[0] || 'Tour'}`;
      break;
    case 'car':
      title = `Car Rental ${providers[0] || 'Service'}`;
      break;
  }

  return {
    segment_type: type,
    title,
    start_date: startDate.toISOString(),
    provider: providers[0] || 'Unknown Provider',
    reference_number: references[0],
    description: text.slice(0, 200) + (text.length > 200 ? '...' : ''),
    confidence: calculateConfidence(type, dates, references, providers)
  };
}

function calculateConfidence(
  type: SegmentType, 
  dates: string[], 
  references: string[], 
  providers: string[]
): number {
  let confidence = 0.3; // Base confidence
  
  if (type !== 'other') confidence += 0.3;
  if (dates.length > 0) confidence += 0.2;
  if (references.length > 0) confidence += 0.1;
  if (providers.length > 0) confidence += 0.1;
  
  return Math.min(confidence, 1.0);
}