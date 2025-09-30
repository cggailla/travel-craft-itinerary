import { BookletData, BookletOptions } from "@/services/bookletService";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, Clock, FileText, RefreshCw } from "lucide-react";
import { DynamicItinerary } from "./DynamicItinerary";
import { ThankYouSection } from "./ThankYouSection";
import { GeneralInfoSection } from "./GeneralInfoSection";
import { EmergencyContactsSection } from "./EmergencyContactsSection";
import { useState, useEffect } from "react";
import logoAdgentes from "@/assets/logo-adgentes.png";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";

interface BookletTemplateProps {
  data: BookletData;
  options: BookletOptions;
  tripId: string;
}

export function BookletTemplate({
  data,
  options,
  tripId,
}: BookletTemplateProps) {
  const [coverImages, setCoverImages] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editableTitle, setEditableTitle] = useState(data.tripTitle);
  const { toast } = useToast();

  const fetchCoverImages = async () => {
    const { data: generalInfo, error } = await supabase
      .from('trip_general_info')
      .select('cover_images')
      .eq('trip_id', tripId)
      .maybeSingle();
    
    if (!error && generalInfo?.cover_images) {
      setCoverImages(generalInfo.cover_images);
      return true;
    }
    return false;
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const success = await fetchCoverImages();
    setIsRefreshing(false);
    
    if (success) {
      toast({
        title: "Images mises à jour",
        description: "Les images de couverture ont été rechargées.",
      });
    } else {
      toast({
        title: "Aucune image disponible",
        description: "Les images de couverture ne sont pas encore générées.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchCoverImages();
    
    // Poll every 5 seconds for new images if none are loaded
    const interval = setInterval(async () => {
      if (coverImages.length === 0) {
        await fetchCoverImages();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [tripId, coverImages.length]);

  // Couleur fixe Adgentes
  const colors = { primary: "#822a62", secondary: "#c084ab", accent: "#f5e6f0" };

  const templateStyles = { classic: "font-serif", modern: "font-sans", minimal: "font-mono" as const };

  return (
    <div id="booklet-content" className={`${templateStyles[options.template]} text-gray-900`}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            /* Anti-coupures pour éléments critiques */
            .segment-card,
            .step-container,
            .image-container,
            .keep-together {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            
            /* Nouvelles pages obligatoires aux sections */
            .section-break {
              page-break-before: always !important;
              break-before: always !important;
            }
            
            /* Éviter orphelins et veuves */
            p, div {
              orphans: 3;
              widows: 3;
            }
            
            /* Qualité images */
            img {
              object-fit: cover !important;
              image-rendering: -webkit-optimize-contrast;
              image-rendering: crisp-edges;
              page-break-inside: avoid;
            }
            
            .no-print { 
              display: none !important; 
            }
          }
          .theme-bg { background-color: ${colors.accent}; }
          .theme-border { border-color: ${colors.primary}; }
          .theme-text { color: ${colors.primary}; }
        `,
        }}
      />

      {/* En-tête / couverture */}
      <div className="mb-8">
        {/* Barre de header avec logo Adgentes */}
        <div className="theme-bg p-6 rounded-t-lg flex items-center justify-between" style={{ backgroundColor: colors.primary }}>
          <img 
            src={logoAdgentes} 
            alt="Adgentes" 
            className="h-10 object-contain"
          />
          <h1 
            className="text-2xl font-bold text-white outline-none"
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => setEditableTitle(e.currentTarget.textContent || data.tripTitle)}
          >
            {editableTitle}
          </h1>
          <div className="w-32"></div>
        </div>

        {/* Images de destination - pleine largeur, sans espaces, sans arrondis */}
        {coverImages.length > 0 ? (
          <div className="flex flex-col">
            {coverImages.map((imageUrl, index) => (
              <div key={index} className="relative h-80 w-full overflow-hidden">
                <img
                  src={imageUrl}
                  alt={`Destination ${index + 1}`}
                  className="w-full h-full object-cover"
                  style={{ objectFit: 'cover' }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-80 bg-muted/20 gap-4">
            <p className="text-muted-foreground text-sm">
              Les images de couverture seront affichées une fois générées
            </p>
            <Button 
              onClick={handleRefresh} 
              disabled={isRefreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Chargement...' : 'Rafraîchir'}
            </Button>
          </div>
        )}

        {/* Informations du voyage */}
        <div className="theme-bg p-6 rounded-b-lg" style={{ backgroundColor: colors.accent }}>
          {data.startDate && (
            <div className="flex items-center justify-center mb-2 text-base">
              <Calendar className="mr-2 h-5 w-5" style={{ color: colors.primary }} />
              <span style={{ color: colors.primary }}>
                {format(data.startDate, "dd MMMM yyyy", { locale: fr })}
                {data.endDate &&
                  data.endDate !== data.startDate && (
                    <> - {format(data.endDate, "dd MMMM yyyy", { locale: fr })}</>
                  )}
              </span>
            </div>
          )}

          <div className="flex items-center justify-center">
            <Clock className="mr-2 h-5 w-5" style={{ color: colors.primary }} />
            <span className="text-base" style={{ color: colors.primary }}>
              {data.totalDays} jour{data.totalDays > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Itinéraire */}
      <div className="section-break mb-12">
        <h2 className="text-2xl font-bold mb-4 theme-text border-b-2 theme-border pb-2">
          Itinéraire détaillé
        </h2>

        <DynamicItinerary
          data={data}
          options={options}
          tripId={tripId}
        />
      </div>

      {/* Section de remerciement */}
      <div className="section-break mb-12">
        <ThankYouSection />
      </div>

      {/* Informations générales */}
      <div className="section-break mb-12">
        <h2 className="text-2xl font-bold mb-4 theme-text border-b-2 theme-border pb-2">
          Informations complémentaires
        </h2>

        <GeneralInfoSection tripId={tripId} options={options} />
      </div>

      {/* Contacts d'urgence */}
      <div className="section-break mb-12">
        <EmergencyContactsSection tripId={tripId} />
      </div>

      {/* Documents de référence */}
      {options.includeDocuments && (
        <div className="section-break mb-12">
          <h2 className="text-2xl font-bold mb-6 theme-text border-b-2 theme-border pb-2">
            Documents de référence
          </h2>

          {data.segments.filter(s => s.documents).length === 0 ? (
            <p className="text-gray-500">Aucun document source trouvé.</p>
          ) : (
            <div className="space-y-4">
              {data.segments
                .filter(s => s.documents)
                .map(
                  segment =>
                    segment.documents && (
                      <div key={segment.id} className="border rounded p-4">
                        <h4 className="font-semibold mb-2 flex items-center">
                          <FileText className="mr-2 h-4 w-4 theme-text" />
                          {segment.title}
                        </h4>
                        <div className="text-sm text-gray-600">
                          <p><strong>Fichier:</strong> {segment.documents.file_name}</p>
                          <p><strong>Type:</strong> {segment.documents.file_type}</p>
                          <p>
                            <strong>Uploadé le:</strong>{" "}
                            {format(new Date(segment.documents.created_at), "dd/MM/yyyy à HH:mm", { locale: fr })}
                          </p>
                        </div>
                      </div>
                    )
                )}
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="section-break">
        <h2 className="text-2xl font-bold mb-6 theme-text border-b-2 theme-border pb-2">
          Notes personnelles
        </h2>
        <div className="space-y-6 mt-8">
          {Array.from({ length: 24 }).map((_, index) => (
            <div 
              key={index} 
              className="border-b border-gray-300 h-8"
              style={{ pageBreakInside: 'avoid' }}
            />
          ))}
        </div>
      </div>

      <div className="text-center text-sm text-gray-500 mt-8 pt-4 border-t">
        <p>Carnet généré le {format(new Date(), "dd MMMM yyyy à HH:mm", { locale: fr })}</p>
        <p>Travel Booklet Builder - Votre compagnon de voyage numérique</p>
      </div>
    </div>
  );
}