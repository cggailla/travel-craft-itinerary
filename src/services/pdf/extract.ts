#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
const cheerio = require('cheerio');

export function extractFromHtml(html: string) {
  const $ = cheerio.load(html);
  const root = $('#booklet-content').length ? $('#booklet-content') : $.root();

  const getText = (sel: string, base?: any) => {
    const ctx = base ? $(base) : root;
    const el = ctx.find(sel).first();
    if (!el || !el.length) return '';
    return (el.text() || '').trim();
  };

  const data: any = {};

  // COVER
  const cover: any = {};
  cover.destination = getText('[data-pdf-cover-destination]');
  cover.startDate = getText('[data-pdf-cover-start-date]');
  cover.endDate = getText('[data-pdf-cover-end-date]');
  cover.images = [];
  root.find('[data-pdf-cover-image]').each((i: number, el: any) => {
    const src = $(el).attr('src') || '';
    if (src) cover.images.push(src);
  });
  data.cover = cover;

  // GENERAL INFO
  const general: any = {};
  general.capital = getText('[data-pdf-info-capital]');
  general.population = getText('[data-pdf-info-population]');
  general.surface_area = getText('[data-pdf-info-surface]');
  general.timezone = {
    main: getText('[data-pdf-info-timezone]'),
    offset: getText('[data-pdf-info-offset]')
  };
  general.entry = {
    passport: getText('[data-pdf-info-passport]'),
    visa: getText('[data-pdf-info-visa]'),
    validity: getText('[data-pdf-info-validity]')
  };
  general.health = {
    vaccines: getText('[data-pdf-info-vaccines]'),
    insurance: getText('[data-pdf-info-insurance]'),
    water: getText('[data-pdf-info-water]')
  };

  general.clothing = {
    season: getText('[data-pdf-info-clothing-season]'),
    temperature: getText('[data-pdf-info-clothing-temperatures]'),
    items: [] as string[]
  };
  root.find('[data-pdf-info-clothing-item]').each((i: number, el: any) => {
    const txt = $(el).text().trim() || '';
    if (txt) general.clothing.items.push(txt);
  });

  general.food = { specialties: [] as any[] };
  root.find('[data-pdf-info-food-item]').each((i: number, el: any) => {
    const region = $(el).find('[data-pdf-info-food-region]').first().text().trim() || '';
    const specialty = $(el).find('[data-pdf-info-food-specialty]').first().text().trim() || '';
    if (region || specialty) general.food.specialties.push({ region, specialty });
  });

  general.currency = { name: getText('[data-pdf-info-currency]'), rate: [] as string[], exchange: [] as string[] };
  root.find('[data-pdf-info-currency]').each((i: number, el: any) => {
    const txt = $(el).text().trim() || '';
    if (txt) general.currency.rate.push(txt);
  });
  root.find('[data-pdf-info-exchange-rate]').each((i: number, el: any) => {
    const txt = $(el).text().trim() || '';
    if (txt) general.currency.exchange.push(txt);
  });

  general.budget = {
    coffee: getText('[data-pdf-info-budget-coffee]'),
    meal: getText('[data-pdf-info-budget-simple-meal]'),
    restaurant: getText('[data-pdf-info-budget-restaurant]')
  };
  general.tipping = {
    required: getText('[data-pdf-info-tipping-required]'),
    restaurants: getText('[data-pdf-info-tipping-restaurants]'),
    taxis: getText('[data-pdf-info-tipping-taxis]'),
    guides: getText('[data-pdf-info-tipping-guides]'),
    porters: getText('[data-pdf-info-tipping-porters]')
  };
  general.electricity = {
    voltage: getText('[data-pdf-info-electricity-voltage]'),
    plugs: getText('[data-pdf-info-electricity-plugs]'),
    adapter: getText('[data-pdf-info-electricity-adapter]')
  };
  general.religion = getText('[data-pdf-info-religion]');
  general.shopping = getText('[data-pdf-info-shopping]');
  general.phone = {
    to: getText('[data-pdf-info-phone-to]'),
    from: getText('[data-pdf-info-phone-from]'),
    tips: getText('[data-pdf-info-phone-tips]')
  };
  general.languages = {
    official: getText('[data-pdf-info-languages-official]'),
    french: getText('[data-pdf-info-languages-french]'),
    notes: getText('[data-pdf-info-languages-notes]')
  };
  general.cultural_sites = [] as any[];
  root.find('[data-pdf-info-cultural-item]').each((i: number, el: any) => {
    const name = $(el).find('[data-pdf-info-cultural-name]').first().text().trim() || '';
    const description = $(el).find('[data-pdf-info-cultural-description]').first().text().trim() || '';
    general.cultural_sites.push({ name, description });
  });
  general.natural_attractions = getText('[data-pdf-info-natural]');
  general.safety = getText('[data-pdf-info-safety]');
  general.climate = {
    current: getText('[data-pdf-info-climate-current]'),
    summer: getText('[data-pdf-info-climate-summer]'),
    winter: getText('[data-pdf-info-climate-winter]'),
    autumn: getText('[data-pdf-info-climate-autumn]'),
    spring: getText('[data-pdf-info-climate-spring]')
  };
  data.general_info = general;

  // ITINERARY
  data.itinerary = [] as any[];
  root.find('[data-pdf-step]').each((i: number, stepEl: any) => {
    const step: any = {};
    step.id = $(stepEl).attr('data-pdf-step-id') || '';
    step.title = $(stepEl).find('[data-pdf-step-title]').first().text().trim() || '';
    step.overview = $(stepEl).find('[data-pdf-step-overview]').first().text().trim() || '';
    step.start_date = $(stepEl).find('[data-pdf-step-start-date]').attr('data-pdf-step-start-date') || '';
    step.end_date = $(stepEl).find('[data-pdf-step-end-date]').attr('data-pdf-step-end-date') || '';
    step.segments = [] as any[];
    $(stepEl).find('[data-pdf-segment]').each((j: number, seg: any) => {
      const s: any = {};
      s.id = $(seg).attr('data-pdf-segment-id') || '';
      s.role = $(seg).attr('data-pdf-segment-role') || '';
      s.title = $(seg).find('[data-pdf-segment-title]').first().text().trim() || '';
      s.description = $(seg).find('[data-pdf-segment-description]').first().text().trim() || '';
      s.provider = $(seg).find('[data-pdf-segment-provider]').first().text().trim() || '';
      s.address = $(seg).find('[data-pdf-segment-address]').first().text().trim() || '';
      s.phone = $(seg).find('[data-pdf-segment-phone]').first().text().trim() || '';
      s.duration = $(seg).find('[data-pdf-segment-duration]').first().text().trim() || '';
      s.excluded = ($(seg).attr('data-pdf-segment-excluded') || '') === 'true';
      step.segments.push(s);
    });
    step.tips = [] as string[];
    $(stepEl).find('[data-pdf-step-tip]').each((k: number, t: any) => { step.tips.push($(t).text().trim()); });
    step.local_context = $(stepEl).find('[data-pdf-step-local-context]').first().text().trim() || '';
    step.images = [] as string[];
    $(stepEl).find('[data-pdf-step-image]').each((m: number, im: any) => { const src = $(im).attr('src') || ''; if (src) step.images.push(src); });
    data.itinerary.push(step);
  });

  // EMERGENCY CONTACTS
  const contact: any = {};
  contact.title = getText('[data-pdf-contact-title]');
  contact.before_departure = {
    title: getText('[data-pdf-contact-before-title]'),
    text: getText('[data-pdf-contact-before-text]')
  };
  contact.departure_day = {
    flights: {
      title: getText('[data-pdf-contact-day-flights-title]'),
      text: getText('[data-pdf-contact-day-flights-text]')
    },
    agency: { title: getText('[data-pdf-contact-day-agency-title]') }
  };
  contact.after_departure = {
    title: getText('[data-pdf-contact-after-title]'),
    intro: getText('[data-pdf-contact-after-intro]'),
    flights: {
      title: getText('[data-pdf-contact-after-flights-title]'),
      text: getText('[data-pdf-contact-after-flights-text]')
    },
    local: {
      title: getText('[data-pdf-contact-after-local-title]'),
      phone: getText('[data-pdf-contact-local-phone]'),
      items: [] as string[],
      note: getText('[data-pdf-contact-local-note]')
    },
    agency: { title: getText('[data-pdf-contact-after-agency-title]') }
  };
  root.find('[data-pdf-contact-local-item]').each((i: number, el: any) => contact.after_departure.local.items.push($(el).text().trim()));
  contact.emergency = {
    title: getText('[data-pdf-contact-emergency-title]'),
    text1: getText('[data-pdf-contact-emergency-text1]'),
    text2: getText('[data-pdf-contact-emergency-text2]')
  };
  data.emergency_contacts = contact;

  // THANK YOU
  const thanks: any = {};
  thanks.greeting = getText('[data-pdf-thankyou-greeting]');
  thanks.para1 = getText('[data-pdf-thankyou-para1]');
  thanks.para2 = getText('[data-pdf-thankyou-para2]');
  thanks.para3 = getText('[data-pdf-thankyou-para3]');
  thanks.closing = getText('[data-pdf-thankyou-closing]');
  data.thank_you = thanks;

  return data;
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const input = argv[0] || 'dom.html';
  const output = argv[1] || 'extracted.json';
  return { input, output };
}

if (require.main === module) {
  const { input, output } = parseArgs();
  if (!fs.existsSync(input)) {
    console.error('Input file not found:', input);
    process.exit(2);
  }
  const html = fs.readFileSync(path.resolve(process.cwd(), input), 'utf8');
  const data = extractFromHtml(html);
  fs.writeFileSync(output, JSON.stringify(data, null, 2), 'utf8');
  console.log('Extraction complete. Wrote', output);
}
