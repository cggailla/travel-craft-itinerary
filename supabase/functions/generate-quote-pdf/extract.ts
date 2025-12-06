import cheerio from "npm:cheerio@1.0.0-rc.12";

export interface QuoteData {
  tripId?: string;
  metadata?: {
    title?: string;
    startDate?: string;
    endDate?: string;
    destination?: string;
    participants?: string;
    price?: string;
  };
  cover?: {
    title?: string;
    participants?: string;
    dates?: string;
    startDate?: string;
    endDate?: string;
    image?: string;
    logo?: string;
  };
  pricing?: {
    title?: string;
    description?: string;
    highlights?: string[];
    image?: string;
    destination?: string;
    dates?: string;
    duration?: string;
    travelers?: string;
    price?: string;
  };
  included?: {
    items: string[];
  };
  excluded?: {
    items: string[];
  };
  healthFormalities?: {
    formalities: { label: string; content: string }[];
    health: { label: string; content: string }[];
    cancellation?: string;
    // Legacy support
    items?: { label: string; content: string }[];
  };
  summary?: {
    steps: {
      date?: string;
      title?: string;
      location?: string;
    }[];
    image?: string;
  };
  itinerary?: {
    steps: {
      title?: string;
      date?: string;
      description?: string;
      accommodation?: {
        name?: string;
        description?: string;
      };
      image?: string;
    }[];
  };
  accommodations?: {
    items: {
      name: string;
      description: string;
    }[];
  };
  whyUs?: {
    mainTitle?: string;
    items: {
      title: string;
      description: string;
    }[];
  };
  reviews?: {
    title?: string;
    rating?: string;
    items: {
      author: string;
      text: string;
      rating?: number;
    }[];
  };
  faq?: {
    title?: string;
    items: {
      question: string;
      answer: string;
    }[];
  };
  legal?: {
    mentions?: string;
    contact?: {
      name?: string;
      email?: string;
      phone?: string;
    };
  };
}

