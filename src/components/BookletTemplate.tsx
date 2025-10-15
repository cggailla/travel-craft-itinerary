import { BookletData, BookletOptions } from "@/services/bookletService";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FileText } from "lucide-react";
import { DynamicItinerary } from "./DynamicItinerary";
import { ThankYouSection } from "./ThankYouSection";
import { GeneralInfoSection } from "./GeneralInfoSection";
import { EmergencyContactsSection } from "./EmergencyContactsSection";
import { ImageUploader } from "./ImageUploader";
import { useState, useEffect } from "react";
import logoAdgentes from "@/assets/logo-adgentes.png";
import { listSessionImages, SupabaseImage } from "@/services/supabaseImageService";
import {
  getBookletDOMSnapshot,
  debugLogBookletDOM,
  openBookletSnapshotWindow,
  getBookletDOMFullSnapshot,
  getBookletDOMRawExport,
} from "@/services/domExtractorService";

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
  const [editableTitle, setEditableTitle] = useState(data.tripTitle);
  const [coverImage1, setCoverImage1] = useState<SupabaseImage | undefined>();
  const [coverImage2, setCoverImage2] = useState<SupabaseImage | undefined>();

  // Load cover images from Supabase
  useEffect(() => {
    const loadCoverImages = async () => {
      const result = await listSessionImages(tripId);
      if (result.success && result.data) {
        const cover1 = result.data.find(img => img.storage_path.includes('cover_1'));
        const cover2 = result.data.find(img => img.storage_path.includes('cover_2'));
        
        if (cover1) setCoverImage1(cover1);
        if (cover2) setCoverImage2(cover2);
      }
    };
    loadCoverImages();
  }, [tripId]);

  const handleCoverImage1Uploaded = (image: SupabaseImage) => {
    setCoverImage1(image);
  };

  const handleCoverImage2Uploaded = (image: SupabaseImage) => {
    setCoverImage2(image);
  };

  const handleCoverImage1Deleted = () => {
    setCoverImage1(undefined);
  };

  const handleCoverImage2Deleted = () => {
    setCoverImage2(undefined);
  };

  // Couleur fixe Adgentes
  const colors = { primary: "#822a62", secondary: "#c084ab", accent: "#f5e6f0" };

  const templateStyles = { classic: "font-serif", modern: "font-sans", minimal: "font-mono" as const };

  return (
    <div 
      id="booklet-content" 
      className={`${templateStyles[options.template]} text-gray-900`}
      data-pdf-title={editableTitle}
      data-pdf-start-date={data.startDate?.toISOString()}
      data-pdf-end-date={data.endDate?.toISOString()}
      data-pdf-destination={data.destinations?.[0]}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            /* Configuration de base pour A4 */
            @page {
              size: A4;
              margin: 15mm 12mm;
            }
            
            /* RÈGLES FLUIDES - Contrôle des orphelines et veuves */
            p, div, span {
              orphans: 3;
              widows: 3;
            }
            
            /* === GROUPES INSÉCABLES (unités atomiques seulement) === */
            
            /* Header d'étape : reste collé au premier paragraphe */
            .step-header-group,
            .step-header {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
            }
            
            /* Paragraphes individuels non coupables */
            .step-description-paragraph {
              page-break-inside: avoid;
              break-inside: avoid;
              orphans: 3;
              widows: 3;
              margin-bottom: 8px;
            }
            
            /* Segments : unités atomiques insécables */
            .segment-card {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              margin-bottom: 12px;
            }
            
            /* Items d'image individuels (pas la grille entière) */
            .image-item {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            
            /* Notes */
            .step-notes {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            
            /* Classe générique keep-together */
            .keep-together {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            
            /* === GRILLES D'IMAGES === */
            /* La grille elle-même PEUT se couper entre les lignes */
            .day-images {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 8px;
              margin: 12px 0;
              /* PAS de page-break-inside: avoid ici */
            }
            
            /* Chaque image reste intacte */
            .image-item img {
              max-width: 100%;
              height: auto;
              display: block;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            
            .image-caption {
              font-size: 9px;
              margin-top: 4px;
              page-break-before: avoid;
            }
            
            /* === IMAGES GÉNÉRALES === */
            img {
              max-height: 180mm !important;
              width: auto !important;
              height: auto !important;
              object-fit: contain !important;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            
            /* Images de couverture : plus grandes */
            .cover-image img {
              max-height: 240mm !important;
            }
            
            /* === SAUTS DE PAGE FORCÉS === */
            /* Uniquement pour les sections majeures */
            .section-break {
              page-break-before: always !important;
              break-before: page !important;
            }
            
            /* === MASQUAGE === */
            .no-print { 
              display: none !important; 
            }

            .print-only {
              display: block !important;
            }
            
            /* === OPTIMISATION QUALITÉ === */
            img {
              image-rendering: -webkit-optimize-contrast;
              image-rendering: crisp-edges;
            }
            
            /* Éviter les espaces blancs excessifs */
            .itinerary-step {
              margin-bottom: 16px;
            }
            
            /* Premier jour reste sur page 1 si possible */
            .itinerary-step:first-of-type {
              page-break-before: avoid;
            }
          }

          /* En mode écran, masquer les éléments print-only */
          @media screen {
            .print-only {
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
        {/* Header simple */}
        <div className="p-4 border-b-2 border-gray-800 flex items-center justify-between">
          <img 
            src={logoAdgentes} 
            alt="Adgentes" 
            className="h-8 object-contain"
          />
          <h1 
            className="text-xl font-bold text-gray-900 uppercase outline-none"
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => setEditableTitle(e.currentTarget.textContent || data.tripTitle)}
            data-pdf-cover-destination
          >
            {editableTitle}
          </h1>
        </div>

        {/* Images de couverture - Zone d'upload (masquée à l'impression) */}
        <div className="no-print">
          <ImageUploader
            tripId={tripId}
            imageType="cover"
            position={1}
            currentImage={coverImage1}
            onImageUploaded={handleCoverImage1Uploaded}
            onImageDeleted={handleCoverImage1Deleted}
          />
          <ImageUploader
            tripId={tripId}
            imageType="cover"
            position={2}
            currentImage={coverImage2}
            onImageUploaded={handleCoverImage2Uploaded}
            onImageDeleted={handleCoverImage2Deleted}
          />
        </div>

        {/* Images de couverture - Affichage pour le PDF */}
        <div className="print-only">
          {coverImage1 && (
            <div className="w-full cover-image">
              <img
                src={coverImage1.public_url}
                alt="Couverture 1"
                className="w-full h-auto object-contain"
                data-pdf-cover-image="1"
              />
            </div>
          )}
          {coverImage2 && (
            <div className="w-full cover-image">
              <img
                src={coverImage2.public_url}
                alt="Couverture 2"
                className="w-full h-auto object-contain"
                data-pdf-cover-image="2"
              />
            </div>
          )}
        </div>

        {/* Informations du voyage - simplifié */}
        <div className="p-4 bg-gray-50 text-center text-sm text-gray-700">
          {data.startDate && (
            <p className="mb-1">
              <span data-pdf-cover-start-date>
                {format(data.startDate, "dd/MM/yyyy", { locale: fr })}
              </span>
              {data.endDate && data.endDate !== data.startDate && (
                <>
                  {" - "}
                  <span data-pdf-cover-end-date>
                    {format(data.endDate, "dd/MM/yyyy", { locale: fr })}
                  </span>
                </>
              )}
            </p>
          )}
          <p>{data.totalDays} jour{data.totalDays > 1 ? "s" : ""}</p>
        </div>

      </div>

      {/* Itinéraire */}
      <div className="section-break mb-12">
        <h2 className="text-lg font-bold mb-6 text-gray-900 uppercase">
          Programme détaillé
        </h2>

        <DynamicItinerary
          data={data}
          options={options}
          tripId={tripId}
        />
      </div>

      {/* Section de remerciement */}
      <div className="section-break mb-12" data-pdf-thank-you>
        <ThankYouSection />
      </div>

      {/* Informations générales */}
      <div className="section-break mb-12" data-pdf-general-info>
        <h2 className="text-lg font-bold mb-4 text-gray-900 uppercase">
          Informations complémentaires
        </h2>

        <GeneralInfoSection tripId={tripId} options={options} />
      </div>

      {/* Contacts d'urgence */}
      <div className="section-break mb-12">
        <h2 className="text-lg font-bold mb-4 text-gray-900 uppercase">
          Contacts d'urgence
        </h2>
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