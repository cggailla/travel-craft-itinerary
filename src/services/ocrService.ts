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
  // For now, we need a real PDF parsing solution
  // This is a placeholder that should be replaced with actual PDF.js or similar
  console.log('PDF processing not yet implemented, using fallback');
  
  // Return a generic message for now - this should be replaced with real PDF parsing
  return `Contenu PDF détecté: ${pdfFile.name}. Traitement PDF complet à implémenter.`;
}