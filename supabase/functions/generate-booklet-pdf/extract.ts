import cheerio from "npm:cheerio@1.0.0-rc.12";

export function extractFromHtml(html: string) {
  const $ = cheerio.load(html);
  const root = $("#booklet-content").length ? $("#booklet-content") : $.root();

  const getText = (sel: string, base?: any) => {
    const ctx = base ? $(base) : root;
    const el = ctx.find(sel).first();
    if (!el || !el.length) return "";
    return (el.text() || "").trim();
  };

  const data: any = {};

  // =====================================================
  // 🧭 COVER
  // =====================================================
  const cover: any = {};
  cover.destination = getText("[data-pdf-cover-destination]");
  console.log("🔍 [extractFromHtml] Checking for cover dates...");

  const startEl = root.find("[data-pdf-cover-start-date]").first();
  const endEl = root.find("[data-pdf-cover-end-date]").first();

  if (startEl.length) {
    console.log(
      "✅ Found [data-pdf-cover-start-date] element:",
      startEl.toString().slice(0, 120) + "..."
    );
    console.log("   → Attribute value:", startEl.attr("data-pdf-cover-start-date"));
    console.log("   → Inner text:", startEl.text().trim());
  } else {
    console.warn("❌ No [data-pdf-cover-start-date] element found in HTML.");
  }

  if (endEl.length) {
    console.log(
      "✅ Found [data-pdf-cover-end-date] element:",
      endEl.toString().slice(0, 120) + "..."
    );
    console.log("   → Attribute value:", endEl.attr("data-pdf-cover-end-date"));
    console.log("   → Inner text:", endEl.text().trim());
  } else {
    console.warn("❌ No [data-pdf-cover-end-date] element found in HTML.");
  }

  // ✅ Nouvelle logique robuste : ignore "true" et utilise le texte s’il existe
  const startAttr = startEl.attr("data-pdf-cover-start-date");
  const endAttr = endEl.attr("data-pdf-cover-end-date");

  cover.startDate =
    startAttr && startAttr !== "true"
      ? startAttr
      : startEl.text().trim() || "";

  cover.endDate =
    endAttr && endAttr !== "true"
      ? endAttr
      : endEl.text().trim() || "";

  console.log("📅 [extractFromHtml] Parsed cover.startDate:", cover.startDate);
  console.log("📅 [extractFromHtml] Parsed cover.endDate:", cover.endDate);

  cover.images = [];

  // --- Nouvelle logique de récupération d’images de couverture ---
  const isSupabaseImage = (src: string) =>
    src.startsWith("https://jjlhsikgczigvtdzfroa.supabase.co/");

  // 1️⃣ Images avec attribut data-pdf-cover-image
  root.find("img[data-pdf-cover-image]").each((i: number, el: any) => {
    const src = $(el).attr("src") || "";
    if (isSupabaseImage(src)) cover.images.push(src);
  });

  // 2️⃣ Si aucune image explicite, fallback : images avant le premier step
  if (cover.images.length === 0) {
    root.find("img").each((i: number, el: any) => {
      const src = $(el).attr("src") || "";
      if (!isSupabaseImage(src)) return;
      const nextStep = $(el).nextAll("[data-pdf-step]").first();
      if (nextStep.length === 0) cover.images.push(src);
    });
  }

  // Nettoyage doublons
  cover.images = Array.from(new Set(cover.images));
  data.cover = cover;

  // =====================================================
  // 🗺️ GENERAL INFO
  // =====================================================
  const general: any = {};
  general.capital = getText("[data-pdf-info-capital]");
  general.population = getText("[data-pdf-info-population]");
  general.surface_area = getText("[data-pdf-info-surface]");
  general.timezone = {
    main: getText("[data-pdf-info-timezone]"),
    offset: getText("[data-pdf-info-offset]"),
  };
  general.entry = {
    passport: getText("[data-pdf-info-passport]"),
    visa: getText("[data-pdf-info-visa]"),
    validity: getText("[data-pdf-info-validity]"),
  };
  general.health = {
    vaccines: getText("[data-pdf-info-vaccines]"),
    insurance: getText("[data-pdf-info-insurance]"),
    water: getText("[data-pdf-info-water]"),
  };

  general.clothing = {
    season: getText("[data-pdf-info-clothing-season]"),
    temperature: getText("[data-pdf-info-clothing-temperatures]"),
    items: [] as string[],
  };
  root.find("[data-pdf-info-clothing-item]").each((i: number, el: any) => {
    const txt = $(el).text().trim() || "";
    if (txt) general.clothing.items.push(txt);
  });

  general.food = { specialties: [] as any[] };
  root.find("[data-pdf-info-food-item]").each((i: number, el: any) => {
    const region =
      $(el).find("[data-pdf-info-food-region]").first().text().trim() || "";
    const specialty =
      $(el).find("[data-pdf-info-food-specialty]").first().text().trim() || "";
    if (region || specialty) general.food.specialties.push({ region, specialty });
  });

  general.currency = {
    name: getText("[data-pdf-info-currency]"),
    rate: [] as string[],
    exchange: [] as string[],
  };
  root.find("[data-pdf-info-currency]").each((i: number, el: any) => {
    const txt = $(el).text().trim() || "";
    if (txt) general.currency.rate.push(txt);
  });
  root.find("[data-pdf-info-exchange-rate]").each((i: number, el: any) => {
    const txt = $(el).text().trim() || "";
    if (txt) general.currency.exchange.push(txt);
  });

  general.budget = {
    coffee: getText("[data-pdf-info-budget-coffee]"),
    meal: getText("[data-pdf-info-budget-simple-meal]"),
    restaurant: getText("[data-pdf-info-budget-restaurant]"),
  };
  general.tipping = {
    required: getText("[data-pdf-info-tipping-required]"),
    restaurants: getText("[data-pdf-info-tipping-restaurants]"),
    taxis: getText("[data-pdf-info-tipping-taxis]"),
    guides: getText("[data-pdf-info-tipping-guides]"),
    porters: getText("[data-pdf-info-tipping-porters]"),
  };
  general.electricity = {
    voltage: getText("[data-pdf-info-electricity-voltage]"),
    plugs: getText("[data-pdf-info-electricity-plugs]"),
    adapter: getText("[data-pdf-info-electricity-adapter]"),
  };
  general.religion = getText("[data-pdf-info-religion]");
  general.shopping = getText("[data-pdf-info-shopping]");
  general.phone = {
    to: getText("[data-pdf-info-phone-to]"),
    from: getText("[data-pdf-info-phone-from]"),
    tips: getText("[data-pdf-info-phone-tips]"),
  };
  general.languages = {
    official: getText("[data-pdf-info-languages-official]"),
    french: getText("[data-pdf-info-languages-french]"),
    notes: getText("[data-pdf-info-languages-notes]"),
  };
  general.cultural_sites = [] as any[];
  root.find("[data-pdf-info-cultural-item]").each((i: number, el: any) => {
    const name =
      $(el).find("[data-pdf-info-cultural-name]").first().text().trim() || "";
    const description =
      $(el)
        .find("[data-pdf-info-cultural-description]")
        .first()
        .text()
        .trim() || "";
    general.cultural_sites.push({ name, description });
  });
  general.natural_attractions = getText("[data-pdf-info-natural]");
  general.safety = getText("[data-pdf-info-safety]");
  general.climate = {
    current: getText("[data-pdf-info-climate-current]"),
    summer: getText("[data-pdf-info-climate-summer]"),
    winter: getText("[data-pdf-info-climate-winter]"),
    autumn: getText("[data-pdf-info-climate-autumn]"),
    spring: getText("[data-pdf-info-climate-spring]"),
  };
  data.general_info = general;

  // =====================================================
  // 🗓️ ITINERARY
  // =====================================================
  data.itinerary = [] as any[];
  root.find("[data-pdf-step]").each((i: number, stepEl: any) => {
    const step: any = {};
    const $step = $(stepEl);

    step.id = $step.attr("data-pdf-step-id") || "";
    step.title = $step.find("[data-pdf-step-title]").first().text().trim() || "";
    step.overview =
      $step.find("[data-pdf-step-overview]").first().text().trim() || "";
    step.start_date =
      $step.find("[data-pdf-step-start-date]").attr("data-pdf-step-start-date") ||
      "";
    step.end_date =
      $step.find("[data-pdf-step-end-date]").attr("data-pdf-step-end-date") || "";

    // --- Segments ---
    step.segments = [] as any[];
    $step.find("[data-pdf-segment]").each((j: number, seg: any) => {
      const $seg = $(seg);
      const s: any = {};
      s.id = $seg.attr("data-pdf-segment-id") || "";
      s.role = $seg.attr("data-pdf-segment-role") || "";
      s.title =
        $seg.find("[data-pdf-segment-title]").first().text().trim() || "";
      s.description =
        $seg.find("[data-pdf-segment-description]").first().text().trim() || "";
      s.provider =
        $seg.find("[data-pdf-segment-provider]").first().text().trim() || "";
      s.address =
        $seg.find("[data-pdf-segment-address]").first().text().trim() || "";
      s.phone =
        $seg.find("[data-pdf-segment-phone]").first().text().trim() || "";
      s.duration =
        $seg.find("[data-pdf-segment-duration]").first().text().trim() || "";
      s.excluded = ($seg.attr("data-pdf-segment-excluded") || "") === "true";
      step.segments.push(s);
    });

    // --- Tips / Context ---
    step.tips = [];
    $step.find("[data-pdf-step-tip]").each((k: number, t: any) => {
      const txt = $(t).text().trim();
      if (txt) step.tips.push(txt);
    });
    step.local_context =
      $step.find("[data-pdf-step-local-context]").first().text().trim() || "";

    // --- Nouvelle logique d’images d’étape ---
    step.images = [];
    $step.find("img[data-pdf-step-image], img").each((m: number, im: any) => {
      const src = $(im).attr("src") || "";
      if (isSupabaseImage(src)) step.images.push(src);
    });
    step.images = Array.from(new Set(step.images));

    data.itinerary.push(step);
  });

  // Debug
  const totalImages =
    (data.cover?.images?.length || 0) +
    data.itinerary.reduce((a: number, s: any) => a + (s.images?.length || 0), 0);
  console.log(
    `🖼️ [extractFromHtml] ${totalImages} image(s) — Cover: ${
      data.cover?.images?.length || 0
    }, Steps: ${data.itinerary.filter((s: any) => s.images?.length > 0).length}`
  );

  // =====================================================
  // ☎️ EMERGENCY CONTACTS
  // =====================================================
  const contact: any = {};
  contact.title = getText("[data-pdf-contact-title]");
  contact.before_departure = {
    title: getText("[data-pdf-contact-before-title]"),
    text: getText("[data-pdf-contact-before-text]"),
  };
  contact.departure_day = {
    flights: {
      title: getText("[data-pdf-contact-day-flights-title]"),
      text: getText("[data-pdf-contact-day-flights-text]"),
    },
    agency: { title: getText("[data-pdf-contact-day-agency-title]") },
  };
  contact.after_departure = {
    title: getText("[data-pdf-contact-after-title]"),
    intro: getText("[data-pdf-contact-after-intro]"),
    flights: {
      title: getText("[data-pdf-contact-after-flights-title]"),
      text: getText("[data-pdf-contact-after-flights-text]"),
    },
    local: {
      title: getText("[data-pdf-contact-after-local-title]"),
      phone: getText("[data-pdf-contact-local-phone]"),
      items: [] as string[],
      note: getText("[data-pdf-contact-local-note]"),
    },
    agency: { title: getText("[data-pdf-contact-after-agency-title]") },
  };
  root
    .find("[data-pdf-contact-local-item]")
    .each((i: number, el: any) =>
      contact.after_departure.local.items.push($(el).text().trim())
    );
  contact.emergency = {
    title: getText("[data-pdf-contact-emergency-title]"),
    text1: getText("[data-pdf-contact-emergency-text1]"),
    text2: getText("[data-pdf-contact-emergency-text2]"),
  };
  data.emergency_contacts = contact;

  // =====================================================
  // 🙏 THANK YOU
  // =====================================================
  const thanks: any = {};
  thanks.greeting = getText("[data-pdf-thankyou-greeting]");
  thanks.para1 = getText("[data-pdf-thankyou-para1]");
  thanks.para2 = getText("[data-pdf-thankyou-para2]");
  thanks.para3 = getText("[data-pdf-thankyou-para3]");
  thanks.closing = getText("[data-pdf-thankyou-closing]");
  data.thank_you = thanks;

  return data;
}
