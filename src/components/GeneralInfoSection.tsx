import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
      className="ml-2 w-5 h-5 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      aria-label="Supprimer cette section"
    >
      <span className="text-white text-xs font-light">×</span>
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
    <div className="space-y-3">
      {/* Basic Information */}
      {(info.capital || info.population || info.surface_area) && !hiddenCards.has('basic') && (
        <div className="relative group keep-together">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="h-3.5 w-3.5 theme-text" />
            <h3 className="text-sm font-semibold theme-text">Informations de base</h3>
            <DeleteButton cardId="basic" />
          </div>
          <div className="space-y-0.5 text-xs ml-5">
            {info.capital && (
              <div>
                <span className="font-medium">Capitale:</span> {info.capital}
              </div>
            )}
            {info.population && (
              <div>
                <span className="font-medium">Population:</span> {info.population}
              </div>
            )}
            {info.surface_area && (
              <div>
                <span className="font-medium">Superficie:</span> {info.surface_area}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timezone */}
      {info.timezone_info && !hiddenCards.has('timezone') && (
        <div className="relative group keep-together">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-3.5 w-3.5 theme-text" />
            <h3 className="text-sm font-semibold theme-text">Décalage horaire</h3>
            <DeleteButton cardId="timezone" />
          </div>
          <div className="space-y-0.5 text-xs ml-5">
            <div>
              <span className="font-medium">Fuseau horaire:</span> {info.timezone_info.main_timezone}
            </div>
            <div className="text-muted-foreground">
              {info.timezone_info.offset_description}
            </div>
          </div>
        </div>
      )}

      {/* Entry Requirements */}
      {info.entry_requirements && !hiddenCards.has('entry') && (
        <div className="relative group keep-together">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-3.5 w-3.5 theme-text" />
            <h3 className="text-sm font-semibold theme-text">Formalités d'entrée</h3>
            <DeleteButton cardId="entry" />
          </div>
          <div className="space-y-0.5 text-xs ml-5">
            <div>
              <span className="font-medium">Passeport:</span> {info.entry_requirements.passport}
            </div>
            <div>
              <span className="font-medium">Visa:</span> {info.entry_requirements.visa}
            </div>
            <div>
              <span className="font-medium">Durée autorisée:</span> {info.entry_requirements.validity}
            </div>
          </div>
        </div>
      )}

      {/* Health */}
      {info.health_requirements && !hiddenCards.has('health') && (
        <div className="relative group keep-together">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="h-3.5 w-3.5 theme-text" />
            <h3 className="text-sm font-semibold theme-text">Santé</h3>
            <DeleteButton cardId="health" />
          </div>
          <div className="space-y-1 text-xs ml-5">
            {info.health_requirements.vaccines && info.health_requirements.vaccines.length > 0 && (
              <div>
                <span className="font-medium">Vaccins recommandés:</span> {info.health_requirements.vaccines.join(", ")}
              </div>
            )}
            {info.health_requirements.insurance_advice && (
              <div>{info.health_requirements.insurance_advice}</div>
            )}
            {info.health_requirements.water_safety && (
              <div>
                <span className="font-medium">Eau potable:</span> {info.health_requirements.water_safety}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clothing */}
      {info.clothing_advice && !hiddenCards.has('clothing') && (
        <div className="relative group keep-together">
          <div className="flex items-center gap-2 mb-1">
            <Shirt className="h-3.5 w-3.5 theme-text" />
            <h3 className="text-sm font-semibold theme-text">Vêtements conseillés</h3>
            <DeleteButton cardId="clothing" />
          </div>
          <div className="space-y-1 text-xs ml-5">
            {info.clothing_advice.season && (
              <div>
                <span className="font-medium">Saison:</span> {info.clothing_advice.season}
              </div>
            )}
            {info.clothing_advice.temperatures && (
              <div>
                <span className="font-medium">Températures:</span> {info.clothing_advice.temperatures}
              </div>
            )}
            {info.clothing_advice.recommended && info.clothing_advice.recommended.length > 0 && (
              <div>
                <span className="font-medium block mb-0.5">À prévoir:</span>
                <ul className="list-disc list-inside space-y-0.5">
                  {info.clothing_advice.recommended.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Food */}
      {info.food_specialties && info.food_specialties.length > 0 && !hiddenCards.has('food') && (
        <div className="relative group keep-together">
          <div className="flex items-center gap-2 mb-1">
            <UtensilsCrossed className="h-3.5 w-3.5 theme-text" />
            <h3 className="text-sm font-semibold theme-text">Nourriture</h3>
            <DeleteButton cardId="food" />
          </div>
          <div className="space-y-1 text-xs ml-5">
            {info.food_specialties.map((item, idx) => (
              <div key={idx} className="border-l border-primary/20 pl-2">
                <div className="font-medium">{item.region}</div>
                <div className="text-muted-foreground">{item.specialty}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Currency */}
      {(info.currency || info.exchange_rate) && !hiddenCards.has('currency') && (
        <div className="relative group keep-together">
          <div className="flex items-center gap-2 mb-1">
            <Coins className="h-3.5 w-3.5 theme-text" />
            <h3 className="text-sm font-semibold theme-text">Monnaie</h3>
            <DeleteButton cardId="currency" />
          </div>
          <div className="space-y-0.5 text-xs ml-5">
            {info.currency && (
              <div>
                <span className="font-medium">Devise:</span> {info.currency}
              </div>
            )}
            {info.exchange_rate && (
              <div className="text-muted-foreground">{info.exchange_rate}</div>
            )}
          </div>
        </div>
      )}

      {/* Budget */}
      {info.budget_info && !hiddenCards.has('budget') && (
        <div className="relative group keep-together">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="h-3.5 w-3.5 theme-text" />
            <h3 className="text-sm font-semibold theme-text">Budget sur place</h3>
            <DeleteButton cardId="budget" />
          </div>
          <div className="space-y-0.5 text-xs ml-5">
            {info.budget_info.coffee && (
              <div>
                <span className="font-medium">Café:</span> {info.budget_info.coffee}
              </div>
            )}
            {info.budget_info.simple_meal && (
              <div>
                <span className="font-medium">Repas simple:</span> {info.budget_info.simple_meal}
              </div>
            )}
            {info.budget_info.restaurant && (
              <div>
                <span className="font-medium">Restaurant:</span> {info.budget_info.restaurant}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tipping */}
      {info.tipping_culture && !hiddenCards.has('tipping') && (
        <div className="relative group keep-together">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="h-3.5 w-3.5 theme-text" />
            <h3 className="text-sm font-semibold theme-text">Pourboires</h3>
            <DeleteButton cardId="tipping" />
          </div>
          <div className="space-y-0.5 text-xs ml-5">
            <div>
              <span className="font-medium">Usage:</span> {info.tipping_culture.required ? "Attendu" : "Optionnel"}
            </div>
            {info.tipping_culture.restaurants && (
              <div>
                <span className="font-medium">Restaurants:</span> {info.tipping_culture.restaurants}
              </div>
            )}
            {info.tipping_culture.taxis && (
              <div>
                <span className="font-medium">Taxis:</span> {info.tipping_culture.taxis}
              </div>
            )}
            {info.tipping_culture.guides && (
              <div>
                <span className="font-medium">Guides:</span> {info.tipping_culture.guides}
              </div>
            )}
            {info.tipping_culture.porters && (
              <div>
                <span className="font-medium">Porteurs:</span> {info.tipping_culture.porters}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Electricity */}
      {info.electricity_info && !hiddenCards.has('electricity') && (
        <div className="relative group keep-together">
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="h-3.5 w-3.5 theme-text" />
            <h3 className="text-sm font-semibold theme-text">Électricité</h3>
            <DeleteButton cardId="electricity" />
          </div>
          <div className="space-y-0.5 text-xs ml-5">
            {info.electricity_info.voltage && (
              <div>
                <span className="font-medium">Voltage:</span> {info.electricity_info.voltage}
              </div>
            )}
            {info.electricity_info.plug_types && info.electricity_info.plug_types.length > 0 && (
              <div>
                <span className="font-medium">Types de prises:</span>{" "}
                {info.electricity_info.plug_types.join(", ")}
              </div>
            )}
            {info.electricity_info.adapter_needed !== undefined && (
              <div>
                <span className="font-medium">Adaptateur:</span>{" "}
                {info.electricity_info.adapter_needed ? "Nécessaire" : "Non nécessaire"}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Religion */}
      {info.religion_info && !hiddenCards.has('religion') && (
        <div className="relative group keep-together">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-3.5 w-3.5 theme-text" />
            <h3 className="text-sm font-semibold theme-text">Religion</h3>
            <DeleteButton cardId="religion" />
          </div>
          <p className="text-xs ml-5">{info.religion_info}</p>
        </div>
      )}

      {/* Shopping */}
      {info.shopping_info && !hiddenCards.has('shopping') && (
        <div className="relative group keep-together">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="h-3.5 w-3.5 theme-text" />
            <h3 className="text-sm font-semibold theme-text">Achats / Shopping</h3>
            <DeleteButton cardId="shopping" />
          </div>
          <p className="text-xs ml-5">{info.shopping_info}</p>
        </div>
      )}

      {/* Phone */}
      {info.phone_info && !hiddenCards.has('phone') && (
        <div className="relative group keep-together">
          <div className="flex items-center gap-2 mb-1">
            <Phone className="h-3.5 w-3.5 theme-text" />
            <h3 className="text-sm font-semibold theme-text">Poste & Téléphone</h3>
            <DeleteButton cardId="phone" />
          </div>
          <div className="space-y-0.5 text-xs ml-5">
            {info.phone_info.calling_to && (
              <div>
                <span className="font-medium">Appeler depuis la Suisse:</span> {info.phone_info.calling_to}
              </div>
            )}
            {info.phone_info.calling_from && (
              <div>
                <span className="font-medium">Appeler la Suisse:</span> {info.phone_info.calling_from}
              </div>
            )}
            {info.phone_info.tips && (
              <div className="text-muted-foreground">{info.phone_info.tips}</div>
            )}
          </div>
        </div>
      )}

      {/* Languages */}
      {info.languages && !hiddenCards.has('languages') && (
        <div className="relative group keep-together">
          <div className="flex items-center gap-2 mb-1">
            <Languages className="h-3.5 w-3.5 theme-text" />
            <h3 className="text-sm font-semibold theme-text">Langue</h3>
            <DeleteButton cardId="languages" />
          </div>
          <div className="space-y-0.5 text-xs ml-5">
            {info.languages.official && info.languages.official.length > 0 && (
              <div>
                <span className="font-medium">Langues officielles:</span>{" "}
                {info.languages.official.join(", ")}
              </div>
            )}
            {info.languages.french_spoken !== undefined && (
              <div>
                <span className="font-medium">Français parlé:</span>{" "}
                {info.languages.french_spoken ? "Oui" : "Non"}
              </div>
            )}
            {info.languages.notes && (
              <div className="text-muted-foreground">{info.languages.notes}</div>
            )}
          </div>
        </div>
      )}

      {/* Cultural Sites */}
      {info.cultural_sites && info.cultural_sites.length > 0 && !hiddenCards.has('cultural') && (
        <div className="relative group keep-together">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-3.5 w-3.5 theme-text" />
            <h3 className="text-sm font-semibold theme-text">Sites culturels</h3>
            <DeleteButton cardId="cultural" />
          </div>
          <div className="space-y-1 text-xs ml-5">
            {info.cultural_sites.map((site, idx) => (
              <div key={idx}>
                <div className="font-medium">{site.name}</div>
                <div className="text-muted-foreground">{site.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Natural Attractions */}
      {info.natural_attractions && !hiddenCards.has('natural') && (
        <div className="relative group keep-together">
          <div className="flex items-center gap-2 mb-1">
            <Trees className="h-3.5 w-3.5 theme-text" />
            <h3 className="text-sm font-semibold theme-text">Attractions naturelles</h3>
            <DeleteButton cardId="natural" />
          </div>
          <p className="text-xs ml-5">{info.natural_attractions}</p>
        </div>
      )}

      {/* Safety */}
      {info.safety_info && !hiddenCards.has('safety') && (
        <div className="relative group keep-together">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-3.5 w-3.5 theme-text" />
            <h3 className="text-sm font-semibold theme-text">Sécurité</h3>
            <DeleteButton cardId="safety" />
          </div>
          <p className="text-xs ml-5">{info.safety_info}</p>
        </div>
      )}

      {/* Climate */}
      {info.climate_info && !hiddenCards.has('climate') && (
        <div className="relative group keep-together">
          <div className="flex items-center gap-2 mb-1">
            <CloudSun className="h-3.5 w-3.5 theme-text" />
            <h3 className="text-sm font-semibold theme-text">Climat</h3>
            <DeleteButton cardId="climate" />
          </div>
          <div className="space-y-0.5 text-xs ml-5">
            {info.climate_info.current_season && (
              <div>
                <span className="font-medium">Saison actuelle:</span> {info.climate_info.current_season}
              </div>
            )}
            {info.climate_info.summer && (
              <div>
                <span className="font-medium">Été:</span> {info.climate_info.summer}
              </div>
            )}
            {info.climate_info.winter && (
              <div>
                <span className="font-medium">Hiver:</span> {info.climate_info.winter}
              </div>
            )}
            {info.climate_info.autumn && (
              <div>
                <span className="font-medium">Automne:</span> {info.climate_info.autumn}
              </div>
            )}
            {info.climate_info.spring && (
              <div>
                <span className="font-medium">Printemps:</span> {info.climate_info.spring}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
