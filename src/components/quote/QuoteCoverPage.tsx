import { EditableText } from "../EditableText";
import { EditableDate } from "../EditableDate";
import { ImageUploader } from "../ImageUploader";
import { SupabaseImage } from "@/services/supabaseImageService";

interface QuoteCoverPageProps {
  tripId: string;
  title: string;
  onTitleChange: (value: string) => void;
  participants: string;
  onParticipantsChange: (value: string) => void;
  startDate: Date;
  onStartDateChange: (value: Date) => void;
  endDate: Date;
  onEndDateChange: (value: Date) => void;
  coverImage?: SupabaseImage;
  onImageUploaded: (image: SupabaseImage) => void;
  onImageDeleted: () => void;
}

export function QuoteCoverPage({
  tripId,
  title,
  onTitleChange,
  participants,
  onParticipantsChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  coverImage,
  onImageUploaded,
  onImageDeleted,
}: QuoteCoverPageProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  return (
    <section className="cover-page h-full" data-pdf-section="cover">
      <div className="flex gap-12 items-center h-full">
        {/* LEFT SIDE - Image with Upload */}
        <div className="relative w-1/2 h-full rounded-3xl overflow-hidden">
          <ImageUploader
            tripId={tripId}
            imageType="quote"
            position={1}
            currentImage={coverImage}
            onImageUploaded={onImageUploaded}
            onImageDeleted={onImageDeleted}
            height="h-full"
            className="h-full w-full object-cover"
          />
          {/* Hidden image for PDF extraction */}
          {coverImage?.public_url && (
            <img 
              src={coverImage.public_url} 
              className="hidden" 
              data-pdf-image="true" 
              alt="cover" 
            />
          )}
        </div>

        {/* RIGHT SIDE - Content */}
        <div className="w-1/2 flex flex-col justify-center space-y-8 pr-8">
          {/* Logo */}
          <div className="flex justify-start mb-8">
            <img 
              src="/src/assets/logo-adgentes.png" 
              alt="Ad Gentes" 
              className="h-20 opacity-90"
            />
          </div>

          {/* Title */}
          <div>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6 text-primary" data-pdf-editable="title">
              <EditableText
                value={title}
                onChange={onTitleChange}
                className="text-5xl md:text-6xl font-bold leading-tight"
                placeholder="Votre voyage"
              />
            </h1>

            {/* Participant Name */}
            <div className="text-xl font-medium tracking-wide mb-4 text-foreground/80" data-pdf-editable="participants">
              <EditableText
                value={participants}
                onChange={onParticipantsChange}
                className="text-xl font-medium tracking-wide"
                placeholder="Pour qui ?"
              />
            </div>

            {/* Dates */}
            <div className="text-lg text-muted-foreground" data-pdf-dates>
              du <EditableDate value={startDate} onChange={onStartDateChange} /> au{" "}
              <EditableDate value={endDate} onChange={onEndDateChange} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
