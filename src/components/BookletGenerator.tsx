import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookletPreview } from "./BookletPreview";
import { 
  getBookletData, 
  BookletData, 
  BookletOptions, 
  defaultBookletOptions
} from "@/services/bookletService";
import {
  getBookletDOMSnapshot,
  debugLogBookletDOM,
  openBookletSnapshotWindow,
  getBookletDOMFullSnapshot,
  getBookletDOMRawExport
} from "@/services/domExtractorService";
import { PDFDownloadButton } from "./pdf/PDFDownloadButton";
import { extractBookletDataFromDOM } from "@/services/domExtractorService";
import { BookletData as PDFBookletData } from "@/components/pdf/BookletPDF";
import { 
  FileText,
  Loader2,
  Calendar,
  MapPin,
  Clock,
  Link
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BookletGeneratorProps {
  tripId: string;
  autoGenerate?: boolean;
}

export function BookletGenerator({ tripId, autoGenerate }: BookletGeneratorProps) {
  const [bookletData, setBookletData] = useState<BookletData | null>(null);
  const [pdfBookletData, setPdfBookletData] = useState<PDFBookletData | null>(null);
  const [options] = useState<BookletOptions>(defaultBookletOptions);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isGeneratingPdfEdge, setIsGeneratingPdfEdge] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadBookletData();
  }, [tripId]);

  const loadBookletData = async () => {
    try {
      setIsLoading(true);
      const data = await getBookletData(tripId);
      setBookletData(data);
      
  // Note: PDF data preparation removed to avoid blocking pipeline. AI enrichment runs separately.
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du voyage.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  const handleGeneratePdfEdge = async () => {
    try {
      setIsGeneratingPdfEdge(true);

      toast({
        title: "Génération PDF",
        description: "Le PDF est en cours de génération...",
      });

      const element = document.getElementById("booklet-content");
      if (!element) throw new Error("Element #booklet-content introuvable");

      const html = getBookletDOMRawExport(element);

      const { data, error } = await supabase.functions.invoke("generate-booklet-pdf", {
        body: { html, tripId },
      });

      if (error) throw error;

      if (!data?.pdf_url) {
        throw new Error(data?.error || "Aucune URL PDF retournée par la fonction");
      }

      // ✅ Télécharger le PDF en binaire pour forcer le téléchargement
      // Bypass navigateur/CDN cache: ajouter un cache-bust param et demander `no-store`
      const fetchUrl = data.pdf_url.includes("?")
        ? `${data.pdf_url}&ts=${Date.now()}`
        : `${data.pdf_url}?ts=${Date.now()}`;
      console.log("🔁 Fetching PDF (cache-bust):", fetchUrl);
      const response = await fetch(fetchUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error("Impossible de télécharger le fichier PDF");
      const blob = await response.blob();

      // ✅ Créer une URL temporaire et déclencher un téléchargement
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `booklet-${tripId}.pdf`;
      document.body.appendChild(link);
      link.click();

      // Nettoyage
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      toast({
        title: "PDF généré",
        description: "Le fichier a été téléchargé avec succès.",
      });
    } catch (err: any) {
      console.error("Erreur génération edge PDF:", err);
      toast({
        title: "Erreur",
        description: err.message || "Impossible de générer le PDF",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdfEdge(false);
    }
  };

  // New async pipeline using pdf-coordinator + pdf-job-status
  const startChunkedPdfGeneration = async () => {
    try {
      setIsGeneratingPdfEdge(true);
      toast({ title: 'Génération PDF', description: 'Le PDF est en cours de génération...' });

      const element = document.getElementById('booklet-content');
      if (!element) throw new Error('Element #booklet-content introuvable');
      const html = getBookletDOMRawExport(element);

      const { data: coordData, error: coordError } = await supabase.functions.invoke('pdf-coordinator', {
        body: { html, tripId },
      });
      if (coordError) throw coordError;
      if (!coordData?.job_id) throw new Error(coordData?.error || 'Aucun job_id retourné par la fonction');
      const jobId: string = coordData.job_id;
      console.log('[BookletGenerator] job created', jobId, coordData);

      const startedAt = Date.now();
      const timeoutMs = 5 * 60 * 1000;
      const intervalMs = 2000;
      let finalUrl: string | null = null;

      while (Date.now() - startedAt < timeoutMs) {
        const { data: statusData, error: statusError } = await supabase.functions.invoke('pdf-job-status', {
          body: { jobId },
        });
        if (statusError) {
          console.warn('[BookletGenerator] status error', statusError);
        } else if (statusData?.success && statusData?.job) {
          const status = statusData.job.status as string;
          const doneUrl = statusData.job.final_pdf_url as string | null;
          console.log(`[BookletGenerator] job ${jobId} status=${status}`);
          if (status === 'completed' && doneUrl) { finalUrl = doneUrl; break; }
          if (status === 'failed') { throw new Error(statusData.job.error || 'Job failed'); }
        }
        await new Promise((r) => setTimeout(r, intervalMs));
      }

      if (!finalUrl) throw new Error('Délai dépassé pour la génération du PDF');

      const fetchUrl = finalUrl.includes('?') ? `${finalUrl}&ts=${Date.now()}` : `${finalUrl}?ts=${Date.now()}`;
      console.log('[BookletGenerator] downloading', fetchUrl);
      const response = await fetch(fetchUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error('Impossible de télécharger le fichier PDF');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `booklet-${tripId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast({ title: 'PDF généré', description: 'Le fichier a été téléchargé avec succès.' });
    } catch (err: any) {
      console.error('Erreur génération edge PDF:', err);
      toast({ title: 'Erreur', description: err.message || 'Impossible de générer le PDF', variant: 'destructive' });
    } finally {
      setIsGeneratingPdfEdge(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec informations du voyage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <FileText className="mr-3 h-6 w-6 text-primary" />
            {bookletData?.tripTitle}
          </CardTitle>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {bookletData?.startDate && (
              <div className="flex items-center">
                <Calendar className="mr-1 h-4 w-4" />
                {bookletData.startDate.toLocaleDateString('fr-FR')}
                {bookletData.endDate &&
                  ` - ${bookletData.endDate.toLocaleDateString('fr-FR')}`}
              </div>
            )}
            {bookletData && (
              <>
                <div className="flex items-center">
                  <Clock className="mr-1 h-4 w-4" />
                  {bookletData.totalDays} jour{bookletData.totalDays > 1 ? 's' : ''}
                </div>
                <div className="flex items-center">
                  <MapPin className="mr-1 h-4 w-4" />
                  {bookletData.segments.length} segment
                  {bookletData.segments.length > 1 ? 's' : ''}
                </div>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {bookletData && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(bookletData.segmentsByType).map(([type, segments]) => (
                <Badge key={type} variant="secondary">
                  {type}: {segments.length}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interface simplifiée */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Carnet de voyage</h3>
          <Button
            onClick={handleGeneratePdfEdge}
            disabled={isGeneratingPdfEdge}
            variant="default"
            className="flex items-center"
          >
            {isGeneratingPdfEdge ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            {isGeneratingPdfEdge ? 'Génération PDF...' : 'Générer PDF'}
          </Button>
        </div>

        {bookletData && (
          <BookletPreview
            data={bookletData}
            options={options}
            tripId={tripId}
            autoGenerate={autoGenerate}
          />
        )}
      </div>
    </div>
  );
}
