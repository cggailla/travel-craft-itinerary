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

interface DeleteSegmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segmentTitle: string;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export function DeleteSegmentDialog({
  open,
  onOpenChange,
  segmentTitle,
  onConfirm,
  isDeleting = false
}: DeleteSegmentDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2 pt-2">
            <p>
              Vous êtes sur le point de supprimer le segment{' '}
              <span className="font-semibold text-foreground">"{segmentTitle}"</span>.
            </p>
            <p className="text-destructive font-medium">
              ⚠️ Cette action est irréversible. Le segment sera définitivement supprimé 
              de la base de données et ne pourra pas être récupéré.
            </p>
            <p className="text-muted-foreground text-sm">
              Êtes-vous sûr de vouloir continuer ?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Suppression...
              </>
            ) : (
              'Supprimer définitivement'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
