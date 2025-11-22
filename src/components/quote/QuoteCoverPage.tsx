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
    <section className="cover-page mb-24 min-h-[600px]" data-pdf-section="cover">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* LEFT SIDE - Image with Upload */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-muted/30">
          <ImageUploader
            tripId={tripId}
            imageType="quote"
            position={1}
            currentImage={coverImage}
            onImageUploaded={onImageUploaded}
            onImageDeleted={onImageDeleted}
            height="h-[500px]"
          />
          
          {!coverImage && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-muted-foreground text-lg">Photo de couverture</p>
            </div>
          )}
        </div>

        {/* RIGHT SIDE - Content */}
        <div className="flex flex-col justify-center space-y-8">
          {/* Logo */}
          <div className="flex justify-end">
            <img 
              src="/src/assets/logo-adgentes.png" 
              alt="Ad Gentes" 
              className="h-16 opacity-80"
            />
          </div>

          {/* Title */}
          <div>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-8" data-pdf-title>
              <EditableText
                value={title}
                onChange={onTitleChange}
                className="text-5xl md:text-6xl font-bold leading-tight"
                placeholder="Votre voyage"
              />
            </h1>

            {/* Participant Name */}
            <div className="text-lg font-semibold tracking-wide uppercase mb-2" data-pdf-client>
              <EditableText
                value={participants}
                onChange={onParticipantsChange}
                className="text-lg font-semibold tracking-wide uppercase"
                placeholder="NOM DES PARTICIPANTS"
              />
            </div>

            {/* Dates */}
            <div className="text-base text-muted-foreground" data-pdf-dates>
              du <EditableDate value={startDate} onChange={onStartDateChange} /> au{" "}
              <EditableDate value={endDate} onChange={onEndDateChange} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
