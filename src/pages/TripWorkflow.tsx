import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import FileUploadNew from "@/components/FileUploadNew";
import TravelTimelineNew from "@/components/TravelTimelineNew";
import { Card, CardContent } from "@/components/ui/card";

enum Phase {
  LOADING = "loading",
  UPLOAD = "upload",
  TIMELINE = "timeline",
  VALIDATED = "validated",
}

export default function TripWorkflow() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentPhase, setCurrentPhase] = useState<Phase>(Phase.LOADING);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tripTitle, setTripTitle] = useState<string>("");

  useEffect(() => {
    if (!tripId) {
      toast({
        title: "Erreur",
        description: "ID du voyage manquant",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    determinePhase();
  }, [tripId]);

  const determinePhase = async () => {
    if (!tripId) return;

    try {
      // 1. Load trip
      const { data: trip, error: tripError } = await supabase
        .from("trips")
        .select("*")
        .eq("id", tripId)
        .single();

      if (tripError || !trip) {
        toast({
          title: "Erreur",
          description: "Voyage introuvable",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setTripTitle(trip.title || "Voyage sans titre");

      // If trip is validated, redirect to booklet
      if (trip.status === "validated") {
        navigate(`/booklet?tripId=${tripId}`);
        return;
      }

      // 2. Check for documents
      const { data: docs, error: docsError } = await supabase
        .from("documents")
        .select("*")
        .eq("trip_id", tripId);

      if (docsError || !docs || docs.length === 0) {
        setCurrentPhase(Phase.UPLOAD);
        return;
      }

      // 3. Check for validated segments
      const { data: segments, error: segmentsError } = await supabase
        .from("travel_segments")
        .select("*")
        .eq("trip_id", tripId)
        .eq("validated", true);

      if (segmentsError || !segments || segments.length === 0) {
        setCurrentPhase(Phase.TIMELINE);
        return;
      }

      // 4. Check for travel steps
      const { data: steps, error: stepsError } = await supabase
        .from("travel_steps")
        .select("*")
        .eq("trip_id", tripId);

      if (stepsError || !steps || steps.length === 0) {
        setCurrentPhase(Phase.TIMELINE);
        return;
      }

      // If we reach here, everything is complete
      navigate(`/booklet?tripId=${tripId}`);
    } catch (error) {
      console.error("Error determining phase:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le voyage",
        variant: "destructive",
      });
      navigate("/");
    }
  };

  const handleFilesProcessed = () => {
    setCurrentPhase(Phase.TIMELINE);
    toast({
      title: "Documents traités",
      description: "Passons à la validation des segments",
    });
  };

  const handleSegmentsValidated = async () => {
    if (!tripId) return;

    try {
      // Update trip status to validated
      const { error } = await supabase
        .from("trips")
        .update({ status: "validated" })
        .eq("id", tripId);

      if (error) throw error;

      toast({
        title: "Voyage validé",
        description: "Redirection vers la génération du carnet...",
      });

      // Redirect to booklet
      navigate(`/booklet?tripId=${tripId}`);
    } catch (error) {
      console.error("Error validating trip:", error);
      toast({
        title: "Erreur",
        description: "Impossible de valider le voyage",
        variant: "destructive",
      });
    }
  };

  const getPhaseIndicator = () => {
    const phases = [
      { key: Phase.UPLOAD, label: "Upload", active: currentPhase === Phase.UPLOAD },
      { key: Phase.TIMELINE, label: "Validation", active: currentPhase === Phase.TIMELINE },
      { key: Phase.VALIDATED, label: "Génération", active: currentPhase === Phase.VALIDATED },
    ];

    return (
      <div className="flex items-center justify-center space-x-2 mb-6">
        {phases.map((phase, index) => (
          <div key={phase.key} className="flex items-center">
            <div
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                phase.active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {phase.label}
            </div>
            {index < phases.length - 1 && (
              <div className="w-8 h-0.5 bg-border mx-2" />
            )}
          </div>
        ))}
      </div>
    );
  };

  if (currentPhase === Phase.LOADING) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Chargement du voyage...</p>
            </div>
          </CardContent>
        </Card>
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
                  {tripTitle}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Configuration de votre voyage
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Phase Indicator */}
      <div className="container mx-auto px-4 py-6">
        {getPhaseIndicator()}
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-8">
        {currentPhase === Phase.UPLOAD && (
          <FileUploadNew
            tripId={tripId || null}
            onFilesProcessed={handleFilesProcessed}
            onProcessingUpdate={setIsProcessing}
          />
        )}

        {currentPhase === Phase.TIMELINE && (
          <TravelTimelineNew
            tripId={tripId}
            onValidated={handleSegmentsValidated}
          />
        )}
      </main>
    </div>
  );
}
