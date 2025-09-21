import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { BookletGenerator } from "@/components/BookletGenerator";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TravelBooklet() {
  const [searchParams] = useSearchParams();
  const tripId = searchParams.get("tripId");
  const { toast } = useToast();

  useEffect(() => {
    if (!tripId) {
      toast({
        title: "Erreur",
        description: "ID du voyage manquant. Redirection vers l'accueil...",
        variant: "destructive",
      });
    }
  }, [tripId, toast]);

  if (!tripId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <FileText className="mx-auto h-16 w-16 text-muted-foreground" />
          <h2 className="text-2xl font-semibold text-foreground">
            Voyage introuvable
          </h2>
          <p className="text-muted-foreground">
            L'identifiant du voyage est manquant ou invalide.
          </p>
          <Link to="/">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à l'accueil
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center">
                  <FileText className="mr-2 h-6 w-6 text-primary" />
                  Générateur de Carnet de Voyage
                </h1>
                <p className="text-sm text-muted-foreground">
                  Créez et personnalisez votre carnet de voyage
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {tripId && <BookletGenerator tripId={tripId} />}
      </main>
    </div>
  );
}