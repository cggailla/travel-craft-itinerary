import { useSearchParams, useNavigate } from "react-router-dom";
import { OutputTypeChoice } from "@/components/OutputTypeChoice";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { UserMenu } from "@/components/auth/UserMenu";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function OutputChoice() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tripId = searchParams.get("tripId");
  const { toast } = useToast();

  useEffect(() => {
    if (!tripId) {
      toast({
        title: "Erreur",
        description: "ID du voyage manquant",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [tripId, navigate, toast]);

  if (!tripId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <UserMenu />
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-12">
        <OutputTypeChoice 
          tripId={tripId} 
          onChoiceSelected={() => {}} // Non utilisé car on navigue via window.location.href
        />
      </main>
    </div>
  );
}
