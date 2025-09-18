import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { getTrips, validateTrip, getTravelSegments } from '@/services/documentService';
import { Trip } from '@/types/travel';
import { Calendar, MapPin, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export function TripManager() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [validatingTrip, setValidatingTrip] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      const result = await getTrips();
      if (result.success) {
        setTrips(result.trips);
      }
    } catch (error) {
      console.error('Error loading trips:', error);
      toast({
        title: "Error",
        description: "Failed to load trips",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleValidateTrip = async (tripId: string) => {
    setValidatingTrip(tripId);
    try {
      const result = await validateTrip(tripId);
      if (result.success) {
        toast({
          title: "Trip Validated",
          description: "All travel segments have been validated",
        });
        loadTrips(); // Refresh trips
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error validating trip:', error);
      toast({
        title: "Validation Error",
        description: error instanceof Error ? error.message : "Failed to validate trip",
        variant: "destructive",
      });
    } finally {
      setValidatingTrip(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'validated':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'draft':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'validated' ? 'default' : status === 'processing' ? 'secondary' : 'outline';
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Trip Management</h2>
        <Button onClick={loadTrips} variant="outline">
          Refresh
        </Button>
      </div>

      {trips.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No trips found. Upload some travel documents to get started.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {trips.map((trip) => (
            <Card key={trip.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    {trip.title || `Trip ${new Date(trip.created_at).toLocaleDateString()}`}
                  </CardTitle>
                  {getStatusBadge(trip.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Created: {new Date(trip.created_at).toLocaleDateString()}</span>
                    <span>Updated: {new Date(trip.updated_at).toLocaleDateString()}</span>
                  </div>

                  {trip.documents && trip.documents.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Documents ({trip.documents.length})</h4>
                      <div className="space-y-2">
                        {trip.documents.map((doc: any) => (
                          <div key={doc.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                            <span className="text-sm">{doc.file_name}</span>
                            <div className="flex items-center gap-2">
                              {doc.document_processing_jobs?.[0] && (
                                <Badge variant="outline" className="text-xs">
                                  {doc.document_processing_jobs[0].status}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div className="flex gap-2">
                    {trip.status !== 'validated' && (
                      <Button
                        onClick={() => handleValidateTrip(trip.id)}
                        disabled={validatingTrip === trip.id}
                        size="sm"
                      >
                        {validatingTrip === trip.id ? 'Validating...' : 'Validate Trip'}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Navigate to trip details or segments view
                        console.log('View trip details:', trip.id);
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}