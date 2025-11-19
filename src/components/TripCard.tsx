import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MapPin, Calendar, Eye, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Trip } from "@/services/tripService";
import { useNavigate } from "react-router-dom";

interface TripCardProps {
  trip: Trip;
  onDelete: (tripId: string) => void;
}

export function TripCard({ trip, onDelete }: TripCardProps) {
  const navigate = useNavigate();

  const handleView = () => {
    navigate(`/?tripId=${trip.id}`);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'validated':
        return 'default';
      case 'draft':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'validated':
        return 'Validé';
      case 'draft':
        return 'Brouillon';
      default:
        return status;
    }
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg line-clamp-1">
            {trip.title || 'Voyage sans titre'}
          </CardTitle>
          <Badge variant={getStatusVariant(trip.status)}>
            {getStatusLabel(trip.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {trip.destination_zone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="line-clamp-1">{trip.destination_zone}</span>
          </div>
        )}
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Créé le {format(new Date(trip.created_at), 'dd MMM yyyy', { locale: fr })}</span>
        </div>

        <div className="flex gap-2 pt-2">
          <Button 
            onClick={handleView}
            className="flex-1"
            size="sm"
          >
            <Eye className="h-4 w-4 mr-1" />
            Voir
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer le voyage</AlertDialogTitle>
                <AlertDialogDescription>
                  Êtes-vous sûr de vouloir supprimer "{trip.title || 'ce voyage'}" ? 
                  Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => onDelete(trip.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
