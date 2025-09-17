import { getOpenAIKey } from '@/services/openaiService';

interface TravelDocumentData {
  type: 'flight' | 'hotel' | 'activity' | 'car' | 'other';
  title: string;
  startDate: string | null;
  endDate?: string | null;
  provider: string;
  reference?: string;
  address?: string;
  description: string;
  confidence: number;
  details: { [key: string]: any };
}

async function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function renderPdfToImages(pdfFile: File, maxPages = 3): Promise<string[]> {
  const images: string[] = [];
  try {
    const pdfjsLib: any = await import('pdfjs-dist');
    const workerSrc = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    if (pdfjsLib?.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc.default;
    }
    const arrayBuffer = await pdfFile.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const pageCount = Math.min(pdf.numPages, maxPages);
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;
      const dataUrl = canvas.toDataURL('image/png', 0.92);
      images.push(dataUrl);
    }
    return images;
  } catch (error) {
    console.error('PDF rendering error:', error);
    throw new Error(`Erreur lors du rendu PDF: ${error.message}`);
  }
}

export async function parseWithAIVisionFromFile(file: File, fileName: string): Promise<TravelDocumentData> {
  const apiKey = getOpenAIKey();
  if (!apiKey) throw new Error('Clé API OpenAI manquante. Veuillez la configurer.');

  // Build image inputs
  let imageDataUrls: string[] = [];
  if (file.type === 'application/pdf') {
    imageDataUrls = await renderPdfToImages(file, 3);
  } else if (file.type.startsWith('image/')) {
    imageDataUrls = [await fileToDataURL(file)];
  } else {
    throw new Error(`Type de fichier non supporté pour vision: ${file.type}`);
  }

  const userContent: any[] = [
    { type: 'text', text: `Analyse ce document (${fileName}). Réponds UNIQUEMENT avec un JSON valide conforme au schéma demandé.` }
  ];
  for (const url of imageDataUrls) {
    userContent.push({ type: 'image_url', image_url: { url } });
  }

  const promptSchema = `Retourne UNIQUEMENT un objet JSON valide avec cette structure exacte:\n{\n  "type": "flight" | "hotel" | "activity" | "car" | "other",\n  "title": "Titre descriptif court",\n  "startDate": "YYYY-MM-DD" ou "YYYY-MM-DDTHH:mm",\n  "endDate": "YYYY-MM-DD" ou "YYYY-MM-DDTHH:mm" (optionnel),\n  "provider": "Nom de la compagnie/fournisseur",\n  "reference": "Numéro de confirmation/référence",\n  "address": "Adresse ou lieux (départ-arrivée pour vols)",\n  "description": "Description détaillée des informations extraites",\n  "confidence": 0.95,\n  "details": {}\n}\nRègles: type précis, dates ISO, réponds JSON uniquement.`;

  userContent.push({ type: 'text', text: promptSchema });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Tu es un expert en extraction d\'informations à partir d\'images de documents. Réponds UNIQUEMENT avec du JSON.' },
        { role: 'user', content: userContent },
      ],
      temperature: 0.1,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) throw new Error(`Erreur API OpenAI: ${response.status}`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Réponse vide de l\'API OpenAI');

  try {
    const parsed = JSON.parse(content.trim());
    return parsed as TravelDocumentData;
  } catch (e) {
    console.error('Vision: JSON invalide reçu:', content);
    throw new Error('Format de réponse invalide de l\'AI (vision)');
  }
}
