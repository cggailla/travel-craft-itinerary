import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Globe, 
  MapPin, 
  Calendar, 
  Heart, 
  Shirt, 
  UtensilsCrossed, 
  Coins, 
  Wallet,
  Lightbulb,
  Phone,
  Languages,
  Building2,
  Trees,
  Shield,
  CloudSun,
  Gift,
  Info,
  RefreshCw
} from "lucide-react";
import { BookletOptions } from "@/services/bookletService";

interface GeneralInfoSectionProps {
  tripId: string;
  options: BookletOptions;
}

interface GeneralInfo {
  capital?: string;
  population?: string;
  surface_area?: string;
  timezone_info?: {
    main_timezone: string;
    offset_description: string;
  };
  entry_requirements?: {
    passport: string;
    visa: string;
    validity: string;
  };
  health_requirements?: {
    vaccines: string[];
    insurance_advice: string;
    water_safety: string;
  };
  currency?: string;
  exchange_rate?: string;
  budget_info?: {
    coffee: string;
    simple_meal: string;
    restaurant: string;
  };
  tipping_culture?: {
    required: boolean;
    restaurants: string;
    taxis: string;
    guides: string;
    porters: string;
  };
  electricity_info?: {
    voltage: string;
    plug_types: string[];
    adapter_needed: boolean;
  };
  phone_info?: {
    calling_to: string;
    calling_from: string;
    tips: string;
  };
  languages?: {
    official: string[];
    french_spoken: boolean;
    notes: string;
  };
  religion_info?: string;
  clothing_advice?: {
    season: string;
    temperatures: string;
    recommended: string[];
  };
  food_specialties?: Array<{
    region: string;
    specialty: string;
  }>;
  shopping_info?: string;
  cultural_sites?: Array<{
    name: string;
    description: string;
  }>;
  natural_attractions?: string;
  safety_info?: string;
  climate_info?: {
    current_season: string;
    summer: string;
    winter: string;
    autumn: string;
    spring: string;
  };
}

