import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface DeleteTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  tripTitle?: string;
  isDeleting: boolean;
}

export function DeleteTripDialog({
  open,
  onOpenChange,
  onConfirm,
  tripTitle,
  isDeleting
}: DeleteTripDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl">
              Supprimer le voyage
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            Êtes-vous sûr de vouloir supprimer le voyage{' '}
            <span className="font-semibold text-foreground">
              "{tripTitle || 'Sans titre'}"
            </span>{' '}
            ?
            <br />
            <br />
            <span className="text-destructive">
              Cette action est irréversible. Tous les documents, segments et données
              associés à ce voyage seront définitivement supprimés.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Suppression en cours...' : 'Supprimer définitivement'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
