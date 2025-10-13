#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const minimist = require('minimist');

// Lightweight extractor that mirrors the client-side `extractBookletData()`
// This version uses cheerio to query the snapshot DOM (dom.html) and outputs
// a structured JSON ready to be consumed as before (extracted.json).

function parseArgs() {
  const argv = minimist(process.argv.slice(2), { string: ['_'] });
  const input = argv._[0] || 'dom.html';
  const output = argv._[1] || 'extracted.json';
  return { input, output };
}

function readHtml(filePath) {
  const abs = path.resolve(process.cwd(), filePath);
  return fs.readFileSync(abs, 'utf8');
}

function extract(html) {
  const $ = cheerio.load(html);

  // operate inside #booklet-content when present
  const root = $('#booklet-content').length ? $('#booklet-content') : $.root();

  const getText = (sel, base) => {
    const ctx = base ? $(base) : root;
    const el = ctx.find(sel).first();
    if (!el || !el.length) return '';
    return (el.text() || '').trim();
  };

  const getAttr = (sel, attr, base) => {
    const ctx = base ? $(base) : root;
    const el = ctx.find(sel).first();
    if (!el || !el.length) return '';
    return el.attr(attr) || '';
  };

  const data = {};

  // 1) COVER / GENERAL INFO
  const cover = {};
  cover.destination = getText('[data-pdf-cover-destination]');
  cover.startDate = getText('[data-pdf-cover-start-date]');
  cover.endDate = getText('[data-pdf-cover-end-date]');
  cover.agency = getText('[data-pdf-cover-agency]');
  cover.travelers = getText('[data-pdf-cover-travelers]');
  cover.reference = getText('[data-pdf-cover-reference]');
  cover.imageUrl = getAttr('[data-pdf-cover-image]', 'src') || null;
  data.cover = cover;

  // 2) GENERAL INFORMATION
  const general = {};
  general.capital = getText('[data-pdf-info-capital]');
  general.population = getText('[data-pdf-info-population]');
  general.surface_area = getText('[data-pdf-info-surface]');
  general.timezone = {
    main: getText('[data-pdf-info-timezone-main]'),
    offset: getText('[data-pdf-info-timezone-offset]')
  };
  general.entry = {
    passport: getText('[data-pdf-info-entry-passport]'),
    visa: getText('[data-pdf-info-entry-visa]'),
    validity: getText('[data-pdf-info-entry-validity]')
  };
  general.health = {
    vaccines: getText('[data-pdf-info-health-vaccines]'),
    insurance: getText('[data-pdf-info-health-insurance]'),
    water: getText('[data-pdf-info-health-water]')
  };
  general.currency = {
    name: getText('[data-pdf-info-currency-name]'),
    rate: getText('[data-pdf-info-currency-rate]')
  };
  general.budget = {
    coffee: getText('[data-pdf-info-budget-coffee]'),
    meal: getText('[data-pdf-info-budget-meal]'),
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
  general.cultural_sites = [];
  root.find('[data-pdf-info-cultural-item]').each((i, el) => {
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

  // 3) ITINERARY
  data.itinerary = [];
  root.find('[data-pdf-step]').each((i, stepEl) => {
    const step = {};
    step.id = $(stepEl).attr('data-pdf-step-id') || '';
    step.title = $(stepEl).find('[data-pdf-step-title]').first().text().trim() || '';
    step.overview = $(stepEl).find('[data-pdf-step-overview]').first().text().trim() || '';
    step.start_date = $(stepEl).find('[data-pdf-step-start-date]').attr('data-pdf-step-start-date') || '';
    step.end_date = $(stepEl).find('[data-pdf-step-end-date]').attr('data-pdf-step-end-date') || '';
    step.segments = [];
    $(stepEl).find('[data-pdf-segment]').each((j, seg) => {
      const s = {};
      s.id = $(seg).attr('data-pdf-segment-id') || '';
      s.role = $(seg).attr('data-pdf-segment-role') || '';
      s.title = $(seg).find('[data-pdf-segment-title]').first().text().trim() || '';
      s.description = $(seg).find('[data-pdf-segment-description]').first().text().trim() || '';
      s.provider = $(seg).find('[data-pdf-segment-provider]').first().text().trim() || '';
      s.address = $(seg).find('[data-pdf-segment-address]').first().text().trim() || '';
      s.phone = $(seg).find('[data-pdf-segment-phone]').first().text().trim() || '';
      s.duration = $(seg).find('[data-pdf-segment-duration]').first().text().trim() || '';
      s.start_time = $(seg).find('[data-pdf-segment-start-time]').attr('data-pdf-segment-start-time') || '';
      s.end_time = $(seg).find('[data-pdf-segment-end-time]').attr('data-pdf-segment-end-time') || '';
      s.excluded = ($(seg).attr('data-pdf-segment-excluded') || '') === 'true';
      step.segments.push(s);
    });
    step.tips = [];
    $(stepEl).find('[data-pdf-step-tip]').each((k, t) => { step.tips.push($(t).text().trim()); });
    step.local_context = $(stepEl).find('[data-pdf-step-local-context]').first().text().trim() || '';
    step.images = [];
    $(stepEl).find('[data-pdf-step-image]').each((m, im) => { const src = $(im).attr('src') || ''; if (src) step.images.push(src); });
    data.itinerary.push(step);
  });

  // 4) EMERGENCY CONTACTS
  const contact = {};
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
      items: [],
      note: getText('[data-pdf-contact-local-note]')
    },
    agency: { title: getText('[data-pdf-contact-after-agency-title]') }
  };
  root.find('[data-pdf-contact-local-item]').each((i, el) => contact.after_departure.local.items.push($(el).text().trim()));
  contact.emergency = {
    title: getText('[data-pdf-contact-emergency-title]'),
    text1: getText('[data-pdf-contact-emergency-text1]'),
    text2: getText('[data-pdf-contact-emergency-text2]')
  };
  data.emergency_contacts = contact;

  // 5) THANK YOU
  const thanks = {};
  thanks.greeting = getText('[data-pdf-thank-greeting]');
  thanks.paragraphs = [];
  root.find('[data-pdf-thank-paragraph]').each((i, p) => { thanks.paragraphs.push($(p).text().trim()); });
  thanks.closing = getText('[data-pdf-thank-closing]');
  data.thank_you = thanks;

  return data;
}

function main() {
  const { input, output } = parseArgs();
  if (!fs.existsSync(input)) {
    console.error('Input file not found:', input);
    process.exit(2);
  }

  const html = readHtml(input);
  const data = extract(html);
  fs.writeFileSync(output, JSON.stringify(data, null, 2), 'utf8');
  console.log('Extraction complete. Wrote', output);
}

if (require.main === module) main();
