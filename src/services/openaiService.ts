interface TravelDocumentData {
  type: 'flight' | 'hotel' | 'activity' | 'car' | 'other';
  title: string;
  startDate: string;
  endDate?: string;
  provider: string;
  reference?: string;
  address?: string;
  description: string;
  confidence: number;
  details: {
    [key: string]: any;
  };
}

export async function parseWithAI(ocrText: string, fileName: string): Promise<TravelDocumentData> {
  const apiKey = localStorage.getItem('openai_api_key');
  
  if (!apiKey) {
    throw new Error('Clé API OpenAI manquante. Veuillez la configurer dans les paramètres.');
  }

  const prompt = `Analyse ce document de voyage et extrait les informations dans un format JSON structuré.

Texte OCR du document "${fileName}":
"""
${ocrText}
"""

Retourne UNIQUEMENT un objet JSON valide avec cette structure exacte:
{
  "type": "flight" | "hotel" | "activity" | "car" | "other",
  "title": "Titre descriptif court",
  "startDate": "YYYY-MM-DD" ou "YYYY-MM-DDTHH:mm",
  "endDate": "YYYY-MM-DD" ou "YYYY-MM-DDTHH:mm" (optionnel),
  "provider": "Nom de la compagnie/fournisseur",
  "reference": "Numéro de confirmation/référence",
  "address": "Adresse ou lieux (départ-arrivée pour vols)",
  "description": "Description détaillée des informations extraites",
  "confidence": 0.95,
  "details": {
    // Informations spécifiques selon le type
  }
}

Règles importantes:
- Détermine le TYPE avec précision (flight/hotel/activity/car/other)
- Extrait les DATES au format ISO (si pas d'heure, utilise juste YYYY-MM-DD)
- Pour les vols: address = "Départ - Arrivée", details inclut classe, siège, etc.
- Pour les hôtels: address = adresse complète, details inclut type de chambre, etc.
- Confidence entre 0.1 et 1.0 selon la clarté des infos
- Si incertain sur un champ, utilise "Non spécifié" ou null`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en extraction d\'informations de documents de voyage. Tu réponds UNIQUEMENT avec du JSON valide, sans commentaires.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Erreur API OpenAI: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Réponse vide de l\'API OpenAI');
    }

    // Parse the JSON response
    try {
      const parsed = JSON.parse(content.trim());
      
      // Validate required fields
      if (!parsed.type || !parsed.title || !parsed.startDate) {
        throw new Error('Champs requis manquants dans la réponse AI');
      }

      return parsed as TravelDocumentData;
    } catch (parseError) {
      console.error('Erreur parsing JSON:', content);
      throw new Error('Format de réponse invalide de l\'AI');
    }

  } catch (error) {
    console.error('Erreur service OpenAI:', error);
    throw error;
  }
}

export function setOpenAIKey(apiKey: string) {
  localStorage.setItem('openai_api_key', apiKey);
}

export function getOpenAIKey(): string | null {
  return localStorage.getItem('openai_api_key');
}

export function hasOpenAIKey(): boolean {
  return !!localStorage.getItem('openai_api_key');
}