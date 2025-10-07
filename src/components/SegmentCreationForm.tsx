import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import type { SegmentType } from '@/types/travel';
import type { CreateSegmentData } from '@/services/segmentCreationService';

const segmentSchema = z.object({
  segment_type: z.enum(['flight', 'hotel', 'activity', 'car', 'train', 'boat', 'pass', 'transfer', 'other']),
  title: z.string().min(1, "Le titre est obligatoire"),
  description: z.string().min(1, "La description est obligatoire"),
  start_date: z.string().min(1, "La date est obligatoire"),
  address: z.string().min(1, "Le lieu est obligatoire"),
  end_date: z.string().optional(),
  provider: z.string().optional(),
  reference_number: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  star_rating: z.number().min(1).max(5).optional(),
  checkin_time: z.string().optional(),
  checkout_time: z.string().optional(),
  opening_hours: z.string().optional(),
  activity_price: z.string().optional(),
  ticket_price: z.string().optional(),
  duration: z.string().optional(),
  booking_required: z.boolean().optional(),
  iata_code: z.string().optional(),
  icao_code: z.string().optional(),
  terminals: z.array(z.string()).optional(),
  facilities: z.array(z.string()).optional(),
  departure_times: z.array(z.string()).optional(),
  route: z.string().optional(),
});

interface SegmentCreationFormProps {
  tripId: string;
  onSuccess: (segment: any) => void;
  onCancel: () => void;
}

