import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plane } from 'lucide-react';
import { z } from 'zod';

interface CreateTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { title: string; destination_zone: string }) => Promise<void>;
}

// Schéma de validation zod
const tripSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: "Le titre est requis" })
    .max(200, { message: "Le titre ne peut pas dépasser 200 caractères" }),
  destination_zone: z
    .string()
    .trim()
    .min(1, { message: "La destination est requise" })
    .max(200, { message: "La destination ne peut pas dépasser 200 caractères" })
});

export function CreateTripDialog({ open, onOpenChange, onConfirm }: CreateTripDialogProps) {
  const [title, setTitle] = useState('');
  const [destinationZone, setDestinationZone] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; destination_zone?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation avec zod
    try {
      const validatedData = tripSchema.parse({
        title: title,
        destination_zone: destinationZone
      });

      setIsCreating(true);
      await onConfirm({
        title: validatedData.title,
        destination_zone: validatedData.destination_zone
      });
      
      // Réinitialiser le formulaire après succès
      setTitle('');
      setDestinationZone('');
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Convertir les erreurs zod en objet d'erreurs
        const fieldErrors: { title?: string; destination_zone?: string } = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as 'title' | 'destination_zone';
          fieldErrors[field] = err.message;
        });
        setErrors(fieldErrors);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isCreating) {
      onOpenChange(newOpen);
      if (!newOpen) {
        // Réinitialiser le formulaire à la fermeture
        setTitle('');
        setDestinationZone('');
        setErrors({});
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Plane className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-xl">Créer un nouveau voyage</DialogTitle>
          </div>
          <DialogDescription>
            Commencez par donner un titre et une destination à votre carnet de voyage
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Titre du voyage <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Ex: Voyage au Japon 2024"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                disabled={isCreating}
                className={errors.title ? 'border-destructive' : ''}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {title.length}/200 caractères
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination">
                Destination <span className="text-destructive">*</span>
              </Label>
              <Input
                id="destination"
                placeholder="Ex: Japon, Tokyo"
                value={destinationZone}
                onChange={(e) => setDestinationZone(e.target.value)}
                maxLength={200}
                disabled={isCreating}
                className={errors.destination_zone ? 'border-destructive' : ''}
              />
              {errors.destination_zone && (
                <p className="text-sm text-destructive">{errors.destination_zone}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {destinationZone.length}/200 caractères
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isCreating}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création en cours...
                </>
              ) : (
                <>
                  Créer le voyage
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
