import { supabase } from "@/integrations/supabase/client";
import { requireAuth } from "@/utils/authHelpers";

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

  // 2. Récupérer les étapes avec leur ai_content
  const { data: steps, error: stepsError } = await supabase
    .from("travel_steps")
    .select("*, ai_content")
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

      const aiContent = step.ai_content as { description?: string; quoteDescription?: string } | null;
      
      return {
        id: step.id,
        title: step.step_title,
        date: step.start_date,
        location: step.primary_location || "",
        description: aiContent?.description,
        quoteDescription: aiContent?.quoteDescription,
        segments,
      };
    })
  );

  // 4. Récupérer les infos générales si disponibles
  const { data: generalInfo } = await supabase
    .from("trip_general_info")
    .select("*")
    .eq("trip_id", tripId)
    .single();

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
