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
import { Plus, Plane, Calendar, MapPin, Loader2, FileText, ArrowRight, Zap, Search, CheckCircle2, FileEdit, TrendingUp, Trash2, MoreVertical, Grid3x3, List } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
type Trip = Tables<'trips'>;
type TripPhase = 'upload' | 'timeline' | 'validated';
interface TripWithPhase extends Trip {
  currentPhase: TripPhase;
  segmentCount?: number;
  stepCount?: number;
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
  const [phaseFilter, setPhaseFilter] = useState<'all' | 'upload' | 'timeline' | 'validated'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<TripWithPhase | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  useEffect(() => {
    loadTrips();
  }, []);
  const loadTrips = async () => {
    setIsLoading(true);
    try {
      const userTrips = await getUserTrips();

      // Enrichir chaque voyage avec sa phase et des stats
      const enrichedTrips = await Promise.all(userTrips.map(async trip => {
        // Compter les segments
        const {
          count: segmentCount
        } = await supabase.from('travel_segments').select('*', {
          count: 'exact',
          head: true
        }).eq('trip_id', trip.id);

        // Compter les étapes
        const {
          count: stepCount
        } = await supabase.from('travel_steps').select('*', {
          count: 'exact',
          head: true
        }).eq('trip_id', trip.id);

        // Compter les documents
        const {
          count: documentCount
        } = await supabase.from('documents').select('*', {
          count: 'exact',
          head: true
        }).eq('trip_id', trip.id);

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
          stepCount: stepCount || 0,
          documentCount: documentCount || 0,
          hasPdf: !!trip.last_pdf_url,
          pdfUrl: trip.last_pdf_url
        };
      }));
      setTrips(enrichedTrips);
    } catch (error) {
      console.error('Failed to load trips:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos voyages",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleCreateNewTrip = async (data: {
    title: string;
    destination_zone: string;
  }) => {
    setIsCreatingTrip(true);
    try {
      const result = await createTrip(data);
      if (result.success && result.trip_id) {
        toast({
          title: "Voyage créé",
          description: `"${data.title}" - Redirection vers l'upload de documents...`
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
        variant: "destructive"
      });
    } finally {
      setIsCreatingTrip(false);
    }
  };
  const handleDevMode = async () => {
    setIsLoadingDevMode(true);
    try {
      const {
        data,
        error
      } = await supabase.from('travel_segments').select('trip_id').not('trip_id', 'is', null).order('created_at', {
        ascending: false
      }).limit(1);
      if (error) throw error;
      if (data && data.length > 0 && data[0].trip_id) {
        toast({
          title: "Mode Dev activé",
          description: "Chargement du dernier voyage..."
        });
        navigate(`/trip/${data[0].trip_id}`);
      } else {
        toast({
          title: "Aucun voyage trouvé",
          description: "Créez d'abord un voyage avec des segments",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to load latest trip:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le dernier voyage",
        variant: "destructive"
      });
    } finally {
      setIsLoadingDevMode(false);
    }
  };
  const handleTripClick = (trip: TripWithPhase) => {
    if (trip.status === 'validated') {
      navigate(`/output-choice?tripId=${trip.id}`);
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
          description: `"${tripToDelete.title || 'Sans titre'}" a été supprimé définitivement`
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
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };
  const getPhaseLabel = (phase: TripPhase): string => {
    const labels = {
      upload: 'Upload de documents',
      timeline: 'Édition de la chronologie',
      validated: 'Carnet finalisé'
    };
    return labels[phase];
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Filtrage des voyages
  const filteredTrips = trips.filter(trip => {
    // Filtre par phase
    if (phaseFilter !== 'all') {
      if (trip.currentPhase !== phaseFilter) return false;
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
    upload: trips.filter(t => t.currentPhase === 'upload').length,
    timeline: trips.filter(t => t.currentPhase === 'timeline').length,
    validated: trips.filter(t => t.currentPhase === 'validated').length
  };
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header avec effet moderne */}
        <header className="flex justify-between items-center mb-12 relative">
          <div className="space-y-2">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent mb-3 tracking-tight">
              Tableau de bord
            </h1>
            <p className="text-lg text-muted-foreground/80 font-medium flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Gérez vos dossiers voyage : carnets et devis personnalisés
            </p>
          </div>
          <div className="relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full blur-xl pointer-events-none" />
            <div className="relative z-10">
              <UserMenu />
            </div>
          </div>
        </header>

        {/* Statistiques modernes avec animations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card className="group relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br from-card via-card to-primary/5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl transition-all duration-500 group-hover:scale-150" />
            <CardHeader className="pb-3 relative z-10">
              <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wide">
                <TrendingUp className="h-5 w-5 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                Total de voyages
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-bold font-mono bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                {stats.total}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Tous vos voyages</p>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-2 hover:border-green-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/20 hover:-translate-y-1 bg-gradient-to-br from-card via-card to-green-500/5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl transition-all duration-500 group-hover:scale-150" />
            <CardHeader className="pb-3 relative z-10">
              <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wide">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                Voyages validés
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-bold font-mono text-green-600 dark:text-green-400">
                {stats.validated}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Prêts à explorer</p>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-2 hover:border-orange-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/20 hover:-translate-y-1 bg-gradient-to-br from-card via-card to-orange-500/5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl transition-all duration-500 group-hover:scale-150" />
            <CardHeader className="pb-3 relative z-10">
              <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wide">
                <FileEdit className="h-5 w-5 text-orange-600 dark:text-orange-400 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                Voyages en cours
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-bold font-mono text-orange-600 dark:text-orange-400">
                {stats.upload + stats.timeline}
              </div>
              <p className="text-xs text-muted-foreground mt-2">En préparation</p>
            </CardContent>
          </Card>
        </div>

        {/* Recherche et filtres modernes */}
        <div className="flex flex-col md:flex-row gap-4 mb-10">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors duration-300 group-focus-within:text-primary" />
            <Input type="text" placeholder="Rechercher un voyage par titre ou destination..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-12 h-12 text-base border-2 focus:border-primary/50 bg-card/50 backdrop-blur-sm transition-all duration-300 shadow-sm hover:shadow-md" />
          </div>
          
          {/* Toggle vue grille/liste */}
          <div className="flex gap-1 p-1 bg-muted/50 rounded-lg border border-border/50">
            <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className={`h-10 px-4 transition-all duration-300 ${viewMode === 'grid' ? 'shadow-sm' : 'hover:bg-background/50'}`}>
              <Grid3x3 className="h-4 w-4 mr-2" />
              Grille
            </Button>
            <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className={`h-10 px-4 transition-all duration-300 ${viewMode === 'list' ? 'shadow-sm' : 'hover:bg-background/50'}`}>
              <List className="h-4 w-4 mr-2" />
              Liste
            </Button>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button variant={phaseFilter === 'all' ? 'default' : 'outline'} onClick={() => setPhaseFilter('all')} className={`h-11 px-5 font-medium transition-all duration-300 rounded-full ${phaseFilter === 'all' ? 'shadow-lg shadow-primary/30 bg-gradient-to-r from-primary to-primary/90' : 'hover:border-primary/50 hover:bg-primary/5'}`}>
              <span>Tous</span>
              <Badge variant="secondary" className="ml-2 font-mono bg-background/80">{stats.total}</Badge>
            </Button>
            
            <Button variant={phaseFilter === 'upload' ? 'default' : 'outline'} onClick={() => setPhaseFilter('upload')} className={`h-11 px-5 font-medium transition-all duration-300 rounded-full ${phaseFilter === 'upload' ? 'shadow-lg shadow-orange-500/30 bg-gradient-to-r from-orange-500 to-orange-600 text-white border-orange-500' : 'hover:border-orange-500/50 hover:bg-orange-500/5'}`}>
              <FileText className="mr-1.5 h-4 w-4" />
              <span>Upload</span>
              <Badge variant="secondary" className="ml-2 font-mono bg-background/80">{stats.upload}</Badge>
            </Button>
            
            <Button variant={phaseFilter === 'timeline' ? 'default' : 'outline'} onClick={() => setPhaseFilter('timeline')} className={`h-11 px-5 font-medium transition-all duration-300 rounded-full ${phaseFilter === 'timeline' ? 'shadow-lg shadow-blue-500/30 bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-500' : 'hover:border-blue-500/50 hover:bg-blue-500/5'}`}>
              <Calendar className="mr-1.5 h-4 w-4" />
              <span>Chronologie</span>
              <Badge variant="secondary" className="ml-2 font-mono bg-background/80">{stats.timeline}</Badge>
            </Button>
            
            <Button variant={phaseFilter === 'validated' ? 'default' : 'outline'} onClick={() => setPhaseFilter('validated')} className={`h-11 px-5 font-medium transition-all duration-300 rounded-full ${phaseFilter === 'validated' ? 'shadow-lg shadow-green-500/30 bg-gradient-to-r from-green-500 to-green-600 text-white border-green-500' : 'hover:border-green-500/50 hover:bg-green-500/5'}`}>
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              <span>Finalisés</span>
              <Badge variant="secondary" className="ml-2 font-mono bg-background/80">{stats.validated}</Badge>
            </Button>
          </div>
        </div>

        {/* Actions principales avec design moderne */}
        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          <Button onClick={() => setShowCreateDialog(true)} disabled={isCreatingTrip} size="lg" className="group flex-1 sm:max-w-md h-14 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary hover:to-primary shadow-xl hover:shadow-2xl hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.02]">
            {isCreatingTrip ? <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Création en cours...
              </> : <>
                <Plus className="mr-2 h-5 w-5 transition-transform duration-300 group-hover:rotate-90" />
                Créer un nouveau voyage
                <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </>}
          </Button>

          
        </div>

        {/* Liste des voyages avec états vides améliorés */}
        {isLoading ? <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground font-medium">Chargement de vos voyages...</p>
            </div>
          </div> : filteredTrips.length === 0 && searchQuery ? <Card className="border-2 border-dashed hover:border-primary/50 transition-all duration-300">
            <CardContent className="text-center py-20">
              <Search className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Aucun résultat</h3>
              <p className="text-muted-foreground mb-6">Aucun voyage ne correspond à votre recherche "<span className="font-semibold text-foreground">{searchQuery}</span>"</p>
              <Button variant="outline" onClick={() => setSearchQuery('')}>
                Effacer la recherche
              </Button>
            </CardContent>
          </Card> : filteredTrips.length === 0 ? <Card className="border-2 border-dashed hover:border-primary/50 transition-all duration-300 bg-gradient-to-br from-card to-primary/5">
            <CardContent className="text-center py-20">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl" />
                <Plane className="relative h-20 w-20 text-primary mx-auto" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Commencez votre aventure</h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto text-lg">
                Aucun voyage créé pour le moment. Créez votre premier carnet de voyage et partagez vos expériences.
              </p>
              <Button size="lg" onClick={() => setShowCreateDialog(true)} className="h-12 px-8 text-base font-semibold shadow-xl hover:shadow-2xl hover:shadow-primary/30 transition-all duration-300 hover:scale-105">
                <Plus className="mr-2 h-5 w-5" />
                Créer mon premier voyage
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card> : viewMode === 'grid' ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTrips.map((trip, index) => {
          const isNew = new Date().getTime() - new Date(trip.created_at).getTime() < 24 * 60 * 60 * 1000;
          const isRecent = new Date().getTime() - new Date(trip.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;
          const statusConfig = {
            validated: {
              gradient: 'from-green-500/10 via-emerald-500/5 to-transparent',
              borderColor: 'border-green-500/20',
              iconBg: 'bg-green-500/10',
              iconColor: 'text-green-600 dark:text-green-400',
              badgeVariant: 'default' as const,
              badgeClass: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
              shadowHover: 'hover:shadow-[0_8px_30px_hsl(142_76%_45%/0.3)]'
            },
            timeline: {
              gradient: 'from-blue-500/10 via-sky-500/5 to-transparent',
              borderColor: 'border-blue-500/20',
              iconBg: 'bg-blue-500/10',
              iconColor: 'text-blue-600 dark:text-blue-400',
              badgeVariant: 'secondary' as const,
              badgeClass: 'bg-gradient-to-r from-blue-500 to-sky-500 text-white',
              shadowHover: 'hover:shadow-[0_8px_30px_hsl(210_100%_55%/0.3)]'
            },
            upload: {
              gradient: 'from-orange-500/10 via-amber-500/5 to-transparent',
              borderColor: 'border-orange-500/20',
              iconBg: 'bg-orange-500/10',
              iconColor: 'text-orange-600 dark:text-orange-400',
              badgeVariant: 'outline' as const,
              badgeClass: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white',
              shadowHover: 'hover:shadow-[0_8px_30px_hsl(30_90%_55%/0.3)]'
            }
          };
          const config = statusConfig[trip.currentPhase];
          const progress = trip.currentPhase === 'upload' ? 33 : trip.currentPhase === 'timeline' ? 66 : 100;
          return <div key={trip.id} className={`group relative animate-slide-up`} style={{
            animationDelay: `${index * 50}ms`
          }}>
                  {/* Nouveau ribbon */}
                  {isNew && <div className="absolute -top-2 -right-2 z-20">
                      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-pulse-glow">
                        Nouveau
                      </div>
                    </div>}

                  <Card onClick={() => handleTripClick(trip)} className={`
                      relative overflow-hidden cursor-pointer h-full
                      transition-all duration-300 ease-out
                      border-2 ${config.borderColor}
                      ${config.shadowHover}
                      hover:-translate-y-2 hover:scale-[1.02]
                      backdrop-blur-sm bg-card/95
                      before:absolute before:inset-0 before:bg-gradient-to-br before:${config.gradient}
                      before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300
                      before:pointer-events-none
                    `}>
                    {/* Bannière de statut en haut */}
                    <div className={`h-2 w-full bg-gradient-to-r ${config.badgeClass} transition-all duration-300 group-hover:h-3`} />

                    {/* Badge de statut avec glassmorphism */}
                    <div className="absolute top-4 right-4 z-10">
                      <Badge variant={config.badgeVariant} className={`
                          ${config.badgeClass} 
                          backdrop-blur-md shadow-lg
                          border border-white/20
                          flex items-center gap-1.5
                          transition-transform duration-300 group-hover:scale-110
                        `}>
                        {isRecent && <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse-glow" />}
                        {getPhaseLabel(trip.currentPhase)}
                      </Badge>
                    </div>

                    <CardHeader className="pb-3 pt-6 relative">
                      {/* Icône de destination grande et stylisée */}
                      

                      <div className="mt-6">
                        <CardTitle className="text-xl font-bold tracking-tight mb-2 line-clamp-2 transition-all duration-300 group-hover:text-primary group-hover:translate-x-1">
                          {trip.title || 'Voyage sans titre'}
                        </CardTitle>
                        {trip.destination_zone && <CardDescription className="text-base font-medium flex items-center gap-2 text-foreground/80">
                            <Plane className="h-4 w-4" />
                            {trip.destination_zone}
                          </CardDescription>}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Stats visuelles enrichies */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col items-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 transition-all duration-300 hover:bg-blue-500/20">
                          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400 mb-1" />
                          <span className="text-xs text-muted-foreground">Documents</span>
                          <span className="text-lg font-bold font-mono">{trip.documentCount}</span>
                        </div>
                        
                        <div className="flex flex-col items-center p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 transition-all duration-300 hover:bg-purple-500/20">
                          <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400 mb-1" />
                          <span className="text-xs text-muted-foreground">{trip.status === 'validated' && trip.stepCount ? 'Étapes' : 'Segments'}</span>
                          <span className="text-lg font-bold font-mono">{trip.status === 'validated' && trip.stepCount ? trip.stepCount : trip.segmentCount}</span>
                        </div>
                        
                        <div className="flex flex-col items-center p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 transition-all duration-300 hover:bg-orange-500/20">
                          <Zap className="h-4 w-4 text-orange-600 dark:text-orange-400 mb-1" />
                          <span className="text-xs text-muted-foreground">Phase</span>
                          <span className="text-xs font-bold uppercase">{trip.currentPhase}</span>
                        </div>
                      </div>

                      {/* Barre de progression pour les brouillons */}
                      {trip.currentPhase !== 'validated' && <div className="space-y-1">
                          <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>Avancement</span>
                            <span className="font-semibold">{progress}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full bg-gradient-to-r ${config.badgeClass} transition-all duration-500 ease-out`} style={{
                      width: `${progress}%`
                    }} />
                          </div>
                        </div>}

                      {/* Date avec icône */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t border-border/50">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Créé le {formatDate(trip.created_at)}</span>
                      </div>
                    </CardContent>

                    <CardFooter className="flex flex-col gap-2 pt-4 border-t border-border/50 relative z-10">
                      {trip.status === 'validated' ? <>
                          <Button variant="default" className="w-full group/btn bg-gradient-to-r from-primary to-primary/80 hover:from-primary hover:to-primary/90 shadow-lg transition-all duration-300" size="sm" onClick={e => {
                    e.stopPropagation();
                    handleTripClick(trip);
                  }}>
                            <FileText className="mr-2 h-4 w-4" />
                            Choisir le format
                            <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                          </Button>
                          {trip.hasPdf && trip.pdfUrl && <Button variant="outline" className="w-full relative overflow-hidden group/pdf" size="sm" asChild>
                              <a href={trip.pdfUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/pdf:translate-x-full transition-transform duration-1000" />
                                <FileText className="mr-2 h-4 w-4" />
                                Télécharger le PDF
                                {trip.hasPdf && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse-glow" />}
                              </a>
                            </Button>}
                        </> : <Button variant="default" className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary hover:to-primary/90 shadow-lg transition-all duration-300" size="sm" onClick={e => {
                  e.stopPropagation();
                  handleTripClick(trip);
                }}>
                          <FileEdit className="mr-2 h-4 w-4" />
                          Continuer l'édition
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </Button>}

                      {/* Bouton supprimer avec hover state amélioré */}
                      <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-300" onClick={e => handleDeleteClick(trip, e)}>
                        <Trash2 className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                        Supprimer
                      </Button>
                    </CardFooter>
                  </Card>
                </div>;
        })}
          </div> : <div className="flex flex-col gap-4">
            {filteredTrips.map((trip, index) => {
          const isNew = new Date().getTime() - new Date(trip.created_at).getTime() < 24 * 60 * 60 * 1000;
          const isRecent = new Date().getTime() - new Date(trip.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;
          const statusConfig = {
            validated: {
              gradient: 'from-green-500/10 via-emerald-500/5 to-transparent',
              borderColor: 'border-green-500/20',
              iconBg: 'bg-green-500/10',
              iconColor: 'text-green-600 dark:text-green-400',
              badgeVariant: 'default' as const,
              badgeClass: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
              shadowHover: 'hover:shadow-[0_8px_30px_hsl(142_76%_45%/0.3)]'
            },
            timeline: {
              gradient: 'from-blue-500/10 via-sky-500/5 to-transparent',
              borderColor: 'border-blue-500/20',
              iconBg: 'bg-blue-500/10',
              iconColor: 'text-blue-600 dark:text-blue-400',
              badgeVariant: 'secondary' as const,
              badgeClass: 'bg-gradient-to-r from-blue-500 to-sky-500 text-white',
              shadowHover: 'hover:shadow-[0_8px_30px_hsl(210_100%_55%/0.3)]'
            },
            upload: {
              gradient: 'from-orange-500/10 via-amber-500/5 to-transparent',
              borderColor: 'border-orange-500/20',
              iconBg: 'bg-orange-500/10',
              iconColor: 'text-orange-600 dark:text-orange-400',
              badgeVariant: 'outline' as const,
              badgeClass: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white',
              shadowHover: 'hover:shadow-[0_8px_30px_hsl(30_90%_55%/0.3)]'
            }
          };
          const config = statusConfig[trip.currentPhase];
          const progress = trip.currentPhase === 'upload' ? 33 : trip.currentPhase === 'timeline' ? 66 : 100;
          return <div key={trip.id} className="group relative animate-fade-in" style={{
            animationDelay: `${index * 30}ms`
          }}>
                  {isNew && <div className="absolute -top-2 -left-2 z-20">
                      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-pulse-glow">
                        Nouveau
                      </div>
                    </div>}

                  <Card onClick={() => handleTripClick(trip)} className={`
                      relative overflow-hidden cursor-pointer
                      transition-all duration-300 ease-out
                      border-2 ${config.borderColor}
                      ${config.shadowHover}
                      hover:-translate-y-1
                      backdrop-blur-sm bg-card/95
                      before:absolute before:inset-0 before:bg-gradient-to-br before:${config.gradient}
                      before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300
                      before:pointer-events-none
                    `}>
                    <div className="flex items-center gap-6 p-6">
                      {/* Icône et info principale */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`${config.iconBg} p-4 rounded-xl transition-all duration-300 group-hover:scale-110`}>
                          <MapPin className={`h-8 w-8 ${config.iconColor}`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold tracking-tight line-clamp-1 transition-all duration-300 group-hover:text-primary">
                              {trip.title || 'Voyage sans titre'}
                            </h3>
                            <Badge variant={config.badgeVariant} className={`
                                ${config.badgeClass} 
                                backdrop-blur-md shadow-lg
                                border border-white/20
                                flex items-center gap-1.5
                                flex-shrink-0
                              `}>
                              {isRecent && <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse-glow" />}
                              {getPhaseLabel(trip.currentPhase)}
                            </Badge>
                          </div>
                          
                          {trip.destination_zone && <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                              <Plane className="h-3.5 w-3.5" />
                              {trip.destination_zone}
                            </p>}
                        </div>
                      </div>

                      {/* Stats compactes */}
                      <div className="hidden lg:flex items-center gap-4 flex-shrink-0">
                        <div className="flex flex-col items-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 min-w-[80px]">
                          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400 mb-1" />
                          <span className="text-xs text-muted-foreground">Documents</span>
                          <span className="text-lg font-bold font-mono">{trip.documentCount}</span>
                        </div>
                        
                        <div className="flex flex-col items-center p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 min-w-[80px]">
                          <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400 mb-1" />
                          <span className="text-xs text-muted-foreground">Segments</span>
                          <span className="text-lg font-bold font-mono">{trip.segmentCount}</span>
                        </div>

                        <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50 border border-border/50 min-w-[100px]">
                          <Calendar className="h-4 w-4 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground">Créé le</span>
                          <span className="text-xs font-semibold">{formatDate(trip.created_at)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {trip.status === 'validated' ? <>
                            <Button variant="default" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary hover:to-primary/90 shadow-lg" size="sm" onClick={e => {
                      e.stopPropagation();
                      handleTripClick(trip);
                    }}>
                              <FileText className="mr-2 h-4 w-4" />
                              Choisir le format
                            </Button>
                            {trip.hasPdf && trip.pdfUrl && <Button variant="outline" size="sm" asChild>
                                <a href={trip.pdfUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                                  <FileText className="h-4 w-4" />
                                </a>
                              </Button>}
                          </> : <Button variant="default" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary hover:to-primary/90 shadow-lg" size="sm" onClick={e => {
                    e.stopPropagation();
                    handleTripClick(trip);
                  }}>
                            <FileEdit className="mr-2 h-4 w-4" />
                            Continuer
                          </Button>}

                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={e => handleDeleteClick(trip, e)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Barre de progression pour brouillons */}
                    {trip.currentPhase !== 'validated' && <div className="px-6 pb-4">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full bg-gradient-to-r ${config.badgeClass} transition-all duration-500 ease-out`} style={{
                    width: `${progress}%`
                  }} />
                        </div>
                      </div>}
                  </Card>
                </div>;
        })}
          </div>}

        {/* Dialog de création de voyage */}
        <CreateTripDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} onConfirm={handleCreateNewTrip} />

        {/* Dialog de suppression de voyage */}
        <DeleteTripDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog} onConfirm={handleConfirmDelete} tripTitle={tripToDelete?.title} isDeleting={isDeleting} />
      </div>
    </div>;
}