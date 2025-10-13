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
}

export function BookletGenerator({ tripId }: BookletGeneratorProps) {
  const [bookletData, setBookletData] = useState<BookletData | null>(null);
  const [pdfBookletData, setPdfBookletData] = useState<PDFBookletData | null>(null);
  const [options] = useState<BookletOptions>(defaultBookletOptions);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
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

  const handleExtractPdfData = () => {
    try {
      const element = document.getElementById('booklet-content');
      const extracted = extractBookletDataFromDOM(element);
      setPdfBookletData(extracted);
      
      toast({
        title: "Données extraites",
        description: "Le PDF est prêt à être téléchargé.",
      });
    } catch (error) {
      console.error('Erreur extraction données:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'extraire les données du carnet.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateShareableLink = async () => {
    try {
      setIsGeneratingLink(true);
      
      toast({
        title: "Génération en cours",
        description: "Création du lien partageable...",
      });

      const { data, error } = await supabase.functions.invoke('generate-static-booklet', {
        body: { tripId },
      });

      if (error) throw error;

      if (data?.url) {
        await navigator.clipboard.writeText(data.url);
        
        toast({
          title: "Lien généré avec succès!",
          description: "Le lien a été copié dans votre presse-papiers",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error generating shareable link:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le lien partageable",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement des données du voyage...</p>
        </div>
      </div>
    );
  }

  if (!bookletData) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">Aucune donnée disponible</h3>
        <p className="text-muted-foreground mb-4">
          Aucun segment validé trouvé pour ce voyage.
        </p>
        <Button onClick={loadBookletData} variant="outline">
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec informations du voyage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <FileText className="mr-3 h-6 w-6 text-primary" />
            {bookletData.tripTitle}
          </CardTitle>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {bookletData.startDate && (
              <div className="flex items-center">
                <Calendar className="mr-1 h-4 w-4" />
                {bookletData.startDate.toLocaleDateString('fr-FR')}
                {bookletData.endDate && ` - ${bookletData.endDate.toLocaleDateString('fr-FR')}`}
              </div>
            )}
            <div className="flex items-center">
              <Clock className="mr-1 h-4 w-4" />
              {bookletData.totalDays} jour{bookletData.totalDays > 1 ? 's' : ''}
            </div>
            <div className="flex items-center">
              <MapPin className="mr-1 h-4 w-4" />
              {bookletData.segments.length} segment{bookletData.segments.length > 1 ? 's' : ''}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(bookletData.segmentsByType).map(([type, segments]) => (
              <Badge key={type} variant="secondary">
                {type}: {segments.length}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Interface simplifiée */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Carnet de voyage</h3>
          <div className="flex gap-2">
            {!pdfBookletData ? (
              <Button 
                onClick={handleExtractPdfData}
                variant="default"
                className="flex items-center"
              >
                Préparer le PDF
              </Button>
            ) : (
              <PDFDownloadButton bookletData={pdfBookletData} />
            )}
            
            <Button
              onClick={async () => {
                try {
                  const element = document.getElementById('booklet-content');
                  if (!element) throw new Error("Element #booklet-content introuvable");
                  const html = element.outerHTML;

                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(html);
                  } else {
                    // Fallback for older browsers
                    const ta = document.createElement('textarea');
                    ta.value = html;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                  }

                  toast({
                    title: "Copié",
                    description: "Le HTML complet du carnet a été copié dans le presse-papiers.",
                  });
                } catch (err) {
                  console.error('Erreur copie HTML:', err);
                  toast({
                    title: "Erreur",
                    description: "Impossible de copier le HTML du carnet.",
                    variant: 'destructive',
                  });
                }
              }}
              variant="outline"
              className="flex items-center"
            >
              Copier l'HTML
            </Button>

            <Button 
              onClick={handleGenerateShareableLink}
              disabled={isGeneratingLink}
              variant="secondary"
              className="flex items-center"
            >
              {isGeneratingLink ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Link className="mr-2 h-4 w-4" />
              )}
              {isGeneratingLink ? 'Génération...' : 'Générer lien'}
            </Button>
          </div>
        </div>
        
        <BookletPreview 
          data={bookletData} 
          options={options} 
          tripId={tripId}
        />
      </div>
    </div>
  );
}