import { supabase } from "@/integrations/supabase/client";
import { requireAuth } from "@/utils/authHelpers";
import { generateAndParseTripSummary, generateTripGeneralInfo } from "./aiContentService";

export interface QuoteData {
  tripId: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  duration: number;
  steps: QuoteStep[];
  generalInfo?: any;
  price?: number;
  participants?: string;
  numberOfPeople?: number;
  quoteDescription?: string;
  quoteHighlights?: string[];
  tripSummary?: string;
}

export interface QuoteStep {
  id: string;
  title: string;
  date: string;
  location: string;
  description?: string;
  quoteDescription?: string;
  segments: QuoteSegment[];
}

export interface QuoteSegment {
  id: string;
  type: string;
  title: string;
  description?: string;
  provider?: string;
  referenceNumber?: string;
  price?: string;
}

export interface QuoteStepContent {
  description: string;
}

/**
 * Récupère les données nécessaires pour générer un devis
 */
export async function getQuoteData(tripId: string): Promise<QuoteData> {
  await requireAuth();

  // 1. Récupérer les infos du voyage
  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .single();

  if (tripError) throw tripError;
  if (!trip) throw new Error("Trip not found");

  // 2. Récupérer les étapes
  const { data: steps, error: stepsError } = await supabase
    .from("travel_steps")
    .select("*")
    .eq("trip_id", tripId)
    .order("start_date", { ascending: true });

  if (stepsError) throw stepsError;

  // 3. Pour chaque étape, récupérer les segments associés
  const stepsWithSegments = await Promise.all(
    (steps || []).map(async (step) => {
      const { data: stepSegments } = await supabase
        .from("travel_step_segments")
        .select(`
          segment_id,
          position_in_step,
          travel_segments (*)
        `)
        .eq("step_id", step.id)
        .order("position_in_step", { ascending: true });

      const segments: QuoteSegment[] = (stepSegments || [])
        .filter((ss: any) => ss.travel_segments)
        .map((ss: any) => ({
          id: ss.travel_segments.id,
          type: ss.travel_segments.segment_type,
          title: ss.travel_segments.title,
          description: ss.travel_segments.description,
          provider: ss.travel_segments.provider,
          referenceNumber: ss.travel_segments.reference_number,
          price: ss.travel_segments.activity_price || ss.travel_segments.ticket_price,
        }));

      const aiContent = step.ai_content as { description?: string } | null;
      const quoteContent = step.quote_content as { description?: string } | null;
      
      return {
        id: step.id,
        title: step.step_title,
        date: step.start_date,
        location: step.primary_location || "",
        description: aiContent?.description,
        quoteDescription: quoteContent?.description,
        segments,
      };
    })
  );

  // 4. Récupérer les infos générales si disponibles
  const { data: generalInfo } = await supabase
    .from("trip_general_info")
    .select("*")
    .eq("trip_id", tripId)
    .maybeSingle();

  // 5. Calculer la durée
  const startDate = steps?.[0]?.start_date;
  const endDate = steps?.[steps.length - 1]?.end_date;
  let duration = 1;
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }

  return {
    tripId: trip.id,
    title: trip.title || "Voyage",
    destination: trip.destination_zone || generalInfo?.destination_country || "Destination",
    startDate: startDate || "",
    endDate: endDate || "",
    duration,
    steps: stepsWithSegments,
    generalInfo,
    price: trip.price || undefined,
    participants: trip.participants || undefined,
    numberOfPeople: trip.number_of_people || undefined,
    quoteDescription: (trip as any).quote_description,
    quoteHighlights: (trip as any).quote_highlights,
    tripSummary: (trip as any).trip_summary,
  };
}

/**
 * Met à jour l'URL du PDF du devis généré
 */
export async function updateQuotePdfUrl(tripId: string, pdfUrl: string): Promise<void> {
  await requireAuth();

  const { error } = await supabase
    .from("trips")
    .update({
      last_quote_pdf_url: pdfUrl,
      last_quote_generated_at: new Date().toISOString(),
    })
    .eq("id", tripId);

  if (error) throw error;
}

export const generateQuoteStepContent = async (stepId: string, segments: any[], destination?: string, tripSummary?: string) => {
  try {
    console.log(`Generating quote content for step ${stepId}...`);
    
    const { data, error } = await supabase.functions.invoke('generate-quote-step-content', {
      body: { segments, destination, tripSummary }
    });

    if (error) throw error;

    const quoteContent: QuoteStepContent = {
      description: data.content
    };

    // Sauvegarde dans la table travel_steps
    const { error: updateError } = await supabase
      .from('travel_steps')
      .update({ quote_content: quoteContent } as any) // Cast as any car la colonne est nouvelle
      .eq('id', stepId);

    if (updateError) throw updateError;

    return quoteContent;
  } catch (error) {
    console.error(`Error generating quote content for step ${stepId}:`, error);
    return null;
  }
};