export function extractFromHtml(html: string): QuoteData {
  const $ = cheerio.load(html);
  const root = $("#quote-content").length ? $("#quote-content") : $.root();

  const getText = (sel: string, base?: any) => {
    const ctx = base ? $(base) : root;
    const el = ctx.find(sel).first();
    if (!el || !el.length) return "";
    return (el.text() || "").trim();
  };

  const getAttr = (sel: string, attr: string, base?: any) => {
    const ctx = base ? $(base) : root;
    const el = ctx.find(sel).first();
    if (!el || !el.length) return "";
    return (el.attr(attr) || "").trim();
  };

  const data: QuoteData = {};

  // 0. Metadata (Root)
  if (root.length) {
    data.tripId = root.attr('data-pdf-trip-id');
    data.metadata = {
      title: root.attr('data-pdf-title'),
      startDate: root.attr('data-pdf-start-date'),
      endDate: root.attr('data-pdf-end-date'),
      destination: root.attr('data-pdf-destination'),
      participants: root.attr('data-pdf-participants'),
      price: root.attr('data-pdf-price'),
    };
  }

  // 1. Cover
  const coverSection = root.find('[data-pdf-section="cover"]');
  console.log("🔍 [extractFromHtml] Cover section found:", coverSection.length);
  
  if (coverSection.length) {
    // --- Nouvelle logique de récupération d’images de couverture (inspirée de booklet) ---
    const isSupabaseImage = (src: string) =>
      src && src.startsWith("https://jjlhsikgczigvtdzfroa.supabase.co/");

    let coverImage = "";

    // 1️⃣ Images avec attribut data-pdf-image
    coverSection.find("img[data-pdf-image]").each((_i: number, el: any) => {
      const src = $(el).attr("src") || "";
      if (isSupabaseImage(src)) {
        coverImage = src;
        return false; // break
      }
    });

    // 2️⃣ Fallback: première image Supabase de la section
    if (!coverImage) {
      console.log("⚠️ [extractFromHtml] No marked cover image, looking for fallback...");
      coverSection.find('img').each((_i: number, el: any) => {
        const src = $(el).attr('src') || "";
        if (isSupabaseImage(src)) {
          coverImage = src;
          return false; // break
        }
      });
    }

    console.log("🔍 [extractFromHtml] Final Cover Image:", coverImage);

    data.cover = {
      title: getText('[data-pdf-editable="title"]', coverSection) || data.metadata?.title,
      participants: getText('[data-pdf-editable="participants"]', coverSection) || data.metadata?.participants,
      startDate: data.metadata?.startDate,
      endDate: data.metadata?.endDate,
      image: coverImage,
      logo: getAttr('img[alt="Ad Gentes"]', 'src', coverSection),
    };
  } else {
    // Fallback si la section n'est pas trouvée (ex: ancienne version du template)
    data.cover = {
      title: data.metadata?.title,
      participants: data.metadata?.participants,
      startDate: data.metadata?.startDate,
      endDate: data.metadata?.endDate,
    };
  }

  // 2. Pricing
  const pricingSection = root.find('[data-pdf-section="pricing"]');
  if (pricingSection.length) {
    // Image extraction (robust)
    const isSupabaseImage = (src: string) => src && src.startsWith("https://jjlhsikgczigvtdzfroa.supabase.co/");
    let pricingImage = "";
    
    // 1. Try marked image
    pricingSection.find("img[data-pdf-image]").each((_i: number, el: any) => {
      const src = $(el).attr("src") || "";
      if (isSupabaseImage(src)) {
        pricingImage = src;
        return false;
      }
    });

    // 2. Fallback to any Supabase image in section
    if (!pricingImage) {
      pricingSection.find('img').each((_i: number, el: any) => {
        const src = $(el).attr('src') || "";
        if (isSupabaseImage(src)) {
          pricingImage = src;
          return false;
        }
      });
    }

    // Highlights
    const highlights: string[] = [];
    pricingSection.find('[data-pdf-item="highlight"]').each((_i: number, el: any) => {
      const text = $(el).text().trim();
      if (text) highlights.push(text);
    });

    data.pricing = {
      title: getText('[data-pdf-editable="pricing-title"]', pricingSection),
      description: getText('[data-pdf-editable="pricing-description"]', pricingSection),
      highlights: highlights,
      image: pricingImage,
      destination: getText('[data-pdf-pricing-destination]', pricingSection),
      dates: getText('[data-pdf-pricing-dates]', pricingSection),
      duration: getText('[data-pdf-pricing-duration]', pricingSection),
      travelers: getText('[data-pdf-pricing-travelers]', pricingSection),
      price: getText('[data-pdf-pricing-price]', pricingSection),
    };
  }

  // 3. Included / Excluded
  const includedSection = root.find('[data-pdf-section="included"]');
  if (includedSection.length) {
    data.included = { items: [] };
    data.excluded = { items: [] };

    // Extract included items using regex on data-pdf-editable attribute
    includedSection.find('[data-pdf-editable^="included-item-"]').each((_: any, el: any) => {
      data.included?.items.push($(el).text().trim());
    });

    // Extract excluded items
    includedSection.find('[data-pdf-editable^="excluded-item-"]').each((_: any, el: any) => {
      data.excluded?.items.push($(el).text().trim());
    });
  }

  // 4. Health & Formalities
  const healthSection = root.find('[data-pdf-section="health"]');
  if (healthSection.length) {
    data.healthFormalities = { 
      formalities: [],
      health: [],
      cancellation: ""
    };

    // Formalities Group
    healthSection.find('[data-pdf-group="formalities"] [data-pdf-item="health-formality"]').each((_: any, el: any) => {
      const item = $(el);
      data.healthFormalities?.formalities.push({
        label: getText('[data-pdf-label]', item),
        content: getText('[data-pdf-content]', item),
      });
    });

    // Health Group
    healthSection.find('[data-pdf-group="health"] [data-pdf-item="health-formality"]').each((_: any, el: any) => {
      const item = $(el);
      data.healthFormalities?.health.push({
        label: getText('[data-pdf-label]', item),
        content: getText('[data-pdf-content]', item),
      });
    });

    // Cancellation
    data.healthFormalities.cancellation = getText('[data-pdf-cancellation]', healthSection);
  } else {
    // Fallback for backward compatibility
    data.healthFormalities = { formalities: [], health: [], cancellation: "" };
    root.find('[data-pdf-item="health-formality"]').each((_: any, el: any) => {
      const item = $(el);
      data.healthFormalities?.formalities.push({
        label: getText('[data-pdf-label]', item),
        content: getText('[data-pdf-content]', item),
      });
    });
  }

  // 5. Itinerary Summary
  const summarySection = root.find('[data-pdf-section="itinerary-summary"]');
  if (summarySection.length) {
    data.summary = {
      steps: [],
      image: getAttr('img', 'src', summarySection),
    };
    
    // We need to group by index since title and location are separate elements
    // Finding all titles first
    const titles: {[key: string]: string} = {};
    summarySection.find('[data-pdf-editable^="summary-step-title-"]').each((_: any, el: any) => {
      const attr = $(el).attr('data-pdf-editable') || '';
      const index = attr.replace('summary-step-title-', '');
      titles[index] = $(el).text().trim();
    });

    const locations: {[key: string]: string} = {};
    summarySection.find('[data-pdf-editable^="summary-step-location-"]').each((_: any, el: any) => {
      const attr = $(el).attr('data-pdf-editable') || '';
      const index = attr.replace('summary-step-location-', '');
      locations[index] = $(el).text().trim();
    });

    // Reconstruct steps
    Object.keys(titles).sort().forEach(index => {
      data.summary?.steps.push({
        title: titles[index],
        location: locations[index],
        // Date is not editable so it might be harder to grab unless we tag it specifically
        // Assuming we added data-pdf-step-date in previous step if not editable
        date: getText(`[data-pdf-step-date="${index}"]`, summarySection) // Hypothetical selector, adjust if needed
      });
    });
  }

  // 6. Itinerary Details (Day by Day)
  // Since we don't have a single wrapper per step with an ID, we iterate by index pattern
  data.itinerary = { steps: [] };
  
  // Find all step titles to determine how many steps we have
  const stepTitles: {[key: string]: string} = {};
  root.find('[data-pdf-editable^="step-title-"]').each((_: any, el: any) => {
    const attr = $(el).attr('data-pdf-editable') || '';
    const index = attr.replace('step-title-', '');
    stepTitles[index] = $(el).text().trim();
  });

  Object.keys(stepTitles).sort((a, b) => parseInt(a) - parseInt(b)).forEach(index => {
    const title = stepTitles[index];
    const description = getText(`[data-pdf-editable="step-description-${index}"]`);
    const accommodationBlock = root.find(`[data-pdf-editable="step-accommodation-${index}"]`);
    
    let accommodationName = undefined;
    if (accommodationBlock.length) {
       accommodationName = accommodationBlock.text().trim().replace('Logement', '').trim();
    }

    // Try to find image for this step
    // Assuming images are rendered near the step content or we can find them by some convention
    // For now, let's look for an image in the same container if possible, or use a global selector strategy if needed.
    // Since the structure is flat in the HTML export (slides), we might need to look at the slide container.
    // But here we are selecting by ID pattern.
    
    // Let's try to find the slide container for this step to scope the image search
    const stepTitleEl = root.find(`[data-pdf-editable="step-title-${index}"]`);
    const slideContainer = stepTitleEl.closest('.quote-slide'); // Assuming class name
    let image = undefined;
    if (slideContainer.length) {
        image = getAttr('img', 'src', slideContainer);
    }

    data.itinerary?.steps.push({
      title,
      description,
      accommodation: accommodationName ? { name: accommodationName } : undefined,
      image
    });
  });

  // 7. Accommodations Section
  const accomSection = root.find('[data-pdf-section="accommodation"]');
  if (accomSection.length) {
    data.accommodations = { items: [] };
    
    const accomNames: {[key: string]: string} = {};
    accomSection.find('[data-pdf-editable^="accommodation-name-"]').each((_: any, el: any) => {
      const attr = $(el).attr('data-pdf-editable') || '';
      const index = attr.replace('accommodation-name-', '');
      accomNames[index] = $(el).text().trim();
    });

    Object.keys(accomNames).sort().forEach(index => {
      const name = accomNames[index];
      const description = getText(`[data-pdf-editable="accommodation-desc-${index}"]`, accomSection);
      data.accommodations?.items.push({ name, description });
    });
  }

  // 8. Why Us
  const whyUsSection = root.find('[data-pdf-section="why-choose-us"]');
  if (whyUsSection.length) {
    data.whyUs = {
      mainTitle: getText('[data-pdf-editable="why-us-main-title"]', whyUsSection),
      items: []
    };

    const whyUsTitles: {[key: string]: string} = {};
    whyUsSection.find('[data-pdf-editable^="why-us-title-"]').each((_: any, el: any) => {
      const attr = $(el).attr('data-pdf-editable') || '';
      const index = attr.replace('why-us-title-', '');
      whyUsTitles[index] = $(el).text().trim();
    });

    Object.keys(whyUsTitles).sort().forEach(index => {
      const title = whyUsTitles[index];
      const description = getText(`[data-pdf-editable="why-us-desc-${index}"]`, whyUsSection);
      data.whyUs?.items.push({ title, description });
    });
  }

  // 9. Reviews
  const reviewsSection = root.find('[data-pdf-section="reviews"]');
  if (reviewsSection.length) {
    data.reviews = {
      title: getText('[data-pdf-editable="reviews-title"]', reviewsSection),
      rating: getText('[data-pdf-editable="reviews-rating"]', reviewsSection),
      items: [] // Reviews items are not editable in the current template, so they might be missing specific tags
    };
    
    // Extract review items if they have tags
    reviewsSection.find('[data-pdf-item="review"]').each((_: any, el: any) => {
        const item = $(el);
        data.reviews?.items.push({
            text: getText('[data-pdf-review-text]', item),
            author: getText('[data-pdf-review-author]', item)
        });
    });
  }

  // 10. FAQ
  const faqSection = root.find('[data-pdf-section="faq"]');
  if (faqSection.length) {
    data.faq = {
      title: getText('[data-pdf-editable="faq-main-title"]', faqSection),
      items: []
    };

    const faqQuestions: {[key: string]: string} = {};
    faqSection.find('[data-pdf-editable^="faq-question-"]').each((_: any, el: any) => {
      const attr = $(el).attr('data-pdf-editable') || '';
      const index = attr.replace('faq-question-', '');
      faqQuestions[index] = $(el).text().trim();
    });

    Object.keys(faqQuestions).sort().forEach(index => {
      const question = faqQuestions[index];
      const answer = getText(`[data-pdf-editable="faq-answer-${index}"]`, faqSection);
      data.faq?.items.push({ question, answer });
    });
  }

  // 11. Legal & Contact
  const legalSection = root.find('[data-pdf-section="legal"]');
  const contactSection = root.find('[data-pdf-section="contact"]'); // Assuming separate or nested
  
  // If contact is inside legal or separate, handle accordingly. 
  // Based on template, they are in the same slide but might be tagged differently.
  // Let's assume they are accessible via root or specific sections if tagged.
  
  data.legal = {
    mentions: getText('[data-pdf-editable="legal-mentions"]'),
    contact: {
      name: getText('[data-pdf-editable="contact-name"]'),
      email: getText('[data-pdf-editable="contact-email"]'),
      phone: getText('[data-pdf-editable="contact-phone"]'),
    }
  };

  return data;
}
