import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Info
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

  useEffect(() => {
    const fetchGeneralInfo = async () => {
      const { data, error } = await supabase
        .from("trip_general_info")
        .select("*")
        .eq("trip_id", tripId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching general info:", error);
      } else if (data) {
        setInfo(data as unknown as GeneralInfo);
      }
      setLoading(false);
    };

    fetchGeneralInfo();
  }, [tripId]);

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Chargement des informations générales...
      </div>
    );
  }

  if (!info) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Info className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <p>Les informations générales sont en cours de génération.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      {(info.capital || info.population || info.surface_area) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text">
              <Globe className="h-5 w-5" />
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
        </Card>
      )}

      {/* Timezone */}
      {info.timezone_info && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text">
              <Calendar className="h-5 w-5" />
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
        </Card>
      )}

      {/* Entry Requirements */}
      {info.entry_requirements && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text">
              <MapPin className="h-5 w-5" />
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
        </Card>
      )}

      {/* Health */}
      {info.health_requirements && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text">
              <Heart className="h-5 w-5" />
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
        </Card>
      )}

      {/* Clothing */}
      {info.clothing_advice && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text">
              <Shirt className="h-5 w-5" />
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
        </Card>
      )}

      {/* Food */}
      {info.food_specialties && info.food_specialties.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text">
              <UtensilsCrossed className="h-5 w-5" />
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
        </Card>
      )}

      {/* Currency */}
      {(info.currency || info.exchange_rate) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text">
              <Coins className="h-5 w-5" />
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
        </Card>
      )}

      {/* Budget */}
      {info.budget_info && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text">
              <Wallet className="h-5 w-5" />
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
        </Card>
      )}

      {/* Tipping */}
      {info.tipping_culture && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text">
              <Gift className="h-5 w-5" />
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
        </Card>
      )}

      {/* Electricity */}
      {info.electricity_info && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text">
              <Lightbulb className="h-5 w-5" />
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
        </Card>
      )}

      {/* Religion */}
      {info.religion_info && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text">
              <Building2 className="h-5 w-5" />
              Religion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{info.religion_info}</p>
          </CardContent>
        </Card>
      )}

      {/* Shopping */}
      {info.shopping_info && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text">
              <Gift className="h-5 w-5" />
              Achats / Shopping
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{info.shopping_info}</p>
          </CardContent>
        </Card>
      )}

      {/* Phone */}
      {info.phone_info && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text">
              <Phone className="h-5 w-5" />
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
        </Card>
      )}

      {/* Languages */}
      {info.languages && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text">
              <Languages className="h-5 w-5" />
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
                {info.languages.french_spoken ? "Oui" : "Peu"}
              </div>
            )}
            {info.languages.notes && (
              <div className="text-sm text-muted-foreground">{info.languages.notes}</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cultural Sites */}
      {info.cultural_sites && info.cultural_sites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text">
              <Building2 className="h-5 w-5" />
              Sites historiques & culturels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {info.cultural_sites.map((site, idx) => (
                <div key={idx} className="border-l-2 border-primary/20 pl-3">
                  <div className="font-medium">{site.name}</div>
                  <div className="text-sm text-muted-foreground">{site.description}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Nature */}
      {info.natural_attractions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text">
              <Trees className="h-5 w-5" />
              Nature & paysages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{info.natural_attractions}</p>
          </CardContent>
        </Card>
      )}

      {/* Safety */}
      {info.safety_info && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text">
              <Shield className="h-5 w-5" />
              Sécurité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{info.safety_info}</p>
          </CardContent>
        </Card>
      )}

      {/* Climate */}
      {info.climate_info && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 theme-text">
              <CloudSun className="h-5 w-5" />
              Climat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {info.climate_info.current_season && (
              <div>
                <strong className="block mb-1">Période du voyage:</strong>
                <p className="text-sm text-muted-foreground">
                  {info.climate_info.current_season}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {info.climate_info.summer && (
                <div>
                  <strong>Été:</strong>
                  <p className="text-muted-foreground">{info.climate_info.summer}</p>
                </div>
              )}
              {info.climate_info.winter && (
                <div>
                  <strong>Hiver:</strong>
                  <p className="text-muted-foreground">{info.climate_info.winter}</p>
                </div>
              )}
              {info.climate_info.autumn && (
                <div>
                  <strong>Automne:</strong>
                  <p className="text-muted-foreground">{info.climate_info.autumn}</p>
                </div>
              )}
              {info.climate_info.spring && (
                <div>
                  <strong>Printemps:</strong>
                  <p className="text-muted-foreground">{info.climate_info.spring}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
