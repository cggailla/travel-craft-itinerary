import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const { day, dayIndex } = await req.json();
    console.log(`▶️ Génération contenu pour jour ${dayIndex + 1}:`, day);

    if (!day?.segments || !Array.isArray(day.segments)) {
      throw new Error("Structure de jour invalide");
    }

    const prompt = createPrompt(day, dayIndex);
    console.log("✅ Prompt GPT créé, appel à OpenAI...");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-search-preview",
        temperature: 0.2,
        top_p: 0.9,
        max_completion_tokens: 2200,
        messages: [
          {
            role: "system",
            content: `Tu es un rédacteur de carnet de voyage ADGENTES avec accès à la recherche web. 
Ta mission: produire UNIQUEMENT un fragment HTML (sans <html> <head> <body>) pour UNE étape/jour, fidèle aux données internes, 
en complétant uniquement les infos manquantes via recherches ciblées (adresse précise, téléphone, URL officielle, check-in/out, contexte lieu, 1–2 photos libres).

RÈGLES NON NÉGOCIABLES
1) Vérité: Les infos DB priment. N’invente rien. Si une info n’est pas trouvée, écris "Non précisé".
2) Horaires: N’affiche des heures que si elles sont présentes dans les données. Sinon, repères souples (matin, après-midi).
3) Photos: 1 à 2 images max, libres de droits (Unsplash/Pexels/Pixabay), pas de photo d’hôtel si un paysage pertinent existe. 
   Chaque <img> doit avoir alt, width="1200" loading="lazy".
4) Sortie: Retourne uniquement le HTML entre:
   <!--START_HTML-->
   ... TON HTML ...
   <!--END_HTML-->
   Aucun texte hors de ces balises.
5) Sécurité: Jamais d’avis médicaux/juridiques. Pas de données personnelles nouvelles. 

STYLE ADGENTES
- Ton chaleureux, informatif, pas de superlatifs marketing.
- Structure claire: Titre/date → cartes segments (icône+meta) → NOTE pratique → Suggestions → Photos.
- Classes CSS à utiliser: theme-bg, theme-text, theme-border, theme-accent, segment-card, note, photo-block.`
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Erreur OpenAI:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";

    // Extraction stricte HTML entre balises START/END
    const match = raw.match(/<!--START_HTML-->([\s\S]*?)<!--END_HTML-->/);
    let generatedHTML = match ? match[1].trim() : raw.trim();

    // Nettoyage : pas de <html>/<head>/<body>
    generatedHTML = generatedHTML.replace(
      /<\/?(html|head|body)[^>]*>/gi,
      "",
    );

    // Limite à 2 images max
    const imgs = generatedHTML.match(/<img\b[^>]*>/gi) || [];
    if (imgs.length > 2) {
      generatedHTML = imgs.slice(0, 2).join("\n");
    }

    // Fallback si vide
    if (!generatedHTML || generatedHTML.length < 100) {
      console.warn("⚠️ Fallback activé: HTML trop court ou vide");
      generatedHTML =
        `<div class="theme-text">Contenu non disponible pour ce jour. Veuillez réessayer.</div>`;
    }

    console.log(
      `✅ Contenu généré pour jour ${dayIndex + 1} — longueur ${generatedHTML.length} caractères`,
    );

    return new Response(
      JSON.stringify({ html: generatedHTML }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("❌ Erreur dans generate-day-content:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: "Voir les logs pour plus d'informations",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

// Prompt builder robuste
function createPrompt(day: any, dayIndex: number): string {
  const dayDate = new Date(day.date);
  const fmtDateLong = dayDate.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const fmtDateShort = dayDate.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const getIcon = (type: string) => ({
    flight: "✈️",
    hotel: "🏨",
    activity: "🎯",
    car: "🚗",
    train: "🚆",
    boat: "⛵",
    transfer: "🚌",
    pass: "🎫",
    other: "📍",
  } as Record<string, string>)[type] || "📍";

  const formatTimeFromISO = (iso?: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const h = d.getUTCHours(), m = d.getUTCMinutes();
    if (h === 0 && m === 0) return null;
    return d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });
  };

  const factsLines: string[] = [];
  const needLookup: string[] = [];

  (day.segments || []).forEach((s: any, idx: number) => {
    const startTime = formatTimeFromISO(s.start_date);
    const endTime = formatTimeFromISO(s.end_date);
    const icon = getIcon(s.segment_type);

    factsLines.push([
      `SEGMENT ${idx + 1} — ${s.segment_type.toUpperCase()} ${icon}`,
      `Titre: ${JSON.stringify(s.title)}`,
      `Prestataire: ${s.provider ?? "Non précisé"}`,
      `Référence: ${s.reference_number ?? "Non précisée"}`,
      `Adresse (DB): ${s.address ?? "Non précisée"}`,
      `Heure début (DB): ${startTime ?? "Non spécifiée"}`,
      `Heure fin (DB): ${endTime ?? "Non spécifiée"}`,
      `Description (DB): ${s.description ?? "Non précisée"}`,
    ].join("\n"));

    if (s.segment_type === "hotel") {
      if (!s.address) needLookup.push(
        `Adresse postale exacte de l'hôtel; téléphone; site officiel; check-in/out (les afficher uniquement si trouvés)`,
      );
    } else if (s.segment_type === "boat") {
      needLookup.push(
        `Compagnie opératrice; terminal de départ/arrivée; consignes portuaires génériques (présentation 30–45min); durée typique`,
      );
    } else if (s.segment_type === "transfer") {
      needLookup.push(
        `Point de RDV générique au port/aéroport; durée indicative du trajet en ville`,
      );
    } else if (s.segment_type === "activity") {
      needLookup.push(`Contexte lieu (2–3 phrases); conseils équipement minimal`);
    }
  });

  const htmlSkeleton = `
<!--START_HTML-->
<div class="day-page theme-bg rounded-lg p-6 mb-8 border theme-border" id="day-${fmtDateShort.replace(/\//g,"-")}">
  <h2 class="text-2xl font-bold theme-text mb-2">${fmtDateShort}</h2>
  <h3 class="text-xl theme-accent mb-6 font-medium">Titre évocateur de l’étape – ${fmtDateLong}</h3>

  <div class="space-y-6">
    <div class="segment-card border-l-4 theme-border pl-4">
      <h4 class="font-semibold theme-text text-lg mb-2">[Icône] [Type] [Titre]</h4>
      <div class="theme-text text-sm mb-3 leading-relaxed">
        [Texte narratif enrichi. Si heures absentes en DB, ne pas inventer.]
      </div>
      <div class="bg-gray-50 p-3 rounded text-sm">
        <strong>Informations pratiques :</strong><br/>
        • Prestataire: [depuis DB]<br/>
        • Adresse / Point de RDV: [DB ou "Non précisé"]<br/>
        • Autres: [check-in/out si trouvés, sinon "Non précisé"]
      </div>
    </div>

    <div class="note theme-text text-sm border theme-border p-3 rounded">
      <strong>NOTE :</strong> [Conseil pratique générique si pertinent.]
    </div>

    <div class="theme-text text-sm leading-relaxed">
      <em>Suggestions :</em> [1–2 phrases utiles et sobres]
    </div>

    <div class="photo-block grid grid-cols-1 gap-3">
      <!-- <img src="..." alt="..." width="1200" loading="lazy" /> -->
    </div>
  </div>
</div>
<!--END_HTML-->
`.trim();

  return [
    `FAITS_DB (à respecter strictement) — ${fmtDateLong}\n\n${factsLines.join("\n\n")}`,
    `\nA CHERCHER (web):\n- ${
      Array.from(new Set(needLookup)).join("\n- ") || "Rien d’essentiel manquant"
    }\n`,
    `CONTRAINTES DE SORTIE:\n- Retourne uniquement le HTML entre <!--START_HTML--> et <!--END_HTML-->\n- 1 à 2 images libres max (Unsplash/Pexels/Pixabay)\n- Pas d’horaires inventés; écrire "Non précisé" quand introuvable\n- Classes CSS: theme-bg, theme-text, theme-border, theme-accent, segment-card, note, photo-block\n`,
    `SQUELETTE HTML DE RÉFÉRENCE (à remplir proprement):\n${htmlSkeleton}`,
  ].join("\n");
}
