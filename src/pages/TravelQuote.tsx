import { useSearchParams, useNavigate } from "react-router-dom";
import { QuoteGenerator } from "@/components/QuoteGenerator";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { UserMenu } from "@/components/auth/UserMenu";

export default function TravelQuote() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tripId = searchParams.get("tripId");

  if (!tripId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">ID de voyage manquant</p>
          <Button onClick={() => navigate("/")}>
            Retour au tableau de bord
          </Button>
        </div>
      </div>
    );
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
      
      <QuoteGenerator tripId={tripId} />
    </div>
  );
}
