/**
 * Utilitaire d'optimisation d'images pour la génération PDF
 * Réduit la taille et améliore les performances
 */

const MAX_WIDTH = 800;
const MAX_HEIGHT = 600;
const JPEG_QUALITY = 0.85;

/**
 * Optimise une image pour l'inclusion dans un PDF
 * @param url URL de l'image source
 * @returns Promise avec data URL de l'image optimisée
 */
export async function optimizeImageForPdf(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        // Redimensionner si nécessaire
        if (width > MAX_WIDTH) {
          height = (height * MAX_WIDTH) / width;
          width = MAX_WIDTH;
        }
        if (height > MAX_HEIGHT) {
          width = (width * MAX_HEIGHT) / height;
          height = MAX_HEIGHT;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Impossible de créer le contexte canvas'));
          return;
        }
        
        // Dessiner l'image redimensionnée
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir en data URL
        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        resolve(dataUrl);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error(`Impossible de charger l'image: ${url}`));
    };
    
    img.src = url;
  });
}

/**
 * Optimise toutes les images d'un élément HTML
 * @param element L'élément contenant les images
 * @returns Promise qui se résout quand toutes les images sont optimisées
 */
export async function optimizeAllImages(element: HTMLElement): Promise<void> {
  const images = element.querySelectorAll<HTMLImageElement>('img:not(.no-optimize)');
  
  const optimizations = Array.from(images).map(async (img) => {
    try {
      // Ignorer les images déjà en data URL
      if (img.src.startsWith('data:')) {
        return;
      }
      
      // Sauvegarder l'URL originale
      img.dataset.originalSrc = img.src;
      
      // Optimiser
      const optimized = await optimizeImageForPdf(img.src);
      img.src = optimized;
    } catch (error) {
      console.warn('Échec d\'optimisation de l\'image:', error);
      // En cas d'échec, garder l'image originale
    }
  });
  
  await Promise.allSettled(optimizations);
}

/**
 * Restaure les images originales après génération PDF
 * @param element L'élément contenant les images
 */
export function restoreOriginalImages(element: HTMLElement): void {
  const images = element.querySelectorAll<HTMLImageElement>('img[data-original-src]');
  
  images.forEach(img => {
    if (img.dataset.originalSrc) {
      img.src = img.dataset.originalSrc;
      delete img.dataset.originalSrc;
    }
  });
}

/**
 * Optimise les images par lot pour éviter la surcharge mémoire
 * @param urls Liste des URLs d'images
 * @param batchSize Taille des lots
 */
export async function optimizeImagesBatch(
  urls: string[], 
  batchSize: number = 6
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  
  // Traiter par lots
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const batchPromises = batch.map(async (url) => {
      try {
        const optimized = await optimizeImageForPdf(url);
        return { url, optimized };
      } catch (error) {
        console.warn(`Échec optimisation ${url}:`, error);
        return { url, optimized: url }; // Fallback sur l'original
      }
    });
    
    const batchResults = await Promise.allSettled(batchPromises);
    batchResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        results.set(result.value.url, result.value.optimized);
      }
    });
  }
  
  return results;
}
