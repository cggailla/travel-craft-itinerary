import * as pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import sharp from 'sharp';

export interface OcrPageResult {
  pageIndex: number;
  text: string;
  confidence: number;
  source: 'pdf-native' | 'ocr-local';
  timings: {
    start: number;
    end: number;
    duration: number;
  };
  error?: string;
}

export interface OcrDocumentResult {
  pages: OcrPageResult[];
  totalPages: number;
  success: boolean;
  error?: string;
}

// Logger function for Journal
function logToJournal(message: string) {
  console.log(`[OCR Journal] ${message}`);
  // TODO: Integrate with actual Journal component if exists
}

export async function extractTextFromPDF(pdfFile: File): Promise<OcrDocumentResult> {
  const startTime = Date.now();
  
  try {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    logToJournal(`Tentative de lecture PDF native pour ${pdfFile.name}`);
    
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text.trim();
    
    if (text && text.length > 50) {
      const endTime = Date.now();
      logToJournal(`PDF natif → OK (${text.length} caractères extraits)`);
      
      return {
        pages: [{
          pageIndex: 0,
          text: text,
          confidence: 0.95,
          source: 'pdf-native',
          timings: {
            start: startTime,
            end: endTime,
            duration: endTime - startTime
          }
        }],
        totalPages: 1,
        success: true
      };
    } else {
      logToJournal(`PDF scanné détecté - Veuillez fournir des images PNG/JPG pour cette version MVP`);
      
      return {
        pages: [],
        totalPages: 0,
        success: false,
        error: 'PDF scanné détecté. Veuillez convertir en images PNG/JPG pour l\'OCR dans cette version MVP.'
      };
    }
  } catch (error) {
    const endTime = Date.now();
    logToJournal(`Erreur PDF native → ${error.message}`);
    
    return {
      pages: [{
        pageIndex: 0,
        text: '',
        confidence: 0,
        source: 'pdf-native',
        timings: {
          start: startTime,
          end: endTime,
          duration: endTime - startTime
        },
        error: error.message
      }],
      totalPages: 1,
      success: false,
      error: error.message
    };
  }
}

async function preprocessImage(imageFile: File): Promise<Buffer> {
  try {
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    let processedImage = image.grayscale();
    
    if (metadata.width && metadata.width < 1200) {
      processedImage = processedImage.resize(Math.round(metadata.width * 1.5));
      logToJournal(`Image upscalée x1.5 (${metadata.width}px → ${Math.round(metadata.width * 1.5)}px)`);
    }
    
    return await processedImage.png().toBuffer();
  } catch (error) {
    logToJournal(`Erreur prétraitement image → ${error.message}`);
    throw error;
  }
}

export async function extractTextFromImage(imageFile: File, maxRetries = 3): Promise<OcrDocumentResult> {
  const startTime = Date.now();
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      logToJournal(`OCR image → Tentative ${retryCount + 1}/${maxRetries}`);
      
      // Prétraitement de l'image
      const preprocessedBuffer = await preprocessImage(imageFile);
      
      // Initialiser Tesseract worker
      const worker = await createWorker(['eng', 'fra', 'ita']);
      
      // OCR sur l'image prétraitée
      const { data } = await worker.recognize(preprocessedBuffer);
      await worker.terminate();
      
      const endTime = Date.now();
      const confidence = data.confidence / 100; // Tesseract retourne 0-100, on veut 0-1
      
      if (confidence > 0.3 && data.text.trim().length > 10) {
        logToJournal(`OCR image → OK (conf ${confidence.toFixed(2)})`);
        
        return {
          pages: [{
            pageIndex: 0,
            text: data.text.trim(),
            confidence: confidence,
            source: 'ocr-local',
            timings: {
              start: startTime,
              end: endTime,
              duration: endTime - startTime
            }
          }],
          totalPages: 1,
          success: true
        };
      } else {
        throw new Error(`Confiance trop faible (${confidence.toFixed(2)}) ou texte trop court`);
      }
      
    } catch (error) {
      retryCount++;
      logToJournal(`OCR → retry (${retryCount}/${maxRetries}) - ${error.message}`);
      
      if (retryCount >= maxRetries) {
        const endTime = Date.now();
        
        return {
          pages: [{
            pageIndex: 0,
            text: '',
            confidence: 0,
            source: 'ocr-local',
            timings: {
              start: startTime,
              end: endTime,
              duration: endTime - startTime
            },
            error: `Échec après ${maxRetries} tentatives: ${error.message}`
          }],
          totalPages: 1,
          success: false,
          error: `Échec OCR après ${maxRetries} tentatives`
        };
      }
      
      // Attendre un peu avant le retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

export async function processDocument(file: File): Promise<OcrDocumentResult> {
  const fileType = file.type.toLowerCase();
  
  if (fileType === 'application/pdf') {
    return await extractTextFromPDF(file);
  } else if (fileType.startsWith('image/')) {
    return await extractTextFromImage(file);
  } else {
    return {
      pages: [],
      totalPages: 0,
      success: false,
      error: `Type de fichier non supporté: ${fileType}`
    };
  }
}