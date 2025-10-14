// BookletDocument.js
const React = require('react');
const {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
  Font,
  Link,
} = require('@react-pdf/renderer');
const path = require('path');

// --- Fonts (optionnel) ------------------------------------------------------
// Tu peux embarquer des .ttf locaux pour un rendu premium.
// Laisse commenté si tu préfères Helvetica.
//
// Font.register({
//   family: 'Playfair Display',
//   src: path.resolve(__dirname, './fonts/PlayfairDisplay-Regular.ttf'),
// });
// Font.register({
//   family: 'Lato',
//   src: path.resolve(__dirname, './fonts/Lato-Regular.ttf'),
// });
// Font.register({
//   family: 'Lato',
//   src: path.resolve(__dirname, './fonts/Lato-Bold.ttf'),
//   fontWeight: 'bold',
// });

const DEFAULT_TEXT = 'Helvetica';
const TITLE_FONT = 'Helvetica'; // 'Playfair Display' si activé au-dessus
const BODY_FONT = 'Helvetica';  // 'Lato' si activé au-dessus

// --- Thème Ad Gentes --------------------------------------------------------
const theme = {
  primary: '#7B1E1E',     // Bordeaux
  primaryDark: '#611717',
  sand: '#F8F4EE',        // Beige sable
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray700: '#374151',
  text: '#2B2B2B',
};

// A5 portrait height in PostScript points (~595pt)
// 20% spacer = ~119pt
const A5_HEIGHT_PT = 595; 
const STEP_SPACER_PT = Math.round(A5_HEIGHT_PT * 0.20);


// --- Utils ------------------------------------------------------------------
const SEGMENT_ICON = {
  flight: '✈️',
  hotel: '🏨',
  transfer: '🚐',
  train: '🚆',
  activity: '🎟️',
  transport: '🚌',
  meal: '🍽️',
  default: ' ',
};

const SEGMENT_LABEL = {
  flight: 'Vol',
  hotel: 'Hôtel',
  transfer: 'Transfert',
  train: 'Train',
  activity: 'Activité',
  transport: 'Transport',
  meal: 'Repas',
  default: 'Service',
};

function iconFor(role) {
  return SEGMENT_ICON[role] || SEGMENT_ICON.default;
}
function labelFor(role) {
  return SEGMENT_LABEL[role] || SEGMENT_LABEL.default;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: undefined });
}

function formatDateFull(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatDateRange(start, end) {
  if (!start && !end) return '';
  if (start && !end) return formatDateFull(start);
  if (!start && end) return formatDateFull(end);
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s) || isNaN(e)) return `${start || ''} – ${end || ''}`;
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  if (sameMonth) {
    return `${s.getDate()} → ${e.getDate()} ${e.toLocaleString('fr-FR', { month: 'long' })} ${e.getFullYear()}`;
  }
  return `${formatDateFull(start)} → ${formatDateFull(end)}`;
}

function daysBetween(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s) || isNaN(e)) return '';
  // séjour = inclusif
  const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : 1;
}

function stringify(v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'object') {
    if (v.name) return String(v.name);
    if (v.title) return String(v.title);
    if (v.rate) return String(v.rate);
    try { return JSON.stringify(v); } catch { return String(v); }
  }
  return String(v);
}

