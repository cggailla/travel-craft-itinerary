import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { EditableText } from "./EditableText";
import { EditableContent } from "./EditableContent";
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
  
  // État éditable pour chaque champ
  const [editableInfo, setEditableInfo] = useState<GeneralInfo | null>(null);
  
  // Synchro des données éditables
  useEffect(() => {
    if (info) {
      setEditableInfo(JSON.parse(JSON.stringify(info))); // deep copy
    }
  }, [info]);
  
  const updateEditableField = (path: string[], value: any) => {
    setEditableInfo(prev => {
      if (!prev) return prev;
      const newInfo = JSON.parse(JSON.stringify(prev));
      let current: any = newInfo;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return newInfo;
    });
  };

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

  // Keep a ref to the latest `info` so the polling interval can read up-to-date state
  const infoRef = useRef<GeneralInfo | null>(info);
  useEffect(() => {
    infoRef.current = info;
  }, [info]);

  useEffect(() => {
    // Initial fetch
    let intervalId: number | undefined;

    const initialFetch = async () => {
      const found = await fetchGeneralInfo();
      setLoading(false);

      // If nothing found, start polling every 5s until data appears
      if (!found) {
        intervalId = window.setInterval(async () => {
          if (!infoRef.current) {
            await fetchGeneralInfo();
          }
        }, 5000);
      }
    };

    initialFetch();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [tripId]);

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
      {(editableInfo?.capital || editableInfo?.population || editableInfo?.surface_area) && !hiddenCards.has('basic') && (
        <div className="relative group keep-together">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="h-3.5 w-3.5 theme-text" />
            <h3 className="text-sm font-semibold theme-text">Informations de base</h3>
            <DeleteButton cardId="basic" />
          </div>
          <div className="space-y-0.5 text-xs ml-5">
            {editableInfo?.capital && (
              <div>
                <span className="font-medium">Capitale:</span>{' '}
                <EditableText
                  value={editableInfo.capital}
                  onChange={(val) => updateEditableField(['capital'], val)}
                  className="inline"
                  as="span"
                  data-pdf-info-capital
                />
              </div>
            )}
            {editableInfo?.population && (
              <div>
                <span className="font-medium">Population:</span>{' '}
                <EditableText
                  value={editableInfo.population}
                  onChange={(val) => updateEditableField(['population'], val)}
                  className="inline"
                  as="span"
                  data-pdf-info-population
                />
              </div>
            )}
            {editableInfo?.surface_area && (
              <div>
                <span className="font-medium">Superficie:</span>{' '}
                <EditableText
                  value={editableInfo.surface_area}
                  onChange={(val) => updateEditableField(['surface_area'], val)}
                  className="inline"
                  as="span"
                  data-pdf-info-surface
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timezone */}
      {editableInfo?.timezone_info && !hiddenCards.has('timezone') && (
        <div className="relative group keep-together">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-3.5 w-3.5 theme-text" />
            <h3 className="text-sm font-semibold theme-text">Décalage horaire</h3>
            <DeleteButton cardId="timezone" />
          </div>
          <div className="space-y-0.5 text-xs ml-5">
            <div>
              <span className="font-medium">Fuseau horaire:</span>{' '}
              <EditableText
                value={editableInfo.timezone_info.main_timezone}
                onChange={(val) => updateEditableField(['timezone_info', 'main_timezone'], val)}
                className="inline"
                as="span"
                data-pdf-info-timezone
              />
            </div>
            <EditableText
              value={editableInfo.timezone_info.offset_description}
              onChange={(val) => updateEditableField(['timezone_info', 'offset_description'], val)}
              className="text-muted-foreground"
              as="div"
              data-pdf-info-offset
            />
          </div>
        </div>
      )}

      {/* Entry Requirements */}
      {editableInfo?.entry_requirements && !hiddenCards.has('entry') && (
        <div className="relative group keep-together">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-3.5 w-3.5 theme-text" />
            <h3 className="text-sm font-semibold theme-text">Formalités d'entrée</h3>
            <DeleteButton cardId="entry" />
          </div>
          <EditableContent className="space-y-0.5 text-xs ml-5">
            <div><span className="font-medium">Passeport:</span>{' '} 
              <span data-pdf-info-passport>{editableInfo.entry_requirements.passport}</span>
            </div>
            <div><span className="font-medium">Visa:</span>{' '}
              <span data-pdf-info-visa>{editableInfo.entry_requirements.visa}</span>
            </div>
            <div><span className="font-medium">Durée autorisée:</span>{' '} 
              <span data-pdf-info-validity>{editableInfo.entry_requirements.validity}</span>
            </div>
          </EditableContent>
        </div>
      )}

      {/* Health */}
      {editableInfo?.health_requirements && !hiddenCards.has('health') && (
        <div className="relative group keep-together">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="h-3.5 w-3.5 theme-text" />
            <h3 className="text-sm font-semibold theme-text">Santé</h3>
            <DeleteButton cardId="health" />
          </div>
          <EditableContent className="space-y-1 text-xs ml-5">
            {editableInfo.health_requirements.vaccines?.length > 0 && (
              <div>
                <span className="font-medium">Vaccins recommandés:</span>{' '}
                <span data-pdf-info-vaccines>{editableInfo.health_requirements.vaccines.join(", ")}</span>
              </div>
            )}
            {editableInfo.health_requirements.insurance_advice && (
              <div data-pdf-info-insurance>{editableInfo.health_requirements.insurance_advice}</div>
            )}
            {editableInfo.health_requirements.water_safety && (
              <div><span className="font-medium">Eau potable:</span>{' '}
                <span data-pdf-info-water>{editableInfo.health_requirements.water_safety}</span>
              </div>
            )}
          </EditableContent>
        </div>
      )}

      {/* Clothing */}
      {editableInfo?.clothing_advice && !hiddenCards.has('clothing') && (
        <div className="relative group keep-together">
          <div className="flex items-center gap-2 mb-1">
            <Shirt className="h-3.5 w-3.5 theme-text" />
            <h3 className="text-sm font-semibold theme-text">Vêtements conseillés</h3>
            <DeleteButton cardId="clothing" />
          </div>
          <EditableContent className="space-y-1 text-xs ml-5">
            {editableInfo.clothing_advice.season && (
              <div>
                <span className="font-medium">Saison:</span>{" "}
                <span data-pdf-info-clothing-season>{editableInfo.clothing_advice.season}</span>
              </div>
            )}
            {editableInfo.clothing_advice.temperatures && (
              <div>
                <span className="font-medium">Températures:</span>{" "}
                <span data-pdf-info-clothing-temperatures>{editableInfo.clothing_advice.temperatures}</span>
              </div>
            )}
            {editableInfo.clothing_advice.recommended?.length > 0 && (
              <div>
                <span className="font-medium block mb-0.5">À prévoir:</span>
                <ul className="list-disc list-inside space-y-0.5">
                  {editableInfo.clothing_advice.recommended.map((item, idx) => (
                    <li key={idx} data-pdf-info-clothing-item>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </EditableContent>
        </div>
      )}

      {/* Food */}
      {editableInfo?.food_specialties?.length > 0 && !hiddenCards.has('food') && (
        <div className="relative group keep-together">
          <div className="flex items-center gap-2 mb-1">
            <UtensilsCrossed className="h-3.5 w-3.5 theme-text" />
            <h3 className="text-sm font-semibold theme-text">Nourriture</h3>
            <DeleteButton cardId="food" />
          </div>
          <EditableContent className="space-y-1 text-xs ml-5">
            {editableInfo.food_specialties.map((item, idx) => (
              <div key={idx} className="border-l border-primary/20 pl-2" data-pdf-info-food-item>
                <div className="font-medium" data-pdf-info-food-region>{item.region}</div>
                <div className="text-muted-foreground" data-pdf-info-food-specialty>{item.specialty}</div>
              </div>
            ))}
          </EditableContent>
        </div>
      )}

      {/* Currency */}
      {(editableInfo?.currency || editableInfo?.exchange_rate) && !hiddenCards.has('currency') && (
        <div className="relative group keep-together">
          <div className="flex items-center gap-2 mb-1">
            <Coins className="h-3.5 w-3.5 theme-text" />
            <h3 className="text-sm font-semibold theme-text">Monnaie</h3>
            <DeleteButton cardId="currency" />
          </div>
          <div className="space-y-0.5 text-xs ml-5">
            {info.currency && (
              <div>
                <span className="font-medium">Devise:</span>{" "}
                <span data-pdf-info-currency>{info.currency}</span>
              </div>
            )}
            {info.exchange_rate && (
              <div className="text-muted-foreground" data-pdf-info-exchange-rate>{info.exchange_rate}</div>
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
                <span className="font-medium">Café:</span>{" "}
                <span data-pdf-info-budget-coffee>{info.budget_info.coffee}</span>
              </div>
            )}
            {info.budget_info.simple_meal && (
              <div>
                <span className="font-medium">Repas simple:</span>{" "}
                <span data-pdf-info-budget-simple-meal>{info.budget_info.simple_meal}</span>
              </div>
            )}
            {info.budget_info.restaurant && (
              <div>
                <span className="font-medium">Restaurant:</span>{" "}
                <span data-pdf-info-budget-restaurant>{info.budget_info.restaurant}</span>
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
              <span className="font-medium">Usage:</span>{" "}
              <span data-pdf-info-tipping-required>{info.tipping_culture.required ? "Attendu" : "Optionnel"}</span>
            </div>
            {info.tipping_culture.restaurants && (
              <div>
                <span className="font-medium">Restaurants:</span>{" "}
                <span data-pdf-info-tipping-restaurants>{info.tipping_culture.restaurants}</span>
              </div>
            )}
            {info.tipping_culture.taxis && (
              <div>
                <span className="font-medium">Taxis:</span>{" "}
                <span data-pdf-info-tipping-taxis>{info.tipping_culture.taxis}</span>
              </div>
            )}
            {info.tipping_culture.guides && (
              <div>
                <span className="font-medium">Guides:</span>{" "}
                <span data-pdf-info-tipping-guides>{info.tipping_culture.guides}</span>
              </div>
            )}
            {info.tipping_culture.porters && (
              <div>
                <span className="font-medium">Porteurs:</span>{" "}
                <span data-pdf-info-tipping-porters>{info.tipping_culture.porters}</span>
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
                <span className="font-medium">Voltage:</span>{" "}
                <span data-pdf-info-electricity-voltage>{info.electricity_info.voltage}</span>
              </div>
            )}
            {info.electricity_info.plug_types?.length > 0 && (
              <div>
                <span className="font-medium">Types de prises:</span>{" "}
                <span data-pdf-info-electricity-plugs>{info.electricity_info.plug_types.join(", ")}</span>
              </div>
            )}
            {info.electricity_info.adapter_needed !== undefined && (
              <div>
                <span className="font-medium">Adaptateur:</span>{" "}
                <span data-pdf-info-electricity-adapter>
                  {info.electricity_info.adapter_needed ? "Nécessaire" : "Non nécessaire"}
                </span>
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
          <p className="text-xs ml-5" data-pdf-info-religion>{info.religion_info}</p>
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
          <p className="text-xs ml-5" data-pdf-info-shopping>{info.shopping_info}</p>
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
                <span className="font-medium">Appeler depuis la Suisse:</span>{" "}
                <span data-pdf-info-phone-to>{info.phone_info.calling_to}</span>
              </div>
            )}
            {info.phone_info.calling_from && (
              <div>
                <span className="font-medium">Appeler la Suisse:</span>{" "}
                <span data-pdf-info-phone-from>{info.phone_info.calling_from}</span>
              </div>
            )}
            {info.phone_info.tips && (
              <div className="text-muted-foreground" data-pdf-info-phone-tips>{info.phone_info.tips}</div>
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
            {info.languages.official?.length > 0 && (
              <div>
                <span className="font-medium">Langues officielles:</span>{" "}
                <span data-pdf-info-languages-official>{info.languages.official.join(", ")}</span>
              </div>
            )}
            {info.languages.french_spoken !== undefined && (
              <div>
                <span className="font-medium">Français parlé:</span>{" "}
                <span data-pdf-info-languages-french>{info.languages.french_spoken ? "Oui" : "Non"}</span>
              </div>
            )}
            {info.languages.notes && (
              <div className="text-muted-foreground" data-pdf-info-languages-notes>{info.languages.notes}</div>
            )}
          </div>
        </div>
      )}

      {/* Cultural Sites */}
      {info.cultural_sites?.length > 0 && !hiddenCards.has('cultural') && (
        <div className="relative group keep-together">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-3.5 w-3.5 theme-text" />
            <h3 className="text-sm font-semibold theme-text">Sites culturels</h3>
            <DeleteButton cardId="cultural" />
          </div>
          <div className="space-y-1 text-xs ml-5">
            {info.cultural_sites.map((site, idx) => (
              <div key={idx} data-pdf-info-cultural-item>
                <div className="font-medium" data-pdf-info-cultural-name>{site.name}</div>
                <div className="text-muted-foreground" data-pdf-info-cultural-description>{site.description}</div>
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
          <p className="text-xs ml-5" data-pdf-info-natural>{info.natural_attractions}</p>
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
          <p className="text-xs ml-5" data-pdf-info-safety>{info.safety_info}</p>
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
                <span className="font-medium">Saison actuelle:</span>{" "}
                <span data-pdf-info-climate-current>{info.climate_info.current_season}</span>
              </div>
            )}
            {info.climate_info.summer && (
              <div>
                <span className="font-medium">Été:</span>{" "}
                <span data-pdf-info-climate-summer>{info.climate_info.summer}</span>
              </div>
            )}
            {info.climate_info.winter && (
              <div>
                <span className="font-medium">Hiver:</span>{" "}
                <span data-pdf-info-climate-winter>{info.climate_info.winter}</span>
              </div>
            )}
            {info.climate_info.autumn && (
              <div>
                <span className="font-medium">Automne:</span>{" "}
                <span data-pdf-info-climate-autumn>{info.climate_info.autumn}</span>
              </div>
            )}
            {info.climate_info.spring && (
              <div>
                <span className="font-medium">Printemps:</span>{" "}
                <span data-pdf-info-climate-spring>{info.climate_info.spring}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
