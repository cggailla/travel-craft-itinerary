import { useState, useEffect, useRef } from "react";
import { QuoteTemplate } from "./QuoteTemplate";
import { getQuoteData, updateQuotePdfUrl, QuoteData } from "@/services/quoteService";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Download, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateAllQuoteDescriptions } from "@/services/quoteAIService";
import "@/styles/quote-pdf.css";

interface QuoteGeneratorProps {
  tripId: string;
  autoGenerate?: boolean;
}

export function QuoteGenerator({ tripId, autoGenerate }: QuoteGeneratorProps) {
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingDescriptions, setIsGeneratingDescriptions] = useState(false);
  const templateRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadQuoteData();
  }, [tripId]);

  // Auto-génération si demandée via le paramètre URL
  useEffect(() => {
    if (autoGenerate && quoteData && !isGenerating) {
      console.log('🚀 Auto-génération du devis déclenchée');
      handleGeneratePdf();
      
      // Nettoyer l'URL pour éviter de re-déclencher au refresh
      const url = new URL(window.location.href);
      url.searchParams.delete('autoGenerate');
      window.history.replaceState({}, '', url);
    }
  }, [autoGenerate, quoteData]);

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

  const handleGenerateDescriptions = async () => {
    if (!tripId) return;

    setIsGeneratingDescriptions(true);
    try {
      const results = await generateAllQuoteDescriptions(
        tripId,
        (stepId, status, error) => {
          if (status === 'completed') {
            console.log(`Description generated for step ${stepId}`);
          } else if (status === 'error') {
            console.error(`Error generating description for step ${stepId}:`, error);
          }
        }
      );

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        toast({
          title: "Descriptions générées",
          description: `${successCount} description(s) créée(s)${failCount > 0 ? `, ${failCount} échec(s)` : ''}`,
        });
        
        // Reload quote data to show new descriptions
        await loadQuoteData();
      } else {
        throw new Error("Aucune description n'a pu être générée");
      }
    } catch (error) {
      console.error('Error generating descriptions:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de générer les descriptions",
      });
    } finally {
      setIsGeneratingDescriptions(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!quoteData || !templateRef.current) return;

    try {
      setIsGenerating(true);
      
      // Get the HTML content from the template
      const htmlContent = templateRef.current.innerHTML;
      
      // Wrap HTML with necessary styles and structure for PDF
      const fullHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              @page { size: A4 landscape; margin: 0; }
              body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
              .quote-slide { 
                width: 297mm; 
                height: 210mm; 
                page-break-after: always;
                padding: 20mm;
                box-sizing: border-box;
              }
              .quote-slide:last-child { page-break-after: auto; }
              img { max-width: 100%; height: auto; }
              button, .no-print { display: none !important; }
            </style>
          </head>
          <body>
            \${htmlContent}
          </body>
        </html>
      `;
      
      // Call landscape PDF edge function
      const { data, error } = await supabase.functions.invoke("generate-quote-pdf-landscape", {
        body: { tripId, htmlContent: fullHtml },
      });

      if (error) throw error;

      if (data?.pdfUrl) {
        await updateQuotePdfUrl(tripId, data.pdfUrl);
        
        // Open PDF in new tab
        window.open(data.pdfUrl, "_blank");
        
        toast({
          title: "Succès",
          description: "Le devis PDF a été généré avec succès",
        });
      }
    } catch (error) {
      console.error("Error generating quote PDF:", error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le devis PDF",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
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
          <div className="flex gap-3">
            <Button
              onClick={handleGenerateDescriptions}
              disabled={isGeneratingDescriptions}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              {isGeneratingDescriptions ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Générer les descriptions
                </>
              )}
            </Button>
            <Button
              onClick={handleGeneratePdf}
              disabled={isGenerating}
              size="lg"
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Télécharger le PDF
                </>
              )}
            </Button>
          </div>
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
