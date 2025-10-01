import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { BookletGenerator } from "@/components/BookletGenerator";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function TravelBooklet() {
  const [searchParams] = useSearchParams();
  const [tripId, setTripId] = useState<string | null>(searchParams.get("tripId"));
  const [isLoadingTrip, setIsLoadingTrip] = useState(!searchParams.get("tripId"));
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const loadLatestTrip = async () => {
      if (tripId) return; // Si on a déjà un tripId, on ne charge pas

      setIsLoadingTrip(true);
      try {
        const { data: segs, error } = await supabase
          .from('travel_segments')
          .select('trip_id, created_at')
          .not('trip_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (segs && segs.length > 0 && segs[0].trip_id) {
          const latestTripId = segs[0].trip_id as string;
          setTripId(latestTripId);
          // Mettre à jour l'URL sans recharger la page
          navigate(`/booklet?tripId=${latestTripId}`, { replace: true });
        } else {
          toast({
            title: "Aucun voyage trouvé",
            description: "Créez d'abord un voyage pour voir le carnet",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Failed to load latest trip:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger le dernier voyage",
          variant: "destructive",
        });
      } finally {
        setIsLoadingTrip(false);
      }
    };

    loadLatestTrip();
  }, [tripId, toast, navigate]);

  if (isLoadingTrip) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="mx-auto h-16 w-16 text-primary animate-spin" />
          <h2 className="text-2xl font-semibold text-foreground">
            Chargement du carnet de voyage...
          </h2>
          <p className="text-muted-foreground">
            Récupération du dernier voyage
          </p>
        </div>
      </div>
    );
  }

  if (!tripId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <FileText className="mx-auto h-16 w-16 text-muted-foreground" />
          <h2 className="text-2xl font-semibold text-foreground">
            Aucun voyage trouvé
          </h2>
          <p className="text-muted-foreground">
            Créez d'abord un voyage pour voir le carnet
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