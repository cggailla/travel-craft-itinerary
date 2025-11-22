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
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plane } from 'lucide-react';
import { z } from 'zod';

interface CreateTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { 
    title: string; 
    destination_zone: string;
    price?: number;
    participants?: string;
    number_of_people?: number;
  }) => Promise<void>;
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
    .max(200, { message: "La destination ne peut pas dépasser 200 caractères" }),
  price: z
    .string()
    .optional()
    .refine((val) => {
      if (!val || val.trim() === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, { message: "Le prix doit être un nombre positif" }),
  participants: z
    .string()
    .max(500, { message: "Les participants ne peuvent pas dépasser 500 caractères" })
    .optional(),
  number_of_people: z
    .string()
    .optional()
    .refine((val) => {
      if (!val || val.trim() === '') return true;
      const num = parseInt(val);
      return !isNaN(num) && num > 0;
    }, { message: "Le nombre de personnes doit être un nombre entier positif" })
});

export function CreateTripDialog({ open, onOpenChange, onConfirm }: CreateTripDialogProps) {
  const [title, setTitle] = useState('');
  const [destinationZone, setDestinationZone] = useState('');
  const [price, setPrice] = useState('');
  const [participants, setParticipants] = useState('');
  const [numberOfPeople, setNumberOfPeople] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState<{ 
    title?: string; 
    destination_zone?: string;
    price?: string;
    participants?: string;
    number_of_people?: string;
  }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation avec zod
    try {
      const validatedData = tripSchema.parse({
        title: title,
        destination_zone: destinationZone,
        price: price,
        participants: participants,
        number_of_people: numberOfPeople
      });

      setIsCreating(true);
      await onConfirm({
        title: validatedData.title,
        destination_zone: validatedData.destination_zone,
        price: validatedData.price ? parseFloat(validatedData.price) : undefined,
        participants: validatedData.participants || undefined,
        number_of_people: validatedData.number_of_people ? parseInt(validatedData.number_of_people) : undefined
      });
      
      // Réinitialiser le formulaire après succès
      setTitle('');
      setDestinationZone('');
      setPrice('');
      setParticipants('');
      setNumberOfPeople('');
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Convertir les erreurs zod en objet d'erreurs
        const fieldErrors: { 
          title?: string; 
          destination_zone?: string;
          price?: string;
          participants?: string;
          number_of_people?: string;
        } = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as 'title' | 'destination_zone' | 'price' | 'participants' | 'number_of_people';
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
        setPrice('');
        setParticipants('');
        setNumberOfPeople('');
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

            <div className="space-y-2">
              <Label htmlFor="price">
                Prix du voyage <span className="text-xs text-muted-foreground">(optionnel)</span>
              </Label>
              <Input
                id="price"
                type="text"
                placeholder="Ex: 2500"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={isCreating}
                className={errors.price ? 'border-destructive' : ''}
              />
              {errors.price && (
                <p className="text-sm text-destructive">{errors.price}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="participants">
                Participants <span className="text-xs text-muted-foreground">(optionnel)</span>
              </Label>
              <Textarea
                id="participants"
                placeholder="Ex: Jean Dupont, Marie Martin, Pierre Durand..."
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
                maxLength={500}
                disabled={isCreating}
                rows={3}
                className={errors.participants ? 'border-destructive' : ''}
              />
              {errors.participants && (
                <p className="text-sm text-destructive">{errors.participants}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {participants.length}/500 caractères
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="numberOfPeople">
                Nombre de personnes <span className="text-xs text-muted-foreground">(optionnel)</span>
              </Label>
              <Input
                id="numberOfPeople"
                type="text"
                placeholder="Ex: 4"
                value={numberOfPeople}
                onChange={(e) => setNumberOfPeople(e.target.value)}
                disabled={isCreating}
                className={errors.number_of_people ? 'border-destructive' : ''}
              />
              {errors.number_of_people && (
                <p className="text-sm text-destructive">{errors.number_of_people}</p>
              )}
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
