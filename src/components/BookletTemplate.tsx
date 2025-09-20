import { BookletData, BookletOptions, formatSegmentType, getSegmentIcon } from "@/services/bookletService";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, MapPin, Clock, FileText, User, Phone } from "lucide-react";

interface BookletTemplateProps {
  data: BookletData;
  options: BookletOptions;
}

export function BookletTemplate({ data, options }: BookletTemplateProps) {
  const getThemeColors = (theme: string) => {
    switch (theme) {
      case 'green':
        return {
          primary: '#22c55e',
          secondary: '#16a34a',
          accent: '#dcfce7'
        };
      case 'orange':
        return {
          primary: '#f97316',
          secondary: '#ea580c',
          accent: '#fed7aa'
        };
      default: // blue
        return {
          primary: '#3b82f6',
          secondary: '#2563eb',
          accent: '#dbeafe'
        };
    }
  };

  const colors = getThemeColors(options.colorTheme);

  const templateStyles = {
    classic: 'font-serif',
    modern: 'font-sans',
    minimal: 'font-mono'
  };

  return (
    <div id="booklet-content" className={`${templateStyles[options.template]} text-gray-900`}>
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            .page-break {
              page-break-before: always;
            }
            .no-print {
              display: none !important;
            }
          }
          .theme-bg {
            background-color: ${colors.accent};
          }
          .theme-border {
            border-color: ${colors.primary};
          }
          .theme-text {
            color: ${colors.primary};
          }
        `
      }} />

      {/* Page de couverture */}
      <div className="text-center mb-12">
        <div className="theme-bg p-8 rounded-lg">
          <h1 className="text-4xl font-bold mb-4 theme-text">
            {data.tripTitle}
          </h1>
          <div className="text-xl text-gray-600 mb-6">
            Carnet de Voyage
          </div>
          
          {data.startDate && (
            <div className="flex items-center justify-center mb-4 text-lg">
              <Calendar className="mr-2 h-5 w-5 theme-text" />
              <span>
                {format(data.startDate, 'dd MMMM yyyy', { locale: fr })}
                {data.endDate && data.endDate !== data.startDate && (
                  <> - {format(data.endDate, 'dd MMMM yyyy', { locale: fr })}</>
                )}
              </span>
            </div>
          )}
          
          <div className="flex items-center justify-center mb-4">
            <Clock className="mr-2 h-5 w-5 theme-text" />
            <span className="text-lg">
              {data.totalDays} jour{data.totalDays > 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="flex items-center justify-center">
            <MapPin className="mr-2 h-5 w-5 theme-text" />
            <span className="text-lg">
              {data.destinations.length} destination{data.destinations.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Table des matières */}
      <div className="page-break mb-12">
        <h2 className="text-2xl font-bold mb-6 theme-text border-b-2 theme-border pb-2">
          Sommaire
        </h2>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Résumé du voyage</span>
            <span>3</span>
          </div>
          <div className="flex justify-between">
            <span>Itinéraire détaillé</span>
            <span>4</span>
          </div>
          {Object.entries(data.segmentsByType).map(([type, segments]) => (
            <div key={type} className="flex justify-between ml-4">
              <span>{getSegmentIcon(type)} {formatSegmentType(type)} ({segments.length})</span>
              <span>•</span>
            </div>
          ))}
          {options.includeDocuments && (
            <div className="flex justify-between">
              <span>Documents de référence</span>
              <span>{data.timeline.length + 10}</span>
            </div>
          )}
        </div>
      </div>

      {/* Résumé du voyage */}
      <div className="page-break mb-12">
        <h2 className="text-2xl font-bold mb-6 theme-text border-b-2 theme-border pb-2">
          Résumé du voyage
        </h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-3 theme-text">Informations générales</h3>
            <div className="space-y-2">
              <p><strong>Titre:</strong> {data.tripTitle}</p>
              {data.startDate && (
                <p><strong>Dates:</strong> {format(data.startDate, 'dd/MM/yyyy', { locale: fr })}
                {data.endDate && data.endDate !== data.startDate && (
                  <> - {format(data.endDate, 'dd/MM/yyyy', { locale: fr })}</>
                )}</p>
              )}
              <p><strong>Durée:</strong> {data.totalDays} jour{data.totalDays > 1 ? 's' : ''}</p>
              <p><strong>Nombre de segments:</strong> {data.segments.length}</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3 theme-text">Destinations</h3>
            <div className="space-y-1">
              {data.destinations.slice(0, 10).map((destination, index) => (
                <div key={index} className="flex items-center">
                  <MapPin className="mr-2 h-4 w-4 theme-text" />
                  <span className="text-sm">{destination}</span>
                </div>
              ))}
              {data.destinations.length > 10 && (
                <p className="text-sm text-gray-500">... et {data.destinations.length - 10} autres</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3 theme-text">Types d'activités</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(data.segmentsByType).map(([type, segments]) => (
              <div key={type} className="theme-bg p-3 rounded flex items-center">
                <span className="text-lg mr-2">{getSegmentIcon(type)}</span>
                <div>
                  <div className="font-medium">{formatSegmentType(type)}</div>
                  <div className="text-sm text-gray-600">{segments.length} élément{segments.length > 1 ? 's' : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Itinéraire jour par jour */}
      <div className="page-break mb-12">
        <h2 className="text-2xl font-bold mb-6 theme-text border-b-2 theme-border pb-2">
          Itinéraire détaillé
        </h2>
        
        {data.timeline.length === 0 ? (
          <p className="text-gray-500">Aucun segment avec date trouvé.</p>
        ) : (
          <div className="space-y-8">
            {data.timeline.map((day, dayIndex) => (
              <div key={dayIndex} className="border rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4 theme-text flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  {format(day.date, 'EEEE dd MMMM yyyy', { locale: fr })}
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({day.segments.length} activité{day.segments.length > 1 ? 's' : ''})
                  </span>
                </h3>
                
                <div className="space-y-4">
                  {day.segments.map((segment, segmentIndex) => (
                    <div key={segment.id} className="border-l-4 theme-border pl-4 py-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className="text-lg mr-2">{getSegmentIcon(segment.segment_type)}</span>
                            <h4 className="font-semibold text-lg">{segment.title}</h4>
                            <span className="ml-2 px-2 py-1 theme-bg rounded text-sm">
                              {formatSegmentType(segment.segment_type)}
                            </span>
                          </div>
                          
                          {segment.provider && (
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Prestataire:</strong> {segment.provider}
                            </p>
                          )}
                          
                          {segment.reference_number && (
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Référence:</strong> {segment.reference_number}
                            </p>
                          )}
                          
                          {segment.address && (
                            <div className="flex items-center text-sm text-gray-600 mb-1">
                              <MapPin className="mr-1 h-3 w-3" />
                              {segment.address}
                            </div>
                          )}
                          
                          {segment.start_date && (
                            <div className="flex items-center text-sm text-gray-600 mb-2">
                              <Clock className="mr-1 h-3 w-3" />
                              {format(new Date(segment.start_date), 'HH:mm')}
                              {segment.end_date && segment.end_date !== segment.start_date && (
                                <> - {format(new Date(segment.end_date), 'HH:mm')}</>
                              )}
                            </div>
                          )}
                          
                          {options.includeNotes && segment.description && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                              <strong>Description:</strong> {segment.description}
                            </div>
                          )}
                        </div>
                        
                        {segment.confidence && (
                          <div className="text-right text-xs text-gray-500">
                            Confiance: {Math.round(segment.confidence * 100)}%
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documents de référence */}
      {options.includeDocuments && (
        <div className="page-break mb-12">
          <h2 className="text-2xl font-bold mb-6 theme-text border-b-2 theme-border pb-2">
            Documents de référence
          </h2>
          
          {data.segments.filter(s => s.documents).length === 0 ? (
            <p className="text-gray-500">Aucun document source trouvé.</p>
          ) : (
            <div className="space-y-4">
              {data.segments
                .filter(s => s.documents)
                .map(segment => (
                  segment.documents && (
                    <div key={segment.id} className="border rounded p-4">
                      <h4 className="font-semibold mb-2 flex items-center">
                        <FileText className="mr-2 h-4 w-4 theme-text" />
                        {segment.title}
                      </h4>
                      <div className="text-sm text-gray-600">
                        <p><strong>Fichier:</strong> {segment.documents.file_name}</p>
                        <p><strong>Type:</strong> {segment.documents.file_type}</p>
                        <p><strong>Uploadé le:</strong> {format(new Date(segment.documents.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}</p>
                      </div>
                    </div>
                  )
                ))}
            </div>
          )}
        </div>
      )}

      {/* Notes personnelles */}
      <div className="page-break">
        <h2 className="text-2xl font-bold mb-6 theme-text border-b-2 theme-border pb-2">
          Notes personnelles
        </h2>
        
        <div className="space-y-6">
          <div className="border rounded p-4 min-h-[200px]">
            <h3 className="font-semibold mb-2">Impressions générales</h3>
            <div className="bg-gray-50 p-4 rounded min-h-[150px]">
              {/* Espace pour notes manuscrites */}
            </div>
          </div>
          
          <div className="border rounded p-4 min-h-[200px]">
            <h3 className="font-semibold mb-2">Recommandations pour la prochaine fois</h3>
            <div className="bg-gray-50 p-4 rounded min-h-[150px]">
              {/* Espace pour notes manuscrites */}
            </div>
          </div>
          
          <div className="border rounded p-4 min-h-[200px]">
            <h3 className="font-semibold mb-2">Contacts utiles</h3>
            <div className="bg-gray-50 p-4 rounded min-h-[150px]">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="flex items-center mb-2">
                    <User className="mr-1 h-3 w-3" />
                    <strong>Nom:</strong>
                  </div>
                  <div className="flex items-center mb-2">
                    <Phone className="mr-1 h-3 w-3" />
                    <strong>Téléphone:</strong>
                  </div>
                </div>
                <div>
                  <div className="flex items-center mb-2">
                    <User className="mr-1 h-3 w-3" />
                    <strong>Nom:</strong>
                  </div>
                  <div className="flex items-center mb-2">
                    <Phone className="mr-1 h-3 w-3" />
                    <strong>Téléphone:</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="text-center text-sm text-gray-500 mt-8 pt-4 border-t">
        <p>Carnet généré le {format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}</p>
        <p>Travel Booklet Builder - Votre compagnon de voyage numérique</p>
      </div>
    </div>
  );
}