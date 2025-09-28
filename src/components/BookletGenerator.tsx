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
  Download, 
  FileText,
  Loader2,
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEnrichmentStatus } from "@/hooks/useEnrichmentStatus";
import html2pdf from "html2pdf.js";

interface BookletGeneratorProps {
  tripId: string;
}

export function BookletGenerator({ tripId }: BookletGeneratorProps) {
  const [bookletData, setBookletData] = useState<BookletData | null>(null);
  const [options] = useState<BookletOptions>(defaultBookletOptions);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { toast } = useToast();
  const { status: enrichmentStatus, isLoading: isStatusLoading } = useEnrichmentStatus(tripId);

  useEffect(() => {
    loadBookletData();
  }, [tripId]);

  // Reload data when enrichment is completed
  useEffect(() => {
    if (enrichmentStatus === 'completed') {
      loadBookletData();
    }
  }, [enrichmentStatus]);

  const loadBookletData = async () => {
    try {
      setIsLoading(true);
      const data = await getBookletData(tripId);
      setBookletData(data);
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

      // Configuration PDF
      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `carnet-voyage-${bookletData.tripTitle.toLowerCase().replace(/\s+/g, '-')}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' as const
        }
      };

      // Générer le PDF
      await html2pdf().set(opt).from(element).save();
      
      toast({
        title: "PDF généré",
        description: "Votre carnet de voyage a été téléchargé avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de générer le PDF.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };


  if (isLoading || isStatusLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement des données du voyage...</p>
        </div>
      </div>
    );
  }

  // Show enrichment status for non-completed states
  if (enrichmentStatus !== 'completed') {
    const getStatusDisplay = () => {
      switch (enrichmentStatus) {
        case 'pending':
          return {
            icon: <Clock className="h-8 w-8 text-amber-500" />,
            title: "Enrichissement en attente",
            description: "L'enrichissement des données n'a pas encore commencé. Lancez la génération du carnet pour commencer.",
            action: null
          };
        case 'in_progress':
          return {
            icon: <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />,
            title: "Enrichissement en cours...",
            description: "Les données de voyage sont en cours d'enrichissement avec des informations détaillées.",
            action: null
          };
        case 'failed':
          return {
            icon: <AlertCircle className="h-8 w-8 text-destructive" />,
            title: "Enrichissement échoué",
            description: "Une erreur s'est produite lors de l'enrichissement. Vous pouvez consulter les données de base en attendant.",
            action: (
              <Button onClick={loadBookletData} variant="outline">
                Voir les données de base
              </Button>
            )
          };
        default:
          return null;
      }
    };

    const statusDisplay = getStatusDisplay();
    
    if (statusDisplay && enrichmentStatus !== 'failed') {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4 max-w-md">
            {statusDisplay.icon}
            <h3 className="text-xl font-semibold">{statusDisplay.title}</h3>
            <p className="text-muted-foreground">{statusDisplay.description}</p>
            {statusDisplay.action}
          </div>
        </div>
      );
    }
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-2xl">
              <FileText className="mr-3 h-6 w-6 text-primary" />
              {bookletData.tripTitle}
            </CardTitle>
            {enrichmentStatus === 'completed' && (
              <Badge variant="default" className="flex items-center">
                <CheckCircle className="mr-1 h-3 w-3" />
                Enrichi
              </Badge>
            )}
          </div>
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
          <Button 
            onClick={handleGeneratePdf}
            disabled={isGeneratingPdf}
            className="flex items-center"
          >
            {isGeneratingPdf ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isGeneratingPdf ? 'Génération...' : 'Télécharger PDF'}
          </Button>
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