export function SegmentCreationForm({ tripId, onSuccess, onCancel }: SegmentCreationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [segmentType, setSegmentType] = useState<SegmentType>('other');
  
  const [formData, setFormData] = useState({
    segment_type: 'other' as SegmentType,
    title: '',
    description: '',
    start_date: '',
    address: '',
    end_date: '',
    provider: '',
    reference_number: '',
    phone: '',
    website: '',
    star_rating: undefined as number | undefined,
    checkin_time: '',
    checkout_time: '',
    opening_hours: '',
    activity_price: '',
    ticket_price: '',
    duration: '',
    booking_required: false,
    iata_code: '',
    icao_code: '',
    terminals: [] as string[],
    facilities: [] as string[],
    departure_times: [] as string[],
    route: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📋 Form submitted');
    console.log('  - tripId:', tripId);
    console.log('  - formData:', formData);
    
    setErrors({});
    setIsLoading(true);

    try {
      // Validation
      console.log('✅ Validating form data...');
      const validatedData = segmentSchema.parse(formData);
      console.log('  - Validation passed:', validatedData);
      
      // Import dynamically to avoid circular dependencies
      const { createManualSegment } = await import('@/services/segmentCreationService');
      console.log('  - Service imported successfully');
      
      // Créer l'objet avec les champs obligatoires
      const dataToSubmit: CreateSegmentData = {
        segment_type: validatedData.segment_type,
        title: validatedData.title,
        description: validatedData.description,
        start_date: validatedData.start_date,
        address: validatedData.address,
        end_date: validatedData.end_date,
        provider: validatedData.provider,
        reference_number: validatedData.reference_number,
        phone: validatedData.phone,
        website: validatedData.website,
        star_rating: validatedData.star_rating,
        checkin_time: validatedData.checkin_time,
        checkout_time: validatedData.checkout_time,
        opening_hours: validatedData.opening_hours,
        activity_price: validatedData.activity_price,
        ticket_price: validatedData.ticket_price,
        duration: validatedData.duration,
        booking_required: validatedData.booking_required,
        iata_code: validatedData.iata_code,
        icao_code: validatedData.icao_code,
        terminals: validatedData.terminals,
        facilities: validatedData.facilities,
        departure_times: validatedData.departure_times,
        route: validatedData.route,
      };
      
      console.log('🚀 Calling createManualSegment with:', dataToSubmit);
      const result = await createManualSegment(tripId, dataToSubmit);
      console.log('📦 Result from createManualSegment:', result);
      
      if (result.success && result.segment) {
        console.log('✅ Segment created successfully:', result.segment);
        onSuccess(result.segment);
      } else {
        console.error('❌ Segment creation failed:', result.error);
        setErrors({ submit: result.error || 'Erreur lors de la création' });
      }
    } catch (error) {
      console.error('💥 Exception caught in handleSubmit:', error);
      if (error instanceof z.ZodError) {
        console.log('  - Validation error details:', error.errors);
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        console.error('  - Unexpected error:', error);
        setErrors({ submit: 'Une erreur inattendue est survenue' });
      }
    } finally {
      setIsLoading(false);
      console.log('⏹️ Form submission complete');
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informations générales */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Informations générales</h3>
        
        <div className="space-y-2">
          <Label htmlFor="segment_type">Type de segment *</Label>
          <Select
            value={formData.segment_type}
            onValueChange={(value) => {
              setSegmentType(value as SegmentType);
              updateField('segment_type', value);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flight">Vol</SelectItem>
              <SelectItem value="hotel">Hébergement</SelectItem>
              <SelectItem value="activity">Activité</SelectItem>
              <SelectItem value="car">Location de voiture</SelectItem>
              <SelectItem value="train">Train</SelectItem>
              <SelectItem value="boat">Bateau</SelectItem>
              <SelectItem value="pass">Pass/Ticket</SelectItem>
              <SelectItem value="transfer">Transfert</SelectItem>
              <SelectItem value="other">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Titre *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="Ex: Hôtel du Centre"
          />
          {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Décrivez ce segment..."
            rows={3}
          />
          {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="provider">Prestataire</Label>
          <Input
            id="provider"
            value={formData.provider}
            onChange={(e) => updateField('provider', e.target.value)}
            placeholder="Ex: Air France, Booking.com..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reference_number">Numéro de référence</Label>
          <Input
            id="reference_number"
            value={formData.reference_number}
            onChange={(e) => updateField('reference_number', e.target.value)}
            placeholder="Ex: ABC123"
          />
        </div>
      </div>

      {/* Dates et horaires */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Dates et horaires</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start_date">Date de début *</Label>
            <Input
              id="start_date"
              type="datetime-local"
              value={formData.start_date}
              onChange={(e) => updateField('start_date', e.target.value)}
            />
            {errors.start_date && <p className="text-sm text-destructive">{errors.start_date}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="end_date">Date de fin</Label>
            <Input
              id="end_date"
              type="datetime-local"
              value={formData.end_date}
              onChange={(e) => updateField('end_date', e.target.value)}
            />
          </div>
        </div>

        {segmentType === 'hotel' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="checkin_time">Heure d'arrivée</Label>
              <Input
                id="checkin_time"
                type="time"
                value={formData.checkin_time}
                onChange={(e) => updateField('checkin_time', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkout_time">Heure de départ</Label>
              <Input
                id="checkout_time"
                type="time"
                value={formData.checkout_time}
                onChange={(e) => updateField('checkout_time', e.target.value)}
              />
            </div>
          </div>
        )}

        {(segmentType === 'activity' || segmentType === 'pass') && (
          <div className="space-y-2">
            <Label htmlFor="opening_hours">Horaires d'ouverture</Label>
            <Input
              id="opening_hours"
              value={formData.opening_hours}
              onChange={(e) => updateField('opening_hours', e.target.value)}
              placeholder="Ex: 9h - 18h"
            />
          </div>
        )}
      </div>

      {/* Localisation */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Localisation</h3>
        
        <div className="space-y-2">
          <Label htmlFor="address">Adresse/Lieu *</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => updateField('address', e.target.value)}
            placeholder="Ex: 123 Rue de la Paix, Paris"
          />
          {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
        </div>
      </div>

      {/* Détails spécifiques selon le type */}
      {segmentType === 'hotel' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Détails hôtel</h3>
          
          <div className="space-y-2">
            <Label htmlFor="star_rating">Nombre d'étoiles</Label>
            <Select
              value={formData.star_rating?.toString() || ''}
              onValueChange={(value) => updateField('star_rating', value ? parseInt(value) : undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 étoile</SelectItem>
                <SelectItem value="2">2 étoiles</SelectItem>
                <SelectItem value="3">3 étoiles</SelectItem>
                <SelectItem value="4">4 étoiles</SelectItem>
                <SelectItem value="5">5 étoiles</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {segmentType === 'flight' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Détails vol</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="iata_code">Code IATA</Label>
              <Input
                id="iata_code"
                value={formData.iata_code}
                onChange={(e) => updateField('iata_code', e.target.value)}
                placeholder="Ex: CDG"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="icao_code">Code ICAO</Label>
              <Input
                id="icao_code"
                value={formData.icao_code}
                onChange={(e) => updateField('icao_code', e.target.value)}
                placeholder="Ex: LFPG"
              />
            </div>
          </div>
        </div>
      )}

      {(segmentType === 'activity' || segmentType === 'pass') && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Détails activité</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="activity_price">Prix</Label>
              <Input
                id="activity_price"
                value={formData.activity_price}
                onChange={(e) => updateField('activity_price', e.target.value)}
                placeholder="Ex: 25€"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Durée</Label>
              <Input
                id="duration"
                value={formData.duration}
                onChange={(e) => updateField('duration', e.target.value)}
                placeholder="Ex: 2h30"
              />
            </div>
          </div>
        </div>
      )}

      {segmentType === 'boat' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Détails bateau</h3>
          
          <div className="space-y-2">
            <Label htmlFor="route">Itinéraire</Label>
            <Input
              id="route"
              value={formData.route}
              onChange={(e) => updateField('route', e.target.value)}
              placeholder="Ex: Paris - Londres"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket_price">Prix du ticket</Label>
            <Input
              id="ticket_price"
              value={formData.ticket_price}
              onChange={(e) => updateField('ticket_price', e.target.value)}
              placeholder="Ex: 45€"
            />
          </div>
        </div>
      )}

      {/* Contact */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Contact</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="Ex: +33 1 23 45 67 89"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Site web</Label>
            <Input
              id="website"
              value={formData.website}
              onChange={(e) => updateField('website', e.target.value)}
              placeholder="Ex: https://..."
            />
          </div>
        </div>
      </div>

      {errors.submit && (
        <div className="p-3 rounded bg-destructive/10 text-destructive text-sm">
          {errors.submit}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Annuler
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Créer le segment
        </Button>
      </div>
    </form>
  );
}