function pick(...vals) {
  // renvoie le 1er truthy string
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

// --- Styles -----------------------------------------------------------------
const styles = StyleSheet.create({
  // Page + header/footer
  page: {
    fontFamily: BODY_FONT || DEFAULT_TEXT,
    fontSize: 11,
    color: theme.text,
    lineHeight: 1.5,
    paddingTop: 48,
    paddingBottom: 40,
    paddingHorizontal: 40,
    backgroundColor: 'white',
  },
  headerBar: {
    // removed: page header removed per request
  },
  // removed brandLeft/brandLogo/brandText styles
  pageNumber: { position: 'absolute', bottom: 18, right: 40, fontSize: 9, color: theme.gray700 },

  // Cover

  coverPage: {
    padding: 0,
    margin: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'white', // pour une base neutre
  },

  coverBanner: {
    backgroundColor: theme.primary,
    color: 'white',
    textAlign: 'center',
    paddingVertical: 18,
    borderRadius: 4,
  },
  coverTitle: {
    fontFamily: TITLE_FONT || DEFAULT_TEXT,
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  coverSubtitle: { fontSize: 11, marginTop: 4, opacity: 0.95 },
  coverImagesWrap: { marginTop: 14, gap: 10 },
  coverImage: { width: '100%', height: 240, objectFit: 'cover', borderRadius: 6 },
  dateStrip: {
    marginTop: 12,
    backgroundColor: theme.gray100,
    borderWidth: 1, borderColor: theme.gray200,
    borderRadius: 4,
    paddingVertical: 8, paddingHorizontal: 12,
    textAlign: 'center',
  },
  dateLine: { fontSize: 12, fontWeight: 600 },
  smallMuted: { fontSize: 10, color: theme.gray700, marginTop: 2 },

  sectionBlock: { marginTop: 18 },
  sectionHeader: {
    backgroundColor: theme.primary,
    color: 'white',
    paddingVertical: 6, paddingHorizontal: 10,
    borderRadius: 4,
    fontFamily: TITLE_FONT || DEFAULT_TEXT,
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  contentWrap: { marginTop: 10 },

  // Itinerary
  stepCard: {
    marginBottom: 14,
    borderWidth: 1, borderColor: theme.gray300,
    borderRadius: 6,
    overflow: 'hidden',
  },
  stepHeader: {
    backgroundColor: theme.gray100,
    borderBottomWidth: 1, borderBottomColor: theme.gray300,
    paddingVertical: 8, paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepHeaderTitle: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  stepHeaderDate: { fontSize: 10, color: theme.gray700 },
  stepBody: { padding: 10, gap: 6 },
  stepOverview: { fontSize: 11 },
  segment: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: theme.gray200,
    borderRadius: 4,
  },
  segmentTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  segmentTitle: { fontSize: 11, fontWeight: 'bold' },
  segmentBadge: {
    fontSize: 10,
    backgroundColor: theme.sand,
    paddingVertical: 2, paddingHorizontal: 6,
    borderRadius: 4,
  },
  segmentMeta: { fontSize: 10, color: theme.gray700, marginTop: 2 },
  stepListTitle: { fontSize: 10, fontWeight: 'bold', marginTop: 4, color: theme.gray700 },
  stepListItem: { fontSize: 10, color: theme.gray700, marginLeft: 6 },

// --- Simplifiés pour style épuré
  endOfService: {
    marginTop: 30,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 12,
    color: theme.primary,
  },


  // General info
  infoGrid: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoCard: {
    width: '48%',
    borderWidth: 1, borderColor: theme.gray300,
    backgroundColor: theme.gray100,
    borderRadius: 6,
    padding: 8,
  },
  infoTitle: { fontSize: 11, fontWeight: 'bold', marginBottom: 2 },
  infoText: { fontSize: 10 },

  // Thank you
  thankBlock: { gap: 6 },
  thankLine: { fontSize: 11 },
  thankClosing: { fontSize: 11, fontWeight: 'bold', marginTop: 8 },

  // Emergency
  card: {
    borderWidth: 1, borderColor: theme.gray300,
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  cardTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  paragraph: { fontSize: 10, marginBottom: 3 },

  // Notes
  noteLine: { height: 1, backgroundColor: theme.gray300, marginVertical: 8 },
});

// --- Shared header/footer ----------------------------------------------------

function PageFooter() {
  return React.createElement(Text, {
    style: styles.pageNumber,
    render: ({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`,
    fixed: true,
  });
}

// PageHeader component removed (no header requested)

function Cover({ cover = {}, brand = {} }) {
  const destination = pick(cover.title, cover.destination);
  const start = cover.startDate || cover.start || cover.start_date;
  const end = cover.endDate || cover.end || cover.end_date;
  const images = Array.isArray(cover.images) ? cover.images.slice(0, 2) : [];
  const days = start && end ? daysBetween(start, end) : '';
  const travelers = pick(cover.travelers, brand.travelers);
  const agency = pick(cover.agency, brand.agencyName);
  const reference = pick(cover.reference, brand.reference);
  const headerRight = [agency, reference].filter(Boolean).join(' • ');

  // ✅ Page full-bleed : aucune marge
  return React.createElement(View, {
    style: {
      position: 'relative',
      width: '100%',
      height: '100%',
      padding: 0,
      margin: 0,
    },
  },
    // --- Bandeau supérieur (logo + titre)
    React.createElement(View, {
      style: {
        backgroundColor: theme.primary,
        paddingVertical: 14,
        textAlign: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
      },
    },
      React.createElement(Text, {
        style: {
          fontSize: 22,
          color: 'white',
          fontWeight: 'bold',
          textTransform: 'uppercase',
        },
      }, destination || 'Carnet de voyage'),
      headerRight ? React.createElement(Text, {
        style: {
          fontSize: 10,
          color: 'white',
          marginTop: 2,
        },
      }, headerRight) : null
    ),

    // --- Zone centrale : 2 images occupant la moitié de la page chacune
    React.createElement(View, {
      style: {
        flex: 1,
        width: '100%',
        height: '100%',
      },
    },
      images.map((src, i) =>
        React.createElement(Image, {
          key: i,
          src,
          style: {
            width: '100%',
            height: '50%',             // prend la moitié de la hauteur
            objectFit: 'cover',        // recadre sans distorsion
            objectPosition: 'center',  // centré verticalement
            margin: 0,
            padding: 0,
          },
        })
      )
    ),

    // --- Bandeau inférieur (dates + voyageurs)
    React.createElement(View, {
      style: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        backgroundColor: theme.primary,
        color: 'white',
        textAlign: 'center',
        paddingVertical: 10,
      },
    },
      React.createElement(Text, {
        style: {
          fontSize: 11,
          fontWeight: 'bold',
          color: 'white',
        },
      },
        `${formatDateFull(start)}${end ? ` - ${formatDateFull(end)}` : ''}${start && end ? `  ·  ${days} jour${days > 1 ? 's' : ''}` : ''}`
      ),
      travelers ? React.createElement(Text, {
        style: {
          fontSize: 10,
          color: 'white',
          marginTop: 2,
        },
      }, travelers) : null
    )
  );
}

// --- Itinerary (corrigée selon tes demandes) -------------------------------

function Itinerary({ itinerary = [] }) {
  // Hauteur approximative d'une page A5 (en points)
  const A5_HEIGHT_PT = 595;
  const STEP_SPACER_PT = Math.round(A5_HEIGHT_PT * 0.10); // ~10 %
  const MIN_IMAGE_HEIGHT_PT = Math.round(A5_HEIGHT_PT * 0.35); // 35 %

  return React.createElement(
    View,
    { style: styles.sectionBlock },
    React.createElement(Text, { style: styles.sectionHeader }, 'Programme détaillé'),

    React.createElement(
      View,
      { style: styles.contentWrap },
      itinerary.map((step, i) => {
        const title = step.title || `Étape ${i + 1}`;
        const dateRange = `${formatDate(step.start_date)}${
          step.end_date && step.end_date !== step.start_date
            ? ` – ${formatDate(step.end_date)}`
            : ''
        }`;

        // === Étape principale ===
        const stepBlock = React.createElement(
          View,
          { key: step.id || i, style: { marginBottom: 22 } },

          // Bandeau d’étape
          React.createElement(
            View,
            { style: { marginBottom: 6 } },
            React.createElement(Text, {
              style: {
                fontSize: 13,
                fontWeight: 'bold',
                textTransform: 'uppercase',
                color: theme.primary,
              },
            }, `${dateRange}  •  ${title}`)
          ),

          // Aperçu
          step.overview
            ? React.createElement(Text, {
                style: { fontSize: 11, marginBottom: 6 },
              }, step.overview)
            : null,

          // Segments
          (step.segments || []).map((s, si) => {
            const roleLabel = SEGMENT_LABEL[s.role] || SEGMENT_LABEL.default;
            const infos = [];

            if (s.description) infos.push(s.description);
            if (s.duration) infos.push(s.duration);
            if (s.start_time || s.end_time) {
              let t = '';
              if (s.start_time) t += `Départ à ${s.start_time}`;
              if (s.end_time) t += (t ? ', ' : '') + `Arrivée à ${s.end_time}`;
              infos.push(t);
            }
            if (s.provider) infos.push(s.provider);
            if (s.address) infos.push(s.address);
            if (s.phone) infos.push(`Contact: ${s.phone}`);

            return React.createElement(
              View,
              {
                key: s.id || si,
                wrap: false,
                style: {
                  marginBottom: 8,
                  paddingLeft: 8,
                  borderLeft: `2 solid ${theme.primary}`,
                },
              },
              React.createElement(Text, {
                style: { fontSize: 11, fontWeight: 'bold', marginBottom: 2 },
              }, `${roleLabel} — ${stringify(s.title)}`),
              infos.map((line, li) =>
                React.createElement(Text, {
                  key: li,
                  style: { fontSize: 10, color: theme.text, lineHeight: 1.4 },
                }, `• ${line}`)
              )
            );
          }),

          // Notes
          step.tips && step.tips.length
            ? React.createElement(
                View,
                { style: { marginTop: 8 } },
                React.createElement(Text, {
                  style: { fontSize: 11, fontWeight: 'bold', marginBottom: 2 },
                }, 'NOTE'),
                step.tips.map((t, ti) =>
                  React.createElement(Text, {
                    key: ti,
                    style: {
                      fontSize: 10,
                      color: theme.text,
                      marginLeft: 6,
                      lineHeight: 1.4,
                    },
                  }, `• ${t}`)
                )
              )
            : null,

          // Info locale
          step.local_context
            ? React.createElement(
                View,
                { style: { marginTop: 10 } },
                React.createElement(Text, {
                  style: {
                    fontSize: 11,
                    fontWeight: 'bold',
                    marginBottom: 2,
                  },
                }, 'INFO LOCALE'),
                React.createElement(Text, {
                  style: { fontSize: 10, color: theme.text, lineHeight: 1.4 },
                }, step.local_context)
              )
            : null
        );

        // === Images d’étape ===
        const images =
          Array.isArray(step.images) && step.images.length > 0
            ? step.images.map((img, idx) =>
                React.createElement(Image, {
                  key: `${i}-img-${idx}`,
                  src: img,
                  style: {
                    width: '100%',
                    height: MIN_IMAGE_HEIGHT_PT, // chaque image a une taille suffisante
                    objectFit: 'cover',
                    marginTop: 8,
                    marginBottom: 4,
                  },
                })
              )
            : null;

        // Si on a des images : on empêche la coupure automatique
        const imageBlock =
          images && images.length
            ? React.createElement(View, { wrap: false }, images)
            : null;

        // === Espacement pour forcer le saut si proche du bas
        const spacer =
          i !== itinerary.length - 1
            ? React.createElement(View, { style: { height: STEP_SPACER_PT } })
            : null;

        // === Composition finale
        return React.createElement(
          React.Fragment,
          { key: step.id || i },
          stepBlock,
          imageBlock,
          spacer
        );
      }),

      // Fin de nos services
      React.createElement(Text, { style: styles.endOfService }, 'FIN DE NOS SERVICES')
    )
  );
}




function ThankYou({ thank = {} }) {
  const { greeting, para1, para2, para3, closing } = thank;

  return React.createElement(
    View,
    { style: styles.sectionBlock },
    React.createElement(Text, { style: styles.sectionHeader }, 'Remerciements'),

    React.createElement(
      View,
      { style: [styles.contentWrap, styles.thankBlock] },

      greeting
        ? React.createElement(Text, { style: styles.thankLine }, greeting)
        : null,

      para1
        ? React.createElement(Text, { style: styles.thankLine }, para1)
        : null,

      para2
        ? React.createElement(Text, { style: styles.thankLine }, para2)
        : null,

      para3
        ? React.createElement(Text, { style: styles.thankLine }, para3)
        : null,

      closing
        ? React.createElement(Text, { style: styles.thankClosing }, closing)
        : null
    )
  );
}


function GeneralInfo({ info = {} }) {
  const title = (text) =>
    React.createElement(Text, {
      style: {
        fontSize: 10,
        fontWeight: 'bold',
        color: theme.primary,
        marginTop: 7,
        marginBottom: 2,
        textTransform: 'uppercase',
      },
    }, text);

  const paragraph = (text, key) =>
    React.createElement(Text, { key, style: { fontSize: 10.5, color: theme.text, marginBottom: 3, lineHeight: 1.4 } }, stringify(text));

  const bullet = (text, key) =>
    React.createElement(Text, { key, style: { fontSize: 10, color: theme.text, marginLeft: 8, marginBottom: 2 } }, `• ${stringify(text)}`);

  const blocks = [];

  // --- APERÇU ---
  if (info.capital || info.population || info.surface_area) {
    blocks.push(
      React.createElement(View, { key: 'base', wrap: false },
        title('APERÇU'),
        info.capital && paragraph(`Capitale : ${info.capital}`),
        info.population && paragraph(`Population : ${info.population}`),
        info.surface_area && paragraph(`Superficie : ${info.surface_area}`)
      )
    );
  }

  // --- FUSEAU ---
  if (info.timezone) {
    blocks.push(
      React.createElement(View, { key: 'tz', wrap: false },
        title('FUSEAU HORAIRE'),
        info.timezone.main && paragraph(`Fuseau principal : ${info.timezone.main}`),
        info.timezone.offset && paragraph(info.timezone.offset)
      )
    );
  }

  // --- ENTRÉE ---
  if (info.entry) {
    blocks.push(
      React.createElement(View, { key: 'entry', wrap: false },
        title('FORMALITÉS D’ENTRÉE'),
        info.entry.passport && paragraph(`Passeport : ${info.entry.passport}`),
        info.entry.visa && paragraph(`Visa : ${info.entry.visa}`),
        info.entry.validity && paragraph(`Validité du séjour : ${info.entry.validity}`)
      )
    );
  }

  // --- SANTÉ ---
  if (info.health) {
    blocks.push(
      React.createElement(View, { key: 'health', wrap: false },
        title('SANTÉ'),
        info.health.vaccines && paragraph(`Vaccins : ${info.health.vaccines}`),
        info.health.insurance && paragraph(`Assurance : ${info.health.insurance}`),
        info.health.water && paragraph(`Eau potable : ${info.health.water}`)
      )
    );
  }

  // --- CLIMAT ---
  if (info.climate) {
    blocks.push(
      React.createElement(View, { key: 'climate', wrap: false },
        title('CLIMAT'),
        info.climate.current && paragraph(`Actuellement : ${info.climate.current}`),
        info.climate.summer && paragraph(`Été : ${info.climate.summer}`),
        info.climate.winter && paragraph(`Hiver : ${info.climate.winter}`),
        info.climate.autumn && paragraph(`Automne : ${info.climate.autumn}`),
        info.climate.spring && paragraph(`Printemps : ${info.climate.spring}`)
      )
    );
  }

  // --- VÊTEMENTS ---
  if (info.clothing) {
    blocks.push(
      React.createElement(View, { key: 'clothing', wrap: false },
        title('VÊTEMENTS RECOMMANDÉS'),
        info.clothing.season && paragraph(`Saison conseillée : ${info.clothing.season}`),
        info.clothing.temperature && paragraph(`Températures moyennes : ${info.clothing.temperature}`),
        Array.isArray(info.clothing.items)
          ? info.clothing.items.map((i, idx) => bullet(i, `cloth-${idx}`))
          : null
      )
    );
  }

  // --- SPÉCIALITÉS ---
  if (info.food?.specialties?.length) {
    blocks.push(
      React.createElement(View, { key: 'food', wrap: false },
        title('SPÉCIALITÉS CULINAIRES'),
        info.food.specialties.map((s, i) =>
          paragraph(`${s.region} : ${s.specialty}`, `food-${i}`)
        )
      )
    );
  }

  // --- ARGENT ---
  if (info.currency || info.budget) {
    blocks.push(
      React.createElement(View, { key: 'money', wrap: false },
        title('ARGENT ET BUDGET'),
        info.currency?.name && paragraph(`Monnaie : ${info.currency.name}`),
        Array.isArray(info.currency?.exchange)
          ? info.currency.exchange.map((e, i) => bullet(e, `ex-${i}`))
          : null,
        info.budget?.coffee && paragraph(`Café : ${info.budget.coffee}`),
        info.budget?.meal && paragraph(`Repas : ${info.budget.meal}`),
        info.budget?.restaurant && paragraph(`Restaurant : ${info.budget.restaurant}`)
      )
    );
  }

  // --- POURBOIRES ---
  if (info.tipping) {
    blocks.push(
      React.createElement(View, { key: 'tips', wrap: false },
        title('POURBOIRES'),
        info.tipping.required && paragraph(`Usage : ${info.tipping.required}`),
        info.tipping.restaurants && paragraph(`Restaurants : ${info.tipping.restaurants}`),
        info.tipping.taxis && paragraph(`Taxis : ${info.tipping.taxis}`),
        info.tipping.guides && paragraph(`Guides : ${info.tipping.guides}`),
        info.tipping.porters && paragraph(`Portiers : ${info.tipping.porters}`)
      )
    );
  }

  // --- ÉLECTRICITÉ ---
  if (info.electricity) {
    blocks.push(
      React.createElement(View, { key: 'elec', wrap: false },
        title('ÉLECTRICITÉ'),
        info.electricity.voltage && paragraph(`Tension : ${info.electricity.voltage}`),
        info.electricity.plugs && paragraph(`Prises : ${info.electricity.plugs}`),
        info.electricity.adapter && paragraph(`Adaptateur : ${info.electricity.adapter}`)
      )
    );
  }

  // --- LANGUES ---
  if (info.languages) {
    blocks.push(
      React.createElement(View, { key: 'lang', wrap: false },
        title('LANGUES'),
        info.languages.official && paragraph(`Officielles : ${info.languages.official}`),
        info.languages.french && paragraph(`Français parlé : ${info.languages.french}`),
        info.languages.notes && paragraph(info.languages.notes)
      )
    );
  }

  // --- RELIGION ---
  if (info.religion) {
    blocks.push(
      React.createElement(View, { key: 'religion', wrap: false },
        title('RELIGION'),
        paragraph(info.religion)
      )
    );
  }

  // --- SÉCURITÉ ---
  if (info.safety) {
    blocks.push(
      React.createElement(View, { key: 'safety', wrap: false },
        title('SÉCURITÉ'),
        paragraph(info.safety)
      )
    );
  }

  // --- CULTURE ---
  if (Array.isArray(info.cultural_sites) && info.cultural_sites.length) {
    blocks.push(
      React.createElement(View, { key: 'culture', wrap: false },
        title('SITES CULTURELS'),
        info.cultural_sites.map((c, i) =>
          paragraph(`• ${c.name} — ${c.description}`, `culture-${i}`)
        )
      )
    );
  }

  // --- NATURE ---
  if (info.natural_attractions) {
    blocks.push(
      React.createElement(View, { key: 'nature', wrap: false },
        title('ATTRACTIONS NATURELLES'),
        paragraph(info.natural_attractions)
      )
    );
  }

  // --- SHOPPING ---
  if (info.shopping) {
    blocks.push(
      React.createElement(View, { key: 'shop', wrap: false },
        title('ACHATS & ARTISANAT'),
        paragraph(info.shopping)
      )
    );
  }

  // --- Rendu final ---
  return React.createElement(
    View,
    { style: styles.sectionBlock },
    React.createElement(Text, { style: styles.sectionHeader }, 'Informations générales'),
    React.createElement(View, { style: [styles.contentWrap, { marginTop: 6 }] }, blocks)
  );
}


function Emergency({ contact = {} }) {
  const sectionTitle = (text) =>
    React.createElement(View, {
      style: {
        backgroundColor: theme.gray200,
        paddingVertical: 4,
        paddingHorizontal: 6,
        marginTop: 8,
        marginBottom: 4,
      },
    },
      React.createElement(Text, {
        style: {
          fontSize: 11,
          fontWeight: 'bold',
          color: theme.text,
        },
      }, text)
    );

  const subTitle = (text) =>
    React.createElement(Text, {
      style: {
        fontSize: 10.5,
        fontWeight: 'bold',
        marginTop: 4,
        marginBottom: 2,
        color: theme.text,
      },
    }, text);

  const paragraph = (text, key) =>
    React.createElement(Text, {
      key,
      style: {
        fontSize: 10,
        color: theme.text,
        marginBottom: 4,
        textAlign: 'justify',
        lineHeight: 1.4,
      },
    }, stringify(text));

  const bullet = (text, key) =>
    React.createElement(Text, {
      key,
      style: {
        fontSize: 10,
        color: theme.text,
        marginLeft: 10,
        marginBottom: 2,
        textAlign: 'justify',
      },
    }, `※ ${stringify(text)}`);

  const emergencyHighlight = (text) =>
    React.createElement(Text, {
      style: {
        backgroundColor: theme.sand,
        color: theme.primaryDark,
        fontWeight: 'bold',
      },
    }, stringify(text));

  return React.createElement(View, { style: styles.sectionBlock },
    React.createElement(Text, { style: [styles.sectionHeader, { marginBottom: 6 }] },
      "Qui contacter pendant votre voyage en cas de nécessité ?"
    ),

    React.createElement(View, { style: styles.contentWrap },

      // --- 1. Avant le départ
      React.createElement(View, { wrap: false },
        sectionTitle("1. Avant votre départ"),
        contact.before_departure?.text
          ? paragraph(contact.before_departure.text)
          : null
      ),

      // --- 2. Le jour du départ
      React.createElement(View, { wrap: false },
        sectionTitle("2. Le jour de votre départ"),
        contact.departure_day?.flights?.text
          ? React.createElement(View, null,
              subTitle("a. Les vols"),
              paragraph(contact.departure_day.flights.text))
          : null,
        contact.departure_day?.agency?.text
          ? React.createElement(View, null,
              subTitle("b. Votre voyagiste"),
              paragraph(contact.departure_day.agency.text))
          : null
      ),

      // --- 3. Après le départ
      React.createElement(View, { wrap: false },
        sectionTitle("3. Après votre départ"),
        contact.after_departure?.intro
          ? paragraph(contact.after_departure.intro)
          : null,

        contact.after_departure?.flights?.text
          ? React.createElement(View, null,
              subTitle("a. Les vols"),
              paragraph(contact.after_departure.flights.text))
          : null,

        contact.after_departure?.local
          ? React.createElement(View, null,
              subTitle("b. Nos correspondants locaux :"),
              contact.after_departure.local.name
                ? paragraph(contact.after_departure.local.name)
                : null,
              contact.after_departure.local.phone
                ? paragraph(contact.after_departure.local.phone)
                : null,
              Array.isArray(contact.after_departure.local.items)
                ? contact.after_departure.local.items.map((it, i) => bullet(it, `local-${i}`))
                : null,
              contact.after_departure.local.note
                ? paragraph(contact.after_departure.local.note)
                : null
            )
          : null,

        contact.after_departure?.agency?.text
          ? React.createElement(View, null,
              subTitle("c. Votre voyagiste"),
              paragraph(contact.after_departure.agency.text))
          : null
      ),

      // --- 4. Cas d’urgence
      React.createElement(View, { wrap: false },
        sectionTitle("4. Pour les cas d’extrême urgence"),
        contact.emergency?.text1 ? paragraph(contact.emergency.text1) : null,
        contact.emergency?.text2
          ? React.createElement(View, null,
              paragraph(contact.emergency.text2),
              contact.emergency.phone
                ? paragraph(
                    React.createElement(
                      Text,
                      null,
                      "Numéro d’urgence : ",
                      emergencyHighlight(contact.emergency.phone)
                    )
                  )
                : null)
          : null
      )
    )
  );
}



function Notes() {
  // Page finale “souvenirs”
  return React.createElement(View, { style: styles.sectionBlock },
    React.createElement(Text, { style: styles.sectionHeader }, 'Mes souvenirs'),
    React.createElement(View, { style: styles.contentWrap },
      React.createElement(Text, { style: styles.paragraph }, 'Écrivez ici vos impressions, vos adresses favorites, vos rencontres…'),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine }),
      React.createElement(View, { style: styles.noteLine })
    )
  );
}

// --- Document ---------------------------------------------------------------
function BookletDocument({ data }) {
  const cover = data.cover || {};
  const brand = {
    logoUrl: cover.logoUrl || (data.brand && data.brand.logoUrl),
    agencyName: cover.agency || (data.brand && data.brand.agencyName),
    reference: cover.reference || (data.brand && data.brand.reference),
    travelers: cover.travelers || (data.brand && data.brand.travelers),
  };

  return React.createElement(Document, null,
    // Cover
    React.createElement(Page, { size: 'A5', style: styles.coverPage },
      React.createElement(Cover, { cover, brand }),
    ),

    // Itinerary (programme)
    React.createElement(Page, { size: 'A5', style: styles.page },
      React.createElement(Itinerary, { itinerary: data.itinerary || [], brand }),
      React.createElement(PageFooter, null)
    ),

    // Thank you
    React.createElement(Page, { size: 'A5', style: styles.page },
      React.createElement(ThankYou, { thank: data.thank_you || {}, brand }),
      React.createElement(PageFooter, null)
    ),

    // General info
    React.createElement(Page, { size: 'A5', style: styles.page },
      React.createElement(GeneralInfo, { info: data.general_info || {} }),
      React.createElement(PageFooter, null)
    ),

    // Emergency + notes
    React.createElement(Page, { size: 'A5', style: styles.page },
      React.createElement(Emergency, { contact: data.emergency_contacts || {} }),
      React.createElement(PageFooter, null)
    ),

    React.createElement(Page, { size: 'A5', style: styles.page },
      React.createElement(Notes, null),
      React.createElement(PageFooter, null)
    )
  );
}

module.exports = BookletDocument;