export const generateQuoteSummary = async (tripId: string, tripSummary: string) => {
  try {
    console.log(`Generating quote summary for trip ${tripId}...`);
    
    const { data, error } = await supabase.functions.invoke('generate-quote-summary', {
      body: { tripId, tripSummary }
    });

    if (error) throw error;

    if (data.success && data.data) {
      // Sauvegarde dans la table trips
      const { error: updateError } = await supabase
        .from('trips')
        .update({ 
          quote_description: data.data.description,
          quote_highlights: data.data.highlights
        } as any)
        .eq('id', tripId);

      if (updateError) throw updateError;
      
      return data.data;
    }
    return null;
  } catch (error) {
    console.error(`Error generating quote summary for trip ${tripId}:`, error);
    return null;
  }
};

export const generateAllQuoteSteps = async (
  tripId: string, 
  steps: any[], 
  destination?: string,
  onProgress?: (stepId: string, status: 'generating' | 'completed' | 'error', result?: any) => void
) => {
  console.log("Starting batch generation for quote steps...");
  
  // 1. Récupérer ou générer le résumé du voyage pour le contexte
  let tripSummary = "";
  try {
    const { data: trip } = await supabase
      .from('trips')
      .select('trip_summary, quote_description, quote_highlights')
      .eq('id', tripId)
      .single();
    
    if (trip?.trip_summary) {
      tripSummary = trip.trip_summary;
      console.log("✅ Found existing trip summary for context");
    } else {
      console.log("⚠️ No trip summary found. Generating one now for better context...");
      
      if (onProgress) onProgress('trip-summary', 'generating');
      // On lance la génération du résumé via le service existant
      // generateAndParseTripSummary s'occupe déjà de sauvegarder en base
      await generateAndParseTripSummary(tripId);
      if (onProgress) onProgress('trip-summary', 'completed');
      
      // On le relit pour être sûr
      const { data: newTrip } = await supabase
        .from('trips')
        .select('trip_summary')
        .eq('id', tripId)
        .single();
        
      if (newTrip?.trip_summary) {
        tripSummary = newTrip.trip_summary;
        console.log("✅ Trip summary generated and loaded successfully");
      }
    }

    // 1b. Vérifier et générer le contenu du devis (description + highlights) si manquant
    if (!(trip as any)?.quote_description || !(trip as any)?.quote_highlights) {
      console.log("⚠️ Missing quote description or highlights. Generating...");
      // On utilise un ID spécial 'summary' pour le feedback visuel si supporté, sinon c'est transparent
      if (onProgress) onProgress('summary', 'generating');
      await generateQuoteSummary(tripId, tripSummary);
      if (onProgress) onProgress('summary', 'completed');
    }

    // 1c. Vérifier et générer les infos générales (Santé, Formalités) si manquantes
    const { data: generalInfo } = await supabase
      .from('trip_general_info')
      .select('*')
      .eq('trip_id', tripId)
      .maybeSingle();

    const needsGeneralInfo = !generalInfo || (!generalInfo.entry_requirements && !generalInfo.health_requirements);

    if (needsGeneralInfo) {
      console.log("⚠️ General info missing or empty. Generating...");
      if (onProgress) onProgress('general-info', 'generating');
      await generateTripGeneralInfo(tripId);
      if (onProgress) onProgress('general-info', 'completed');
    }

  } catch (e) {
    console.warn("Could not fetch or generate trip summary/info:", e);
    // On continue sans résumé si ça échoue
  }

  // Filtrer les étapes qui ont des segments
  const stepsToGenerate = steps.filter(step => step.segments && step.segments.length > 0);
  
  // Exécuter séquentiellement pour permettre le suivi de progression précis
  // (ou en parallèle avec gestion d'état, mais séquentiel est plus sûr pour les limites de rate)
  for (const step of stepsToGenerate) {
    if (onProgress) onProgress(step.id, 'generating');
    
    try {
      const result = await generateQuoteStepContent(step.id, step.segments, destination, tripSummary);
      if (onProgress) onProgress(step.id, 'completed', result);
    } catch (error) {
      console.error(`Error generating for step ${step.id}:`, error);
      if (onProgress) onProgress(step.id, 'error', error);
    }
  }

  console.log("Batch generation completed.");
};
