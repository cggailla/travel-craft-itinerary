import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BookletPreview } from "./BookletPreview";
import { 
  getBookletData, 
  BookletData, 
  BookletOptions, 
  defaultBookletOptions 
} from "@/services/bookletService";
import { 
  Download, 
  Eye, 
  Settings, 
  FileText,
  Loader2,
  Calendar,
  MapPin,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import html2pdf from "html2pdf.js";

interface BookletGeneratorProps {
  tripId: string;
}

export function BookletGenerator({ tripId }: BookletGeneratorProps) {
  const [bookletData, setBookletData] = useState<BookletData | null>(null);
  const [options, setOptions] = useState<BookletOptions>(defaultBookletOptions);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [activeTab, setActiveTab] = useState("preview");
  const { toast } = useToast();

  useEffect(() => {
    loadBookletData();
  }, [tripId]);

  const loadBookletData = async () => {
    try {
      setIsLoading(true);
      const data = await getBookletData(tripId);
      setBookletData(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du voyage.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!bookletData) return;
    
    try {
      setIsGeneratingPdf(true);
      
      // Récupérer l'élément HTML à convertir
      const element = document.getElementById('booklet-content');
      if (!element) {
        throw new Error('Contenu du carnet introuvable');
      }

      // Configuration PDF
      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `carnet-voyage-${bookletData.tripTitle.toLowerCase().replace(/\s+/g, '-')}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' as const
        }
      };

      // Générer le PDF
      await html2pdf().set(opt).from(element).save();
      
      toast({
        title: "PDF généré",
        description: "Votre carnet de voyage a été téléchargé avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de générer le PDF.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const updateOptions = (key: keyof BookletOptions, value: any) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement des données du voyage...</p>
        </div>
      </div>
    );
  }

  if (!bookletData) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">Aucune donnée disponible</h3>
        <p className="text-muted-foreground mb-4">
          Aucun segment validé trouvé pour ce voyage.
        </p>
        <Button onClick={loadBookletData} variant="outline">
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec informations du voyage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <FileText className="mr-3 h-6 w-6 text-primary" />
            {bookletData.tripTitle}
          </CardTitle>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {bookletData.startDate && (
              <div className="flex items-center">
                <Calendar className="mr-1 h-4 w-4" />
                {bookletData.startDate.toLocaleDateString('fr-FR')}
                {bookletData.endDate && ` - ${bookletData.endDate.toLocaleDateString('fr-FR')}`}
              </div>
            )}
            <div className="flex items-center">
              <Clock className="mr-1 h-4 w-4" />
              {bookletData.totalDays} jour{bookletData.totalDays > 1 ? 's' : ''}
            </div>
            <div className="flex items-center">
              <MapPin className="mr-1 h-4 w-4" />
              {bookletData.segments.length} segment{bookletData.segments.length > 1 ? 's' : ''}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(bookletData.segmentsByType).map(([type, segments]) => (
              <Badge key={type} variant="secondary">
                {type}: {segments.length}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Interface à onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="preview" className="flex items-center">
            <Eye className="mr-2 h-4 w-4" />
            Aperçu
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            Options
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="mt-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Aperçu du carnet</h3>
              <Button 
                onClick={handleGeneratePdf}
                disabled={isGeneratingPdf}
                className="flex items-center"
              >
                {isGeneratingPdf ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {isGeneratingPdf ? 'Génération...' : 'Télécharger PDF'}
              </Button>
            </div>
            
            <BookletPreview data={bookletData} options={options} />
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Personnalisation du carnet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Template */}
              <div className="space-y-2">
                <Label>Modèle</Label>
                <Select 
                  value={options.template} 
                  onValueChange={(value: any) => updateOptions('template', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classic">Classique</SelectItem>
                    <SelectItem value="modern">Moderne</SelectItem>
                    <SelectItem value="minimal">Minimaliste</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Couleur */}
              <div className="space-y-2">
                <Label>Thème de couleur</Label>
                <Select 
                  value={options.colorTheme} 
                  onValueChange={(value: any) => updateOptions('colorTheme', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blue">Bleu océan</SelectItem>
                    <SelectItem value="green">Vert nature</SelectItem>
                    <SelectItem value="orange">Orange coucher de soleil</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Options d'inclusion */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Sections à inclure</Label>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="include-docs">Documents sources</Label>
                    <p className="text-sm text-muted-foreground">
                      Inclure les références aux documents uploadés
                    </p>
                  </div>
                  <Switch
                    id="include-docs"
                    checked={options.includeDocuments}
                    onCheckedChange={(checked) => updateOptions('includeDocuments', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="include-notes">Notes et descriptions</Label>
                    <p className="text-sm text-muted-foreground">
                      Inclure les descriptions détaillées des segments
                    </p>
                  </div>
                  <Switch
                    id="include-notes"
                    checked={options.includeNotes}
                    onCheckedChange={(checked) => updateOptions('includeNotes', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="include-maps">Cartes (bientôt)</Label>
                    <p className="text-sm text-muted-foreground">
                      Inclure des cartes des destinations
                    </p>
                  </div>
                  <Switch
                    id="include-maps"
                    checked={options.includeMaps}
                    onCheckedChange={(checked) => updateOptions('includeMaps', checked)}
                    disabled
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}