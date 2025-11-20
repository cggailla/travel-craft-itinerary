import { useState, useEffect } from "react";
import { QuotePreview } from "./QuotePreview";
import { getQuoteData, updateQuotePdfUrl, QuoteData } from "@/services/quoteService";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { FileText, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QuoteGeneratorProps {
  tripId: string;
  autoGenerate?: boolean;
}

export function QuoteGenerator({ tripId, autoGenerate }: QuoteGeneratorProps) {
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
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

  const handleGeneratePdf = async () => {
    if (!quoteData) return;

    try {
      setIsGenerating(true);
      
      // Appeler l'edge function pour générer le PDF
      const { data, error } = await supabase.functions.invoke("generate-quote-pdf", {
        body: { tripId, quoteData },
      });

      if (error) throw error;

      if (data?.pdfUrl) {
        await updateQuotePdfUrl(tripId, data.pdfUrl);
        
        // Télécharger le PDF
        window.open(data.pdfUrl, "_blank");
        
        toast({
          title: "Succès",
          description: "Le devis a été généré avec succès",
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

        <Card className="overflow-hidden">
          <QuotePreview data={quoteData} />
        </Card>
      </div>
    </div>
  );
}
