import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BookletTemplate } from "@/components/BookletTemplate";
import { getBookletData, BookletData, defaultBookletOptions } from "@/services/bookletService";
import { Loader2 } from "lucide-react";

export default function PreviewPdf() {
  const { tripId } = useParams<{ tripId: string }>();
  const [bookletData, setBookletData] = useState<BookletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!tripId) return;
      
      try {
        const data = await getBookletData(tripId);
        setBookletData(data);
      } catch (error) {
        console.error("Error loading booklet data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [tripId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!bookletData || !tripId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Données non disponibles</p>
      </div>
    );
  }

  return (
    <div className="bg-white" style={{ margin: 0, padding: '20mm' }}>
      <BookletTemplate
        data={bookletData}
        options={defaultBookletOptions}
        tripId={tripId}
      />
    </div>
  );
}