export function GeneralInfoSection({ tripId, options }: GeneralInfoSectionProps) {
  const [info, setInfo] = useState<GeneralInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [hiddenCards, setHiddenCards] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchGeneralInfo = async () => {
    console.log('🔍 Fetching general info for trip:', tripId);
    const { data, error } = await supabase
      .from("trip_general_info")
      .select("*")
      .eq("trip_id", tripId)
      .maybeSingle();

    if (error) {
      console.error("❌ Error fetching general info:", error);
      return false;
    } else if (data) {
      console.log('✅ General info data fetched:', data);
      setInfo(data as unknown as GeneralInfo);
      return true;
    } else {
      console.log('⚠️ No general info data found');
      return false;
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const success = await fetchGeneralInfo();
    setIsRefreshing(false);
    
    if (success) {
      toast({
        title: "Informations mises à jour",
        description: "Les informations générales ont été rechargées.",
      });
    } else {
      toast({
        title: "Aucune information disponible",
        description: "Les informations générales ne sont pas encore générées.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Initial fetch
    const initialFetch = async () => {
      await fetchGeneralInfo();
      setLoading(false);
    };
    initialFetch();
    
    // Poll every 5 seconds for new data if none is loaded
    const interval = setInterval(async () => {
      if (!info) {
        await fetchGeneralInfo();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [tripId, info]);

  const DeleteButton = ({ cardId }: { cardId: string }) => (
    <button
      onClick={() => setHiddenCards(prev => new Set(prev).add(cardId))}
      className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
      aria-label="Supprimer cette section"
    >
      <span className="text-white text-sm font-light">×</span>
    </button>
  );

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Chargement des informations générales...
      </div>
    );
  }

  if (!info) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-4">
        <Info className="h-12 w-12 mb-2 opacity-50" />
        <p>Les informations générales sont en cours de génération.</p>
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
    );
  }

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      {(info.capital || info.population || info.surface_area) && !hiddenCards.has('basic') && (
        <Card className="relative group">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text text-base">
              <Globe className="h-4 w-4" />
              Informations de base
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {info.capital && (
              <div>
                <strong>Capitale:</strong> {info.capital}
              </div>
            )}
            {info.population && (
              <div>
                <strong>Population:</strong> {info.population}
              </div>
            )}
            {info.surface_area && (
              <div>
                <strong>Superficie:</strong> {info.surface_area}
              </div>
            )}
          </CardContent>
          <DeleteButton cardId="basic" />
        </Card>
      )}

      {/* Timezone */}
      {info.timezone_info && !hiddenCards.has('timezone') && (
        <Card className="relative group">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text text-base">
              <Calendar className="h-4 w-4" />
              Décalage horaire
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <strong>Fuseau horaire:</strong> {info.timezone_info.main_timezone}
            </div>
            <div className="text-sm text-muted-foreground">
              {info.timezone_info.offset_description}
            </div>
          </CardContent>
          <DeleteButton cardId="timezone" />
        </Card>
      )}

      {/* Entry Requirements */}
      {info.entry_requirements && !hiddenCards.has('entry') && (
        <Card className="relative group">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text text-base">
              <MapPin className="h-4 w-4" />
              Formalités d'entrée
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <strong>Passeport:</strong> {info.entry_requirements.passport}
            </div>
            <div>
              <strong>Visa:</strong> {info.entry_requirements.visa}
            </div>
            <div>
              <strong>Durée autorisée:</strong> {info.entry_requirements.validity}
            </div>
          </CardContent>
          <DeleteButton cardId="entry" />
        </Card>
      )}

      {/* Health */}
      {info.health_requirements && !hiddenCards.has('health') && (
        <Card className="relative group">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text text-base">
              <Heart className="h-4 w-4" />
              Santé
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {info.health_requirements.vaccines && info.health_requirements.vaccines.length > 0 && (
              <div>
                <strong className="block mb-2">Vaccins recommandés:</strong>
                <div className="flex flex-wrap gap-2">
                  {info.health_requirements.vaccines.map((vaccine, idx) => (
                    <Badge key={idx} variant="secondary">
                      {vaccine}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {info.health_requirements.insurance_advice && (
              <div className="text-sm">{info.health_requirements.insurance_advice}</div>
            )}
            {info.health_requirements.water_safety && (
              <div className="text-sm">
                <strong>Eau potable:</strong> {info.health_requirements.water_safety}
              </div>
            )}
          </CardContent>
          <DeleteButton cardId="health" />
        </Card>
      )}

      {/* Clothing */}
      {info.clothing_advice && !hiddenCards.has('clothing') && (
        <Card className="relative group">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text text-base">
              <Shirt className="h-4 w-4" />
              Vêtements conseillés
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {info.clothing_advice.season && (
              <div>
                <strong>Saison:</strong> {info.clothing_advice.season}
              </div>
            )}
            {info.clothing_advice.temperatures && (
              <div>
                <strong>Températures:</strong> {info.clothing_advice.temperatures}
              </div>
            )}
            {info.clothing_advice.recommended && info.clothing_advice.recommended.length > 0 && (
              <div>
                <strong className="block mb-2">À prévoir:</strong>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {info.clothing_advice.recommended.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
          <DeleteButton cardId="clothing" />
        </Card>
      )}

      {/* Food */}
      {info.food_specialties && info.food_specialties.length > 0 && !hiddenCards.has('food') && (
        <Card className="relative group">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text text-base">
              <UtensilsCrossed className="h-4 w-4" />
              Nourriture
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {info.food_specialties.map((item, idx) => (
                <div key={idx} className="border-l-2 border-primary/20 pl-3">
                  <div className="font-medium">{item.region}</div>
                  <div className="text-sm text-muted-foreground">{item.specialty}</div>
                </div>
              ))}
            </div>
          </CardContent>
          <DeleteButton cardId="food" />
        </Card>
      )}

      {/* Currency */}
      {(info.currency || info.exchange_rate) && !hiddenCards.has('currency') && (
        <Card className="relative group">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text text-base">
              <Coins className="h-4 w-4" />
              Monnaie
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {info.currency && (
              <div>
                <strong>Devise:</strong> {info.currency}
              </div>
            )}
            {info.exchange_rate && (
              <div className="text-sm text-muted-foreground">{info.exchange_rate}</div>
            )}
          </CardContent>
          <DeleteButton cardId="currency" />
        </Card>
      )}

      {/* Budget */}
      {info.budget_info && !hiddenCards.has('budget') && (
        <Card className="relative group">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text text-base">
              <Wallet className="h-4 w-4" />
              Budget sur place
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {info.budget_info.coffee && (
              <div>
                <strong>Café:</strong> {info.budget_info.coffee}
              </div>
            )}
            {info.budget_info.simple_meal && (
              <div>
                <strong>Repas simple:</strong> {info.budget_info.simple_meal}
              </div>
            )}
            {info.budget_info.restaurant && (
              <div>
                <strong>Restaurant:</strong> {info.budget_info.restaurant}
              </div>
            )}
          </CardContent>
          <DeleteButton cardId="budget" />
        </Card>
      )}

      {/* Tipping */}
      {info.tipping_culture && !hiddenCards.has('tipping') && (
        <Card className="relative group">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text text-base">
              <Gift className="h-4 w-4" />
              Pourboires
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <strong>Usage:</strong> {info.tipping_culture.required ? "Attendu" : "Optionnel"}
            </div>
            {info.tipping_culture.restaurants && (
              <div>
                <strong>Restaurants:</strong> {info.tipping_culture.restaurants}
              </div>
            )}
            {info.tipping_culture.taxis && (
              <div>
                <strong>Taxis:</strong> {info.tipping_culture.taxis}
              </div>
            )}
            {info.tipping_culture.guides && (
              <div>
                <strong>Guides:</strong> {info.tipping_culture.guides}
              </div>
            )}
            {info.tipping_culture.porters && (
              <div>
                <strong>Porteurs:</strong> {info.tipping_culture.porters}
              </div>
            )}
          </CardContent>
          <DeleteButton cardId="tipping" />
        </Card>
      )}

      {/* Electricity */}
      {info.electricity_info && !hiddenCards.has('electricity') && (
        <Card className="relative group">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text text-base">
              <Lightbulb className="h-4 w-4" />
              Électricité
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {info.electricity_info.voltage && (
              <div>
                <strong>Voltage:</strong> {info.electricity_info.voltage}
              </div>
            )}
            {info.electricity_info.plug_types && info.electricity_info.plug_types.length > 0 && (
              <div>
                <strong>Types de prises:</strong>{" "}
                {info.electricity_info.plug_types.join(", ")}
              </div>
            )}
            {info.electricity_info.adapter_needed !== undefined && (
              <div className="text-sm">
                <strong>Adaptateur:</strong>{" "}
                {info.electricity_info.adapter_needed ? "Nécessaire" : "Non nécessaire"}
              </div>
            )}
          </CardContent>
          <DeleteButton cardId="electricity" />
        </Card>
      )}

      {/* Religion */}
      {info.religion_info && !hiddenCards.has('religion') && (
        <Card className="relative group">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text text-base">
              <Building2 className="h-4 w-4" />
              Religion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{info.religion_info}</p>
          </CardContent>
          <DeleteButton cardId="religion" />
        </Card>
      )}

      {/* Shopping */}
      {info.shopping_info && !hiddenCards.has('shopping') && (
        <Card className="relative group">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text text-base">
              <Gift className="h-4 w-4" />
              Achats / Shopping
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{info.shopping_info}</p>
          </CardContent>
          <DeleteButton cardId="shopping" />
        </Card>
      )}

      {/* Phone */}
      {info.phone_info && !hiddenCards.has('phone') && (
        <Card className="relative group">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text text-base">
              <Phone className="h-4 w-4" />
              Poste & Téléphone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {info.phone_info.calling_to && (
              <div>
                <strong>Appeler depuis la Suisse:</strong> {info.phone_info.calling_to}
              </div>
            )}
            {info.phone_info.calling_from && (
              <div>
                <strong>Appeler la Suisse:</strong> {info.phone_info.calling_from}
              </div>
            )}
            {info.phone_info.tips && (
              <div className="text-muted-foreground">{info.phone_info.tips}</div>
            )}
          </CardContent>
          <DeleteButton cardId="phone" />
        </Card>
      )}

      {/* Languages */}
      {info.languages && !hiddenCards.has('languages') && (
        <Card className="relative group">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text text-base">
              <Languages className="h-4 w-4" />
              Langue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {info.languages.official && info.languages.official.length > 0 && (
              <div>
                <strong>Langues officielles:</strong>{" "}
                {info.languages.official.join(", ")}
              </div>
            )}
            {info.languages.french_spoken !== undefined && (
              <div className="text-sm">
                <strong>Français parlé:</strong>{" "}
                {info.languages.french_spoken ? "Oui" : "Non"}
              </div>
            )}
            {info.languages.notes && (
              <div className="text-sm text-muted-foreground">{info.languages.notes}</div>
            )}
          </CardContent>
          <DeleteButton cardId="languages" />
        </Card>
      )}

      {/* Cultural Sites */}
      {info.cultural_sites && info.cultural_sites.length > 0 && !hiddenCards.has('cultural') && (
        <Card className="relative group">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text text-base">
              <Building2 className="h-4 w-4" />
              Sites culturels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {info.cultural_sites.map((site, idx) => (
                <div key={idx}>
                  <div className="font-medium">{site.name}</div>
                  <div className="text-sm text-muted-foreground">{site.description}</div>
                </div>
              ))}
            </div>
          </CardContent>
          <DeleteButton cardId="cultural" />
        </Card>
      )}

      {/* Natural Attractions */}
      {info.natural_attractions && !hiddenCards.has('natural') && (
        <Card className="relative group">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text text-base">
              <Trees className="h-4 w-4" />
              Attractions naturelles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{info.natural_attractions}</p>
          </CardContent>
          <DeleteButton cardId="natural" />
        </Card>
      )}

      {/* Safety */}
      {info.safety_info && !hiddenCards.has('safety') && (
        <Card className="relative group">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text text-base">
              <Shield className="h-4 w-4" />
              Sécurité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{info.safety_info}</p>
          </CardContent>
          <DeleteButton cardId="safety" />
        </Card>
      )}

      {/* Climate */}
      {info.climate_info && !hiddenCards.has('climate') && (
        <Card className="relative group">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text text-base">
              <CloudSun className="h-4 w-4" />
              Climat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {info.climate_info.current_season && (
              <div>
                <strong>Saison actuelle:</strong> {info.climate_info.current_season}
              </div>
            )}
            {info.climate_info.summer && (
              <div>
                <strong>Été:</strong> {info.climate_info.summer}
              </div>
            )}
            {info.climate_info.winter && (
              <div>
                <strong>Hiver:</strong> {info.climate_info.winter}
              </div>
            )}
            {info.climate_info.autumn && (
              <div>
                <strong>Automne:</strong> {info.climate_info.autumn}
              </div>
            )}
            {info.climate_info.spring && (
              <div>
                <strong>Printemps:</strong> {info.climate_info.spring}
              </div>
            )}
          </CardContent>
          <DeleteButton cardId="climate" />
        </Card>
      )}
    </div>
  );
}
