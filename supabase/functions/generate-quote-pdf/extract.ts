import cheerio from "npm:cheerio@1.0.0-rc.12";

export interface QuoteData {
  tripId?: string;
  cover?: {
    title?: string;
    client?: string;
    dates?: string;
    image?: string;
  };
  summary?: {
    steps: {
      date?: string;
      title?: string;
      location?: string;
    }[];
    image?: string;
  };
  pricing?: {
    price?: string;
    description?: string;
    highlights?: string[];
    image?: string;
  };
  faq?: {
    question: string;
    answer: string;
  }[];
  reviews?: {
    author: string;
    text: string;
    rating?: number;
  }[];
  whyUs?: {
    title: string;
    description: string;
  }[];
}

export function extractFromHtml(html: string): QuoteData {
  const $ = cheerio.load(html);
  const data: QuoteData = {};

  // 1. Cover
  const coverSection = $('[data-pdf-section="cover"]');
  if (coverSection.length) {
    data.cover = {
      title: coverSection.find('[data-pdf-title]').text().trim(),
      client: coverSection.find('[data-pdf-client]').text().trim(),
      dates: coverSection.find('[data-pdf-dates]').text().trim(),
      image: coverSection.find('[data-pdf-image]').attr('src'),
    };
  }

  // 2. Summary
  const summarySection = $('[data-pdf-section="itinerary-summary"]');
  if (summarySection.length) {
    data.summary = {
      steps: [],
      image: summarySection.find('[data-pdf-image]').attr('src'),
    };
    summarySection.find('[data-pdf-item="summary-step"]').each((_: any, el: any) => {
      const step = $(el);
      data.summary?.steps.push({
        date: step.find('[data-pdf-step-date]').text().trim(),
        title: step.find('[data-pdf-step-title]').text().trim(),
        location: step.find('[data-pdf-step-location]').text().trim(),
      });
    });
  }

  // 3. Pricing
  const pricingSection = $('[data-pdf-section="pricing"]');
  if (pricingSection.length) {
    data.pricing = {
      price: pricingSection.find('[data-pdf-price]').text().trim(),
      description: pricingSection.find('[data-pdf-description]').text().trim(),
      highlights: [],
      image: pricingSection.find('[data-pdf-image]').attr('src'),
    };
    pricingSection.find('[data-pdf-item="highlight"]').each((_: any, el: any) => {
      const highlight = $(el);
      const text = highlight.text().trim();
      if (text) data.pricing?.highlights?.push(text);
    });
  }

  // 4. FAQ
  const faqSection = $('[data-pdf-section="faq"]');
  if (faqSection.length) {
    data.faq = [];
    faqSection.find('[data-pdf-item="faq-item"]').each((_: any, el: any) => {
      const item = $(el);
      data.faq?.push({
        question: item.find('[data-pdf-faq-question]').text().trim(),
        answer: item.find('[data-pdf-faq-answer]').text().trim(),
      });
    });
  }

  // 5. Reviews
  const reviewsSection = $('[data-pdf-section="reviews"]');
  if (reviewsSection.length) {
    data.reviews = [];
    reviewsSection.find('[data-pdf-item="review"]').each((_: any, el: any) => {
      const item = $(el);
      data.reviews?.push({
        text: item.find('[data-pdf-review-text]').text().trim(),
        author: item.find('[data-pdf-review-author]').text().trim(),
      });
    });
  }

  // 6. Why Us
  const whyUsSection = $('[data-pdf-section="why-choose-us"]');
  if (whyUsSection.length) {
    data.whyUs = [];
    whyUsSection.find('[data-pdf-item="why-us-item"]').each((_: any, el: any) => {
      const item = $(el);
      data.whyUs?.push({
        title: item.find('[data-pdf-why-us-title]').text().trim(),
        description: item.find('[data-pdf-why-us-description]').text().trim(),
      });
    });
  }

  return data;
}
