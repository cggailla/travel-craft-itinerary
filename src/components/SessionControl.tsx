/**
 * Panneau de contrôle pour la gestion de session Supabase
 * Affiche l'ID de session et permet le nettoyage manuel
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, RefreshCw, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getOrCreateSessionId, cleanupSessionImages } from '@/services/supabaseImageService';

export function SessionControl() {
  const [isCleaning, setIsCleaning] = useState(false);
  const { toast } = useToast();
  const sessionId = getOrCreateSessionId();

  const handleCleanup = async () => {
    if (!confirm('Voulez-vous vraiment supprimer toutes les images de cette session ?')) {
      return;
    }

    setIsCleaning(true);

    const result = await cleanupSessionImages();

    setIsCleaning(false);

    if (result.success) {
      toast({
        title: '✅ Nettoyage réussi',
        description: `${result.deletedCount} fichier(s) supprimé(s)`,
      });
      
      // Recharger la page pour créer une nouvelle session
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      toast({
        title: '❌ Erreur de nettoyage',
        description: result.error || 'Une erreur est survenue',
        variant: 'destructive',
      });
    }
  };

  const handleNewSession = () => {
    if (!confirm('Créer une nouvelle session ? Les images actuelles resteront sur Supabase mais ne seront plus accessibles depuis cette interface.')) {
      return;
    }

    sessionStorage.removeItem('upload_session_id');
    window.location.reload();
  };

  return (
    <div className="no-print bg-blue-50 border-2 border-blue-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">Session Supabase</span>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          {sessionId}
        </Badge>
      </div>

      <div className="text-xs text-blue-700 space-y-1">
        <p>• Les images sont stockées dans Supabase Storage</p>
        <p>• Chaque session a son propre dossier (isolation)</p>
        <p>• À la fermeture de l'onglet, la session est perdue</p>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleCleanup}
          disabled={isCleaning}
          className="flex-1"
        >
          {isCleaning ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Nettoyage...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4 mr-2" />
              Nettoyer la session
            </>
          )}
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleNewSession}
          className="flex-1"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Nouvelle session
        </Button>
      </div>
    </div>
  );
}
