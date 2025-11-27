import { useState, useEffect, useRef } from "react";
import { QuoteTemplate } from "./QuoteTemplate";
import { getQuoteData, QuoteData } from "@/services/quoteService";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import "@/styles/quote-pdf.css";

interface QuoteGeneratorProps {
  tripId: string;
  autoGenerate?: boolean;
}

/**
 * Extrait le HTML brut du devis pour export
 */
function getQuoteDOMRawExport(element: HTMLElement): string {
  const clone = element.cloneNode(true) as HTMLElement;
  
  // Supprimer les éléments interactifs
  const selectorsToRemove = [
    'button',
    'input',
    'textarea',
    '.no-print',
    '[contenteditable]',
    '.upload-zone:not(:has(img))', // Garder les zones avec images
  ];
  
  selectorsToRemove.forEach(selector => {
    clone.querySelectorAll(selector).forEach(el => el.remove());
  });
  
  return clone.innerHTML;
}

export function QuoteGenerator({ tripId, autoGenerate }: QuoteGeneratorProps) {
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const templateRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadQuoteData();
  }, [tripId]);

  const loadQuoteData = async () => {
    try {
      setIsLoading(true);
      const data = await getQuoteData(tripId);
      setQuoteData(data);
    } catch (error) {
      console.error("Error loading quote data:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du devis",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportHtml = () => {
    if (!templateRef.current) return;

    try {
      setIsExporting(true);
      
      const html = getQuoteDOMRawExport(templateRef.current);
      
      // Créer un document HTML complet
      const fullHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Devis - ${quoteData?.title || 'Voyage'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
      
      // Télécharger le fichier HTML
      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `devis-${tripId}.html`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export réussi",
        description: "Le fichier HTML a été téléchargé",
      });
    } catch (error) {
      console.error("Error exporting HTML:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'exporter le HTML",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!quoteData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 max-w-md">
          <p className="text-center text-muted-foreground">
            Aucune donnée disponible pour générer le devis
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Devis de voyage</h1>
            <p className="text-muted-foreground">{quoteData.title}</p>
          </div>
          <Button
            onClick={handleExportHtml}
            disabled={isExporting}
            size="lg"
            className="gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Export...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Exporter HTML
              </>
            )}
          </Button>
        </div>

        <div ref={templateRef}>
          <Card className="overflow-hidden">
            <QuoteTemplate data={quoteData} pdfMode={false} />
          </Card>
        </div>
      </div>
    </div>
  );
}
