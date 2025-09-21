import { useState } from "react";
import { BookletData, BookletOptions, formatSegmentType, getSegmentIcon } from "@/services/bookletService";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, MapPin, Clock, User, Phone, Edit3, Save, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { DynamicItinerary } from "./DynamicItinerary";

interface EditableBookletTemplateProps {
  data: BookletData;
  options: BookletOptions;
  tripId: string;
}

interface EditableData extends BookletData {
  personalNotes?: {
    generalImpressions: string;
    recommendations: string;
    contacts: Array<{ name: string; phone: string }>;
  };
}

export function EditableBookletTemplate({
  data,
  options,
  tripId
}: EditableBookletTemplateProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editableData, setEditableData] = useState<EditableData>({
    ...data,
    personalNotes: {
      generalImpressions: "",
      recommendations: "",
      contacts: [
        { name: "", phone: "" },
        { name: "", phone: "" }
      ]
    }
  });

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
      default:
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

  const handleSave = () => {
    setIsEditing(false);
    // Ici on pourrait sauvegarder les données modifiées
    console.log('Sauvegarde des données:', editableData);
  };

  const handleCancel = () => {
    setEditableData({ ...data, personalNotes: editableData.personalNotes });
    setIsEditing(false);
  };

  const updateField = (field: keyof EditableData, value: any) => {
    setEditableData(prev => ({ ...prev, [field]: value }));
  };

  const updatePersonalNotes = (field: keyof NonNullable<EditableData['personalNotes']>, value: any) => {
    setEditableData(prev => ({
      ...prev,
      personalNotes: {
        ...prev.personalNotes!,
        [field]: value
      }
    }));
  };

  return (
    <div id="booklet-content" className={`${templateStyles[options.template]} text-gray-900 relative`}>
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

      {/* Boutons de contrôle d'édition */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        {!isEditing ? (
          <Button
            onClick={() => setIsEditing(true)}
            variant="outline"
            size="sm"
            className="bg-white/90 backdrop-blur-sm shadow-lg border-2 hover:scale-105 transition-all duration-200"
          >
            <Edit3 className="mr-2 h-4 w-4" />
            Modifier
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              size="sm"
              className="bg-green-500 hover:bg-green-600 text-white shadow-lg hover:scale-105 transition-all duration-200"
            >
              <Save className="mr-2 h-4 w-4" />
              Sauvegarder
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              size="sm"
              className="bg-white/90 backdrop-blur-sm shadow-lg border-2 hover:scale-105 transition-all duration-200"
            >
              <X className="mr-2 h-4 w-4" />
              Annuler
            </Button>
          </div>
        )}
      </div>

      {/* Page de couverture */}
      <div className="text-center mb-12">
        <div className="theme-bg p-8 rounded-lg">
          {isEditing ? (
            <Input
              value={editableData.tripTitle}
              onChange={(e) => updateField('tripTitle', e.target.value)}
              className="text-4xl font-bold mb-4 text-center border-2 border-dashed border-primary/30 bg-white/80 backdrop-blur-sm"
              style={{ color: colors.primary }}
            />
          ) : (
            <h1 className="text-4xl font-bold mb-4 theme-text">
              {editableData.tripTitle}
            </h1>
          )}
          
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
              <p><strong>Titre:</strong> {editableData.tripTitle}</p>
              {data.startDate && (
                <p><strong>Dates:</strong> {format(data.startDate, 'dd/MM/yyyy', { locale: fr })}
                  {data.endDate && data.endDate !== data.startDate && (
                    <> - {format(data.endDate, 'dd/MM/yyyy', { locale: fr })}</>
                  )}
                </p>
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
        
        <DynamicItinerary data={data} options={options} tripId={tripId} />
      </div>

      {/* Notes personnelles */}
      <div className="page-break">
        <h2 className="text-2xl font-bold mb-6 theme-text border-b-2 theme-border pb-2">
          Notes personnelles
        </h2>
        
        <div className="space-y-6">
          <div className="border rounded p-4 min-h-[200px]">
            <h3 className="font-semibold mb-2">Impressions générales</h3>
            <div className="bg-gray-50 p-4 rounded min-h-[150px]">
              {isEditing ? (
                <Textarea
                  value={editableData.personalNotes?.generalImpressions || ""}
                  onChange={(e) => updatePersonalNotes('generalImpressions', e.target.value)}
                  placeholder="Partagez vos impressions générales sur ce voyage..."
                  className="w-full h-32 border-2 border-dashed border-primary/30 bg-white/80 backdrop-blur-sm resize-none"
                />
              ) : (
                <div className="whitespace-pre-wrap text-gray-600">
                  {editableData.personalNotes?.generalImpressions || "Espace pour vos impressions générales..."}
                </div>
              )}
            </div>
          </div>
          
          <div className="border rounded p-4 min-h-[200px]">
            <h3 className="font-semibold mb-2">Recommandations pour la prochaine fois</h3>
            <div className="bg-gray-50 p-4 rounded min-h-[150px]">
              {isEditing ? (
                <Textarea
                  value={editableData.personalNotes?.recommendations || ""}
                  onChange={(e) => updatePersonalNotes('recommendations', e.target.value)}
                  placeholder="Notez vos recommandations pour un futur voyage..."
                  className="w-full h-32 border-2 border-dashed border-primary/30 bg-white/80 backdrop-blur-sm resize-none"
                />
              ) : (
                <div className="whitespace-pre-wrap text-gray-600">
                  {editableData.personalNotes?.recommendations || "Espace pour vos recommandations..."}
                </div>
              )}
            </div>
          </div>
          
          <div className="border rounded p-4 min-h-[200px]">
            <h3 className="font-semibold mb-2">Contacts utiles</h3>
            <div className="bg-gray-50 p-4 rounded min-h-[150px]">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {editableData.personalNotes?.contacts.map((contact, index) => (
                  <div key={index}>
                    <div className="flex items-center mb-2">
                      <User className="mr-1 h-3 w-3" />
                      <strong>Nom:</strong>
                      {isEditing ? (
                        <Input
                          value={contact.name}
                          onChange={(e) => {
                            const newContacts = [...editableData.personalNotes!.contacts];
                            newContacts[index].name = e.target.value;
                            updatePersonalNotes('contacts', newContacts);
                          }}
                          className="ml-2 h-6 text-xs border-dashed border-primary/30"
                          placeholder="Nom du contact"
                        />
                      ) : (
                        <span className="ml-2">{contact.name || "..."}</span>
                      )}
                    </div>
                    <div className="flex items-center mb-2">
                      <Phone className="mr-1 h-3 w-3" />
                      <strong>Téléphone:</strong>
                      {isEditing ? (
                        <Input
                          value={contact.phone}
                          onChange={(e) => {
                            const newContacts = [...editableData.personalNotes!.contacts];
                            newContacts[index].phone = e.target.value;
                            updatePersonalNotes('contacts', newContacts);
                          }}
                          className="ml-2 h-6 text-xs border-dashed border-primary/30"
                          placeholder="Numéro de téléphone"
                        />
                      ) : (
                        <span className="ml-2">{contact.phone || "..."}</span>
                      )}
                    </div>
                  </div>
                ))}
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