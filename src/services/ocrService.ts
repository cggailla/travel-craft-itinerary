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
  try {
    const pdfjsLib: any = await import('pdfjs-dist');
    if (pdfjsLib?.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.js';
    }

    const arrayBuffer = await pdfFile.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str).join(' ');
      fullText += `\n\n--- Page ${pageNum} ---\n${strings}`;
    }

    if (fullText.trim().length < 30) {
      const ocrChunks: string[] = [];
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const blob: Blob = await new Promise((resolve) => canvas.toBlob(b => resolve(b as Blob), 'image/png'));
        const imgFile = new File([blob], `${pdfFile.name}-page-${pageNum}.png`, { type: 'image/png' });
        const text = await extractTextFromImage(imgFile);
        ocrChunks.push(text);
      }
      fullText = ocrChunks.join('\n\n');
    }

    return fullText.trim();
  } catch (error) {
    console.error('OCR Error (PDF):', error);
    throw new Error('Failed to extract text from PDF');
  }
}