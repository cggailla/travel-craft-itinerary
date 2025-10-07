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
  getPDFBookletData, 
  PDFBookletData 
} from "@/services/pdfBookletService";
import { PDFDownloadButton } from "@/components/pdf/PDFDownloadButton";
import { 
  Download, 
  FileText,
  Loader2,
  Calendar,
  MapPin,
  Clock,
  Link
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import html2pdf from "html2pdf.js";
import { optimizeAllImages, restoreOriginalImages } from "@/utils/imageOptimizer";

interface BookletGeneratorProps {
  tripId: string;
}

export function BookletGenerator({ tripId }: BookletGeneratorProps) {
  const [bookletData, setBookletData] = useState<BookletData | null>(null);
  const [pdfBookletData, setPdfBookletData] = useState<PDFBookletData | null>(null);
  const [options] = useState<BookletOptions>(defaultBookletOptions);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
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
      
      // Charger aussi les données pour le PDF react-pdf
      const pdfData = await getPDFBookletData(tripId);
      setPdfBookletData(pdfData);
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

  const handleGeneratePdf = async () => {
    if (!bookletData) return;
    
    try {
      setIsGeneratingPdf(true);
      
      // Récupérer l'élément HTML à convertir
      const element = document.getElementById('booklet-content');
      if (!element) {
        throw new Error('Contenu du carnet introuvable');
      }

      toast({
        title: "Optimisation en cours",
        description: "Préparation des images...",
      });

      // Optimiser les images avant génération
      await optimizeAllImages(element);

      // Masquer uniquement les zones d'upload vides (data-has-image="false")
      const emptyUploadZones = element.querySelectorAll('.no-print[data-has-image="false"]');
      emptyUploadZones.forEach((el) => {
        (el as HTMLElement).style.display = 'none';
      });

      // Afficher les éléments .print-only
      const printOnlyElements = element.querySelectorAll('.print-only');
      printOnlyElements.forEach((el) => {
        (el as HTMLElement).style.display = 'block';
      });

      toast({
        title: "Génération en cours",
        description: "Création du PDF...",
      });

      // Configuration PDF optimisée
      const opt = {
        margin: [15, 12, 15, 12] as [number, number, number, number],
        filename: `carnet-voyage-${bookletData.tripTitle.toLowerCase().replace(/\s+/g, '-')}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.90 }, // Réduit légèrement pour perf
        html2canvas: { 
          scale: 1.75, // ✅ Réduit de 2.5 à 1.75 pour réduire mémoire
          useCORS: true,
          logging: false,
          letterRendering: true,
          allowTaint: false,
          imageTimeout: 15000,
          windowWidth: 1200
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' as const,
          compress: true,
          precision: 2
        },
        pagebreak: { 
          mode: 'css', // ✅ Uniquement CSS (pas de 'legacy')
          before: '.section-break',
          avoid: '.keep-together', // ✅ Simplifié (retiré .step-header)
          after: []
        }
      };

      // Générer le PDF
      await html2pdf().set(opt).from(element).save();

      // Restaurer les images originales
      restoreOriginalImages(element);

      // Réafficher les zones d'upload vides après génération
      emptyUploadZones.forEach((el) => {
        (el as HTMLElement).style.display = '';
      });

      // Masquer à nouveau les éléments .print-only
      printOnlyElements.forEach((el) => {
        (el as HTMLElement).style.display = '';
      });
      
      toast({
        title: "PDF généré",
        description: "Votre carnet de voyage a été téléchargé avec succès.",
      });
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      
      // En cas d'erreur, restaurer l'affichage normal
      const element = document.getElementById('booklet-content');
      if (element) {
        restoreOriginalImages(element);
        
        const emptyUploadZones = element.querySelectorAll('.no-print[data-has-image="false"]');
        emptyUploadZones.forEach((el) => {
          (el as HTMLElement).style.display = '';
        });
        
        const printOnlyElements = element.querySelectorAll('.print-only');
        printOnlyElements.forEach((el) => {
          (el as HTMLElement).style.display = '';
        });
      }
      
      toast({
        title: "Erreur",
        description: "Impossible de générer le PDF. Essayez de réduire le nombre d'images.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
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
            {/* Nouveau bouton PDF avec react-pdf */}
            {pdfBookletData && (
              <PDFDownloadButton 
                bookletData={pdfBookletData}
                disabled={isGeneratingPdf}
              />
            )}
            
            {/* Ancien bouton PDF (html2pdf) - pour comparaison */}
            <Button 
              onClick={handleGeneratePdf}
              disabled={isGeneratingPdf}
              variant="outline"
              className="flex items-center"
            >
              {isGeneratingPdf ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {isGeneratingPdf ? 'Génération...' : 'PDF (ancien)'}
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