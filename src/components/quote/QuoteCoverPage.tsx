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
  return (
    <section className="cover-page mb-16 text-center" data-pdf-section="cover">
      <div className="mb-6 no-print">
        <ImageUploader
          tripId={tripId}
          imageType="quote"
          position={1}
          currentImage={coverImage}
          onImageUploaded={onImageUploaded}
          onImageDeleted={onImageDeleted}
        />
      </div>

      {coverImage && (
        <div className="mb-8 rounded-lg overflow-hidden print-only">
          <img 
            src={coverImage.public_url} 
            alt="Cover" 
            className="w-full h-[400px] object-cover"
          />
        </div>
      )}

      <h1 className="text-5xl font-bold mb-6" data-pdf-title>
        <EditableText
          value={title}
          onChange={onTitleChange}
          className="text-5xl font-bold"
        />
      </h1>

      <div className="text-2xl text-muted-foreground mb-4 uppercase tracking-wide" data-pdf-client>
        <EditableText
          value={participants}
          onChange={onParticipantsChange}
          className="text-2xl"
          placeholder="NOM DES PARTICIPANTS"
        />
      </div>

      <div className="text-xl text-muted-foreground" data-pdf-dates>
        du <EditableDate value={startDate} onChange={onStartDateChange} /> au{" "}
        <EditableDate value={endDate} onChange={onEndDateChange} />
      </div>
    </section>
  );
}
