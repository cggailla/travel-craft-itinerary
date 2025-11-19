import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserMenu } from '@/components/auth/UserMenu';
import { TripCard } from '@/components/TripCard';
import { DashboardStats } from '@/components/DashboardStats';
import { Plus, Search, Loader2, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getUserTrips, deleteTrip, createTrip as createTripService, type Trip } from '@/services/tripService';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function IndexNew() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'validated'>('all');
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [isLoadingLatestTrip, setIsLoadingLatestTrip] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTripTitle, setNewTripTitle] = useState('');
  const [newTripDestination, setNewTripDestination] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Load trips on mount
  useEffect(() => {
    loadTrips();
  }, []);

  // Filter trips when search or filter changes
  useEffect(() => {
    filterTrips();
  }, [searchQuery, statusFilter, trips]);

  // Check if tripId is provided in URL params (direct access to a trip)
  useEffect(() => {
    const urlTripId = searchParams.get('tripId');
    if (urlTripId) {
      navigate(`/booklet?tripId=${urlTripId}`);
    }
  }, [searchParams, navigate]);

  const loadTrips = async () => {
    setIsLoading(true);
    try {
      const userTrips = await getUserTrips();
      setTrips(userTrips);
    } catch (error) {
      console.error('Error loading trips:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les voyages",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterTrips = () => {
    let filtered = [...trips];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(trip => trip.status === statusFilter);
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(trip => 
        trip.title?.toLowerCase().includes(query) ||
        trip.destination_zone?.toLowerCase().includes(query)
      );
    }

    setFilteredTrips(filtered);
  };

  const handleCreateTrip = async () => {
    if (!newTripTitle.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un titre",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingTrip(true);
    try {
      const result = await createTripService({
        title: newTripTitle,
        destination_zone: newTripDestination || undefined,
      });

      if (result.success && result.trip) {
        toast({
          title: "Voyage créé",
          description: "Vous pouvez maintenant ajouter des documents",
        });
        setIsDialogOpen(false);
        setNewTripTitle('');
        setNewTripDestination('');
        
        // Navigate to the workflow page
        navigate(`/trip/${result.trip.id}`);
        navigate(`/booklet?tripId=${result.trip.id}`);
      } else {
        throw new Error(result.error || 'Erreur lors de la création du voyage');
      }
    } catch (error) {
      console.error('Error creating trip:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de créer le voyage",
        variant: "destructive",
      });
    } finally {
      setIsCreatingTrip(false);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    try {
      const result = await deleteTrip(tripId);
      
      if (result.success) {
        toast({
          title: "Voyage supprimé",
          description: "Le voyage a été supprimé avec succès",
        });
        // Reload trips
        loadTrips();
      } else {
        throw new Error(result.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Error deleting trip:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer le voyage",
        variant: "destructive",
      });
    }
  };

  const loadLatestTrip = async () => {
    setIsLoadingLatestTrip(true);
    try {
      const { data: latestTrip, error } = await supabase
        .from('trips')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      if (latestTrip) {
        navigate(`/trip/${latestTrip.id}`);
      } else {
        toast({
          title: "Aucun voyage",
          description: "Aucun voyage trouvé",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading latest trip:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le dernier voyage",
        variant: "destructive",
      });
    } finally {
      setIsLoadingLatestTrip(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Carnets de Voyage</h1>
              <p className="text-sm text-muted-foreground">Gérez vos voyages</p>
            </div>
          </div>
          <UserMenu />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Welcome Section */}
        <div>
          <h2 className="text-3xl font-bold mb-2">Tableau de bord</h2>
          <p className="text-muted-foreground">
            Bienvenue sur votre espace de gestion de voyages
          </p>
        </div>

        {/* Stats */}
        {!isLoading && <DashboardStats trips={trips} />}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                Créer un nouveau voyage
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un nouveau voyage</DialogTitle>
                <DialogDescription>
                  Entrez les informations de base pour votre voyage
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre du voyage *</Label>
                  <Input
                    id="title"
                    placeholder="Ex: Voyage en Italie"
                    value={newTripTitle}
                    onChange={(e) => setNewTripTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination (optionnel)</Label>
                  <Input
                    id="destination"
                    placeholder="Ex: Rome, Florence, Venise"
                    value={newTripDestination}
                    onChange={(e) => setNewTripDestination(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreateTrip}
                  disabled={isCreatingTrip}
                >
                  {isCreatingTrip && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Créer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button 
            variant="outline" 
            size="lg"
            onClick={loadLatestTrip}
            disabled={isLoadingLatestTrip}
          >
            {isLoadingLatestTrip && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Dev Mode: Charger dernier voyage
          </Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Mes voyages</CardTitle>
            <CardDescription>
              Recherchez et filtrez vos carnets de voyage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par titre ou destination..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="validated">Validé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Trips Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredTrips.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                {trips.length === 0 ? 'Aucun voyage' : 'Aucun résultat'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {trips.length === 0 
                  ? 'Créez votre premier carnet de voyage pour commencer'
                  : 'Aucun voyage ne correspond à vos critères de recherche'
                }
              </p>
              {trips.length === 0 && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un voyage
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onDelete={handleDeleteTrip}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Carnets de Voyage - Organisez vos aventures avec l'IA</p>
        </div>
      </footer>
    </div>
  );
}
