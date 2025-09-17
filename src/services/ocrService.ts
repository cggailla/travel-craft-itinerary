import { pipeline } from '@huggingface/transformers';

let ocrPipeline: any = null;

export async function initOCR() {
  if (!ocrPipeline) {
    console.log('Initializing OCR pipeline...');
    ocrPipeline = await pipeline(
      'image-to-text',
      'Xenova/trocr-base-printed',
      { device: 'webgpu' }
    );
  }
  return ocrPipeline;
}

export async function extractTextFromImage(imageFile: File): Promise<string> {
  try {
    const pipeline = await initOCR();
    const imageUrl = URL.createObjectURL(imageFile);
    
    const result = await pipeline(imageUrl);
    URL.revokeObjectURL(imageUrl);
    
    return result[0]?.generated_text || '';
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to extract text from image');
  }
}

export async function extractTextFromPDF(pdfFile: File): Promise<string> {
  // For now, return a mock extraction
  // In a real implementation, you would use pdf.js or similar
  return `Mock extracted text from ${pdfFile.name}. 
    
BOARDING PASS
Flight: AF1234
From: Paris CDG (CDG)
To: New York JFK (JFK)
Date: 2024-03-15
Time: 14:30
Passenger: John Doe
Seat: 12A
Confirmation: ABC123`;
}