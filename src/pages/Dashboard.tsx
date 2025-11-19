import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { UserMenu } from '@/components/auth/UserMenu';
import { CreateTripDialog } from '@/components/CreateTripDialog';
import { DeleteTripDialog } from '@/components/DeleteTripDialog';
import { getUserTrips, deleteTrip } from '@/services/tripService';
import { createTrip } from '@/services/documentService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Plane, 
  Calendar,
  MapPin,
  Loader2,
  FileText,
  ArrowRight,
  Zap,
  Search,
  CheckCircle2,
  FileEdit,
  TrendingUp,
  Trash2,
  MoreVertical
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Trip = Tables<'trips'>;

type TripPhase = 'upload' | 'timeline' | 'validated';

interface TripWithPhase extends Trip {
  currentPhase: TripPhase;
  segmentCount?: number;
  documentCount?: number;
  hasPdf?: boolean;
  pdfUrl?: string | null;
}

export default function Dashboard() {
  const [trips, setTrips] = useState<TripWithPhase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [isLoadingDevMode, setIsLoadingDevMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'validated'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<TripWithPhase | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    setIsLoading(true);
    try {
      const userTrips = await getUserTrips();
      
      // Enrichir chaque voyage avec sa phase et des stats
      const enrichedTrips = await Promise.all(
        userTrips.map(async (trip) => {
          // Compter les segments
          const { count: segmentCount } = await supabase
            .from('travel_segments')
            .select('*', { count: 'exact', head: true })
            .eq('trip_id', trip.id);

          // Compter les documents
          const { count: documentCount } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('trip_id', trip.id);

          // Déterminer la phase actuelle
          let currentPhase: TripPhase = 'upload';
          
          if (trip.status === 'validated') {
            currentPhase = 'validated';
          } else if (segmentCount && segmentCount > 0) {
            currentPhase = 'timeline';
          } else if (documentCount && documentCount > 0) {
            currentPhase = 'upload';
          }

          return {
            ...trip,
            currentPhase,
            segmentCount: segmentCount || 0,
            documentCount: documentCount || 0,
            hasPdf: !!trip.last_pdf_url,
            pdfUrl: trip.last_pdf_url,
          };
        })
      );

      setTrips(enrichedTrips);
    } catch (error) {
      console.error('Failed to load trips:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos voyages",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewTrip = async (data: { title: string; destination_zone: string }) => {
    setIsCreatingTrip(true);
    try {
      const result = await createTrip(data);
      if (result.success && result.trip_id) {
        toast({
          title: "Voyage créé",
          description: `"${data.title}" - Redirection vers l'upload de documents...`,
        });
        setShowCreateDialog(false);
        navigate(`/trip/create?tripId=${result.trip_id}`);
      } else {
        throw new Error(result.error || 'Failed to create trip');
      }
    } catch (error) {
      console.error('Failed to create trip:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le voyage",
        variant: "destructive",
      });
    } finally {
      setIsCreatingTrip(false);
    }
  };

  const handleDevMode = async () => {
    setIsLoadingDevMode(true);
    try {
      const { data, error } = await supabase
        .from('travel_segments')
        .select('trip_id')
        .not('trip_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0 && data[0].trip_id) {
        toast({
          title: "Mode Dev activé",
          description: "Chargement du dernier voyage...",
        });
        navigate(`/trip/${data[0].trip_id}`);
      } else {
        toast({
          title: "Aucun voyage trouvé",
          description: "Créez d'abord un voyage avec des segments",
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
      setIsLoadingDevMode(false);
    }
  };

  const handleTripClick = (trip: TripWithPhase) => {
    if (trip.status === 'validated') {
      navigate(`/booklet?tripId=${trip.id}`);
    } else {
      navigate(`/trip/${trip.id}`);
    }
  };

  const handleDeleteClick = (trip: TripWithPhase, e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher la navigation
    setTripToDelete(trip);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!tripToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteTrip(tripToDelete.id);
      
      if (result.success) {
        toast({
          title: "Voyage supprimé",
          description: `"${tripToDelete.title || 'Sans titre'}" a été supprimé définitivement`,
        });
        
        // Recharger la liste des voyages
        await loadTrips();
        
        // Fermer le dialog
        setShowDeleteDialog(false);
        setTripToDelete(null);
      } else {
        throw new Error(result.error || 'Échec de la suppression');
      }
    } catch (error) {
      console.error('Failed to delete trip:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le voyage",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getPhaseLabel = (phase: TripPhase): string => {
    const labels = {
      upload: 'Upload de documents',
      timeline: 'Édition de la chronologie',
      validated: 'Carnet finalisé',
    };
    return labels[phase];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Filtrage des voyages
  const filteredTrips = trips.filter(trip => {
    // Filtre par statut
    if (statusFilter !== 'all') {
      if (statusFilter === 'validated' && trip.status !== 'validated') return false;
      if (statusFilter === 'draft' && trip.status !== 'draft') return false;
    }

    // Filtre par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const titleMatch = trip.title?.toLowerCase().includes(query);
      const destinationMatch = trip.destination_zone?.toLowerCase().includes(query);
      return titleMatch || destinationMatch;
    }

    return true;
  });

  // Statistiques
  const stats = {
    total: trips.length,
    validated: trips.filter(t => t.status === 'validated').length,
    draft: trips.filter(t => t.status === 'draft').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Mes carnets de voyage
            </h1>
            <p className="text-muted-foreground">
              Gérez et créez vos carnets de voyage personnalisés
            </p>
          </div>
          <UserMenu />
        </header>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Total de voyages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Voyages validés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.validated}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileEdit className="h-4 w-4" />
                Voyages en cours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats.draft}</div>
            </CardContent>
          </Card>
        </div>

        {/* Recherche et filtres */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher un voyage par titre ou destination..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('all')}
              size="sm"
            >
              Tous ({stats.total})
            </Button>
            <Button
              variant={statusFilter === 'draft' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('draft')}
              size="sm"
            >
              Brouillon ({stats.draft})
            </Button>
            <Button
              variant={statusFilter === 'validated' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('validated')}
              size="sm"
            >
              Validés ({stats.validated})
            </Button>
          </div>
        </div>

        {/* Actions principales */}
        <div className="flex gap-4 mb-8">
          <Button
            onClick={() => setShowCreateDialog(true)}
            disabled={isCreatingTrip}
            size="lg"
            className="flex-1 max-w-sm"
          >
            {isCreatingTrip ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Création en cours...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-5 w-5" />
                Créer un nouveau voyage
              </>
            )}
          </Button>

          <Button
            onClick={handleDevMode}
            disabled={isLoadingDevMode}
            variant="outline"
            size="lg"
          >
            {isLoadingDevMode ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Chargement...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-5 w-5" />
                Mode Dev
              </>
            )}
          </Button>
        </div>

        {/* Liste des voyages */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredTrips.length === 0 && searchQuery ? (
          <Card className="text-center py-12">
            <CardContent>
              <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="text-2xl font-semibold mb-2">Aucun voyage trouvé</h2>
              <p className="text-muted-foreground mb-6">
                Aucun résultat pour "{searchQuery}"
              </p>
              <Button variant="outline" onClick={() => setSearchQuery('')}>
                Effacer la recherche
              </Button>
            </CardContent>
          </Card>
        ) : trips.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Plane className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="text-2xl font-semibold mb-2">Aucun voyage pour le moment</h2>
              <p className="text-muted-foreground mb-6">
                Commencez par créer votre premier carnet de voyage !
              </p>
              <Button onClick={() => setShowCreateDialog(true)} disabled={isCreatingTrip}>
                <Plus className="mr-2 h-4 w-4" />
                Créer mon premier voyage
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrips.map((trip) => (
              <Card
                key={trip.id}
                className="hover:shadow-lg transition-shadow cursor-pointer group relative"
                onClick={() => handleTripClick(trip)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant={trip.status === 'validated' ? 'default' : 'secondary'}>
                      {trip.status === 'validated' ? 'Validé' : 'Brouillon'}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => handleDeleteClick(trip, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="line-clamp-1">
                    {trip.title || 'Sans titre'}
                  </CardTitle>
                  {trip.destination_zone && (
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {trip.destination_zone}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>
                        {trip.documentCount} document{trip.documentCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {trip.segmentCount > 0 && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {trip.segmentCount} segment{trip.segmentCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                    {trip.status === 'draft' && (
                      <div className="text-xs mt-2">
                        Phase: {getPhaseLabel(trip.currentPhase)}
                      </div>
                    )}
                    <div className="text-xs">
                      Créé le {formatDate(trip.created_at)}
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-2">
                  {trip.status === 'validated' ? (
                    <>
                      <Button className="w-full group-hover:bg-primary/90" size="sm">
                        Voir le carnet
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      {trip.hasPdf && trip.pdfUrl && (
                        <Button
                          variant="outline"
                          className="w-full"
                          size="sm"
                          asChild
                        >
                          <a
                            href={trip.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Télécharger le PDF
                          </a>
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button variant="outline" className="w-full" size="sm">
                      Continuer
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Dialog de création de voyage */}
        <CreateTripDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onConfirm={handleCreateNewTrip}
        />

        {/* Dialog de suppression de voyage */}
        <DeleteTripDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={handleConfirmDelete}
          tripTitle={tripToDelete?.title}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
}
