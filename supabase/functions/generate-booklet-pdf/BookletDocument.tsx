// BookletDocument.tsx (Deno / Supabase function friendly)
import React from 'npm:react@18.2.0'
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
  Font,
  Link,
} from 'npm:@react-pdf/renderer@3.4.3'

// --- Fonts (optionnel) ------------------------------------------------------
// Tu peux embarquer des .ttf locaux pour un rendu premium.
// Laisse commenté si tu préfères Helvetica.
//
// Font.register({
//   family: 'Playfair Display',
//   src: path.resolve(__dirname, './fonts/PlayfairDisplay-Regular.ttf'),
// })
// Font.register({
//   family: 'Lato',
//   src: path.resolve(__dirname, './fonts/Lato-Regular.ttf'),
// })
// Font.register({
//   family: 'Lato',
//   src: path.resolve(__dirname, './fonts/Lato-Bold.ttf'),
//   fontWeight: 'bold',
// })

const DEFAULT_TEXT = 'Helvetica'
const TITLE_FONT = 'Helvetica' // 'Playfair Display' si activé au-dessus
const BODY_FONT = 'Helvetica' // 'Lato' si activé au-dessus

// --- Thème Ad Gentes --------------------------------------------------------
const theme = {
  primary: '#822a62', // Bordeaux
  primaryDark: '#611717',
  sand: '#c084ab', // Beige sable
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray700: '#374151',
  text: '#2B2B2B',
}

// A5 portrait height in PostScript points (~595pt)
// 20% spacer = ~119pt
const A5_HEIGHT_PT = 595
const STEP_SPACER_PT = Math.round(A5_HEIGHT_PT * 0.2)

// --- Utils ------------------------------------------------------------------
const SEGMENT_ICON: Record<string, string> = {
  flight: '✈️',
  hotel: '🏨',
  transfer: '🚐',
  train: '🚆',
  activity: '🎟️',
  transport: '🚌',
  meal: '🍽️',
  default: ' ',
}

const SEGMENT_LABEL: Record<string, string> = {
  flight: 'Vol',
  hotel: 'Hôtel',
  transfer: 'Transfert',
  train: 'Train',
  activity: 'Activité',
  transport: 'Transport',
  meal: 'Repas',
  default: 'Service',
}

function iconFor(role: string): string {
  return SEGMENT_ICON[role] || SEGMENT_ICON.default
}

function labelFor(role: string): string {
  return SEGMENT_LABEL[role] || SEGMENT_LABEL.default
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: undefined,
  })
}

export function formatDateFull(date: string | Date | undefined): string {
  if (!date) return "";

  // Si c’est une string type "DD/MM/YYYY"
  if (typeof date === "string" && date.includes("/")) {
    const [day, month, year] = date.split("/");
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
  }

  // Si c’est une Date ou un format ISO
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}


function formatDateRange(start?: string, end?: string): string {
  if (!start && !end) return ''
  if (start && !end) return formatDateFull(start)
  if (!start && end) return formatDateFull(end)
  const s = new Date(start!)
  const e = new Date(end!)
  if (isNaN(s as any) || isNaN(e as any))
    return `${start || ''} – ${end || ''}`

  const sameMonth =
    s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()
  if (sameMonth) {
    return `${s.getDate()} → ${e.getDate()} ${e.toLocaleString('fr-FR', {
      month: 'long',
    })} ${e.getFullYear()}`
  }
  return `${formatDateFull(start)} → ${formatDateFull(end)}`
}

function parseDateFlexible(v?: string | null): Date | null {
  if (!v) return null
  // already a Date-like ISO string
  // handle DD/MM/YYYY
  if (v.includes('/')) {
    const parts = v.split('/')
    if (parts.length === 3) {
      const dd = parseInt(parts[0], 10)
      const mm = parseInt(parts[1], 10)
      const yyyy = parseInt(parts[2], 10)
      if (!isNaN(dd) && !isNaN(mm) && !isNaN(yyyy)) {
        // use Date in local then normalize via UTC components
        return new Date(yyyy, mm - 1, dd)
      }
    }
  }
  // fallback to Date constructor (ISO / other)
  const d = new Date(v)
  if (isNaN(d.getTime())) return null
  return d
}

function daysBetween(start?: string, end?: string): number | string {
  const s = parseDateFlexible(start ?? null)
  const e = parseDateFlexible(end ?? null)
  if (!s || !e) return ''

  // Normalize to UTC midnight to avoid DST issues
  const utcStart = Date.UTC(s.getFullYear(), s.getMonth(), s.getDate())
  const utcEnd = Date.UTC(e.getFullYear(), e.getMonth(), e.getDate())
  const msPerDay = 1000 * 60 * 60 * 24
  const diffDays = Math.floor((utcEnd - utcStart) / msPerDay) + 1 // inclusive
  return diffDays > 0 ? diffDays : 1
}

function stringify(v: any): string {
  if (v === undefined || v === null) return ''
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
    return String(v)
  if (Array.isArray(v)) return v.join(', ')
  if (typeof v === 'object') {
    if (v.name) return String(v.name)
    if (v.title) return String(v.title)
    if (v.rate) return String(v.rate)
    try {
      return JSON.stringify(v)
    } catch {
      return String(v)
    }
  }
  return String(v)
}

function pick(...vals: (string | undefined | null)[]): string {
  // renvoie le 1er truthy string
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
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
  pageNumber: {
    position: 'absolute',
    bottom: 18,
    right: 40,
    fontSize: 9,
    color: theme.gray700,
  },

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
  coverImage: {
    width: '100%',
    height: 240,
    objectFit: 'cover',
    borderRadius: 6,
  },
  dateStrip: {
    marginTop: 12,
    backgroundColor: theme.gray100,
    borderWidth: 1,
    borderColor: theme.gray200,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    textAlign: 'center',
  },
  dateLine: { fontSize: 12, fontWeight: 600 },
  smallMuted: { fontSize: 10, color: theme.gray700, marginTop: 2 },

  sectionBlock: { marginTop: 18 },
  sectionHeader: {
    backgroundColor: theme.primary,
    color: 'white',
    paddingVertical: 6,
    paddingHorizontal: 10,
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
    borderWidth: 1,
    borderColor: theme.gray300,
    borderRadius: 6,
    overflow: 'hidden',
  },
  stepHeader: {
    backgroundColor: theme.gray100,
    borderBottomWidth: 1,
    borderBottomColor: theme.gray300,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepHeaderTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  stepHeaderDate: { fontSize: 10, color: theme.gray700 },
  stepBody: { padding: 10, gap: 6 },
  stepOverview: { fontSize: 11 },
  segment: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.gray200,
    borderRadius: 4,
  },
  segmentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  segmentTitle: { fontSize: 11, fontWeight: 'bold' },
  segmentBadge: {
    fontSize: 10,
    backgroundColor: theme.sand,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  segmentMeta: { fontSize: 10, color: theme.gray700, marginTop: 2 },
  stepListTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
    color: theme.gray700,
  },
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
  infoGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoCard: {
    width: '48%',
    borderWidth: 1,
    borderColor: theme.gray300,
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
    borderWidth: 1,
    borderColor: theme.gray300,
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  cardTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  paragraph: { fontSize: 10, marginBottom: 3 },

  // Notes
  noteLine: { height: 1, backgroundColor: theme.gray300, marginVertical: 8 },
})


// --- Shared header/footer ----------------------------------------------------

export const PageFooter: React.FC = () => (
  <Text
    style={styles.pageNumber}
    render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
      `Page ${pageNumber} / ${totalPages}`
    }
    fixed
  />
)

// PageHeader component removed (no header requested)

// ---------------- COVER ----------------
interface CoverProps {
  cover?: any
  brand?: any
}

export const Cover: React.FC<CoverProps> = (props: any) => {
  const cover: any = props.cover || {}
  const brand: any = props.brand || {}
  const destination = pick(cover.title, cover.destination)
  const start = cover.startDate || cover.start || cover.start_date
  const end = cover.endDate || cover.end || cover.end_date
  const images: string[] = Array.isArray(cover.images) ? cover.images.slice(0, 2) : []
  const days = start && end ? daysBetween(start, end) : ''
  const travelers = pick(cover.travelers, brand.travelers)
  const agency = pick(cover.agency, brand.agencyName)
  const reference = pick(cover.reference, brand.reference)
  const headerRight = [agency, reference].filter(Boolean).join(' • ')

  return (
    <View
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        padding: 0,
        margin: 0,
      }}
    >
      {/* Bandeau supérieur */}
      <View
        style={{
          backgroundColor: theme.primary,
          paddingVertical: 14,
          textAlign: 'center',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <Text
          style={{
            fontSize: 22,
            color: 'white',
            fontWeight: 'bold',
            textTransform: 'uppercase',
          }}
        >
          {destination || 'Carnet de voyage'}
        </Text>
        {headerRight && (
          <Text
            style={{
              fontSize: 10,
              color: 'white',
              marginTop: 2,
            }}
          >
            {headerRight}
          </Text>
        )}
      </View>

      {/* Zone centrale : 2 images demi-page */}
      <View
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
        }}
      >
        {images.map((src, i) => (
          <Image
            key={i}
            src={src}
            style={{
              width: '100%',
              height: '50%',
              objectFit: 'cover',
              objectPosition: 'center',
              margin: 0,
              padding: 0,
            }}
          />
        ))}
      </View>

      {/* Bandeau inférieur : dates + voyageurs */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          backgroundColor: theme.primary,
          color: 'white',
          textAlign: 'center',
          paddingVertical: 10,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: 'bold',
            color: 'white',
          }}
        >
          {`${formatDateFull(start)}${
            end ? ` - ${formatDateFull(end)}` : ''
          }${start && end ? `  ·  ${days} jour${Number(days) > 1 ? 's' : ''}` : ''}`}
        </Text>
        {travelers && (
          <Text
            style={{
              fontSize: 10,
              color: 'white',
              marginTop: 2,
            }}
          >
            {travelers}
          </Text>
        )}
      </View>
    </View>
  )
}

// ---------------- ITINERARY ----------------
interface ItineraryProps {
  itinerary?: any[]
  brand?: any
}

export const Itinerary: React.FC<ItineraryProps> = (props: any) => {
  const itinerary: any[] = props.itinerary || []
  const brand: any = props.brand || {}
  const A5_HEIGHT_PT = 595
  const STEP_SPACER_PT = Math.round(A5_HEIGHT_PT * 0.1)
  const MIN_IMAGE_HEIGHT_PT = Math.round(A5_HEIGHT_PT * 0.35)

  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionHeader}>Programme détaillé</Text>

      <View style={styles.contentWrap}>
        {itinerary.map((step: any, i: number) => {
          const title = step.title || `Étape ${i + 1}`
          const dateRange = `${formatDate(step.start_date)}${
            step.end_date && step.end_date !== step.start_date
              ? ` – ${formatDate(step.end_date)}`
              : ''
          }`

          // === Étape principale ===
          const infosBlock = (
            <View key={step.id || i} style={{ marginBottom: 22 }}>
              {/* Bandeau d’étape */}
              <View style={{ marginBottom: 6 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    color: theme.primary,
                  }}
                >
                  {`${dateRange}  •  ${title}`}
                </Text>
              </View>

              {/* Aperçu */}
              {step.overview && (
                <Text style={{ fontSize: 11, marginBottom: 6 }}>
                  {step.overview}
                </Text>
              )}

              {/* Segments */}
              {(step.segments || []).map((s: any, si: number) => {
                const roleLabel =
                  SEGMENT_LABEL[s.role] || SEGMENT_LABEL.default
                const infos: string[] = []

                if (s.description) infos.push(s.description)
                if (s.duration) infos.push(s.duration)
                if (s.start_time || s.end_time) {
                  let t = ''
                  if (s.start_time) t += `Départ à ${s.start_time}`
                  if (s.end_time)
                    t += (t ? ', ' : '') + `Arrivée à ${s.end_time}`
                  infos.push(t)
                }
                if (s.provider) infos.push(s.provider)
                if (s.address) infos.push(s.address)
                if (s.phone) infos.push(`Contact: ${s.phone}`)

                return (
                  <View
                    key={s.id || si}
                    wrap={false}
                    style={{
                      marginBottom: 8,
                      paddingLeft: 8,
                      borderLeft: `2 solid ${theme.primary}`,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: 'bold',
                        marginBottom: 2,
                      }}
                    >
                      {`${roleLabel} — ${stringify(s.title)}`}
                    </Text>
                    {infos.map((line, li) => (
                      <Text
                        key={li}
                        style={{
                          fontSize: 10,
                          color: theme.text,
                          lineHeight: 1.4,
                        }}
                      >
                        • {line}
                      </Text>
                    ))}
                  </View>
                )
              })}

              {/* Notes */}
              {step.tips && step.tips.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: 'bold',
                      marginBottom: 2,
                    }}
                  >
                    NOTE
                  </Text>
                  {step.tips.map((t: string, ti: number) => (
                    <Text
                      key={ti}
                      style={{
                        fontSize: 10,
                        color: theme.text,
                        marginLeft: 6,
                        lineHeight: 1.4,
                      }}
                    >
                      • {t}
                    </Text>
                  ))}
                </View>
              )}

              {/* Info locale */}
              {step.local_context && (
                <View style={{ marginTop: 10 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: 'bold',
                      marginBottom: 2,
                    }}
                  >
                    INFO LOCALE
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      color: theme.text,
                      lineHeight: 1.4,
                    }}
                  >
                    {step.local_context}
                  </Text>
                </View>
              )}
            </View>
          )

          // === Images d’étape ===
          const images =
            Array.isArray(step.images) && step.images.length > 0
              ? step.images.map((img: string, idx: number) => (
                  <Image
                    key={`${i}-img-${idx}`}
                    src={img}
                    style={{
                      width: '100%',
                      height: MIN_IMAGE_HEIGHT_PT,
                      objectFit: 'cover',
                      marginTop: 8,
                      marginBottom: 4,
                    }}
                  />
                ))
              : null

          const imageBlock =
            images && images.length ? <View wrap={false}>{images}</View> : null

          const spacer =
            i !== itinerary.length - 1 ? (
              <View style={{ height: STEP_SPACER_PT }} />
            ) : null

          return (
            <React.Fragment key={step.id || i}>
              {infosBlock}
              {imageBlock}
              {spacer}
            </React.Fragment>
          )
        })}

        {/* Fin de nos services */}
        <Text style={styles.endOfService}>FIN DE NOS SERVICES</Text>
      </View>
    </View>
  )
}

// ---------------- THANK YOU ----------------
interface ThankYouProps {
  thank?: {
    greeting?: string
    para1?: string
    para2?: string
    para3?: string
    closing?: string
  }
  brand?: any
}

export const ThankYou: React.FC<ThankYouProps> = (props: any) => {
  const thank: any = props.thank || {}
  const brand: any = props.brand || {}
  const { greeting, para1, para2, para3, closing } = thank

  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionHeader}>Remerciements</Text>

      <View style={[styles.contentWrap, styles.thankBlock]}>
        {greeting && <Text style={styles.thankLine}>{greeting}</Text>}
        {para1 && <Text style={styles.thankLine}>{para1}</Text>}
        {para2 && <Text style={styles.thankLine}>{para2}</Text>}
        {para3 && <Text style={styles.thankLine}>{para3}</Text>}
        {closing && <Text style={styles.thankClosing}>{closing}</Text>}
      </View>
    </View>
  )
}


// ---------------- GENERAL INFO ----------------
interface GeneralInfoProps {
  info?: any
}

export const GeneralInfo: React.FC<GeneralInfoProps> = (props: any) => {
  const info: any = props.info || {}
  const Title = ({ text }: { text: string }) => (
    <Text
      style={{
        fontSize: 10,
        fontWeight: 'bold',
        color: theme.primary,
        marginTop: 7,
        marginBottom: 2,
        textTransform: 'uppercase',
      }}
    >
      {text}
    </Text>
  )

  const Paragraph = ({ text, keyVal }: { text: any; keyVal?: string | number }) => (
    <Text
      key={keyVal}
      style={{
        fontSize: 10.5,
        color: theme.text,
        marginBottom: 3,
        lineHeight: 1.4,
      }}
    >
      {stringify(text)}
    </Text>
  )

  const Bullet = ({ text, keyVal }: { text: any; keyVal?: string | number }) => (
    <Text
      key={keyVal}
      style={{
        fontSize: 10,
        color: theme.text,
        marginLeft: 8,
        marginBottom: 2,
      }}
    >
      • {stringify(text)}
    </Text>
  )

  const blocks: JSX.Element[] = []

  // --- APERÇU ---
  if (info.capital || info.population || info.surface_area) {
    blocks.push(
      <View key="base" wrap={false}>
        <Title text="APERÇU" />
        {info.capital && <Paragraph text={`Capitale : ${info.capital}`} />}
        {info.population && <Paragraph text={`Population : ${info.population}`} />}
        {info.surface_area && <Paragraph text={`Superficie : ${info.surface_area}`} />}
      </View>
    )
  }

  // --- FUSEAU ---
  if (info.timezone) {
    blocks.push(
      <View key="tz" wrap={false}>
        <Title text="FUSEAU HORAIRE" />
        {info.timezone.main && (
          <Paragraph text={`Fuseau principal : ${info.timezone.main}`} />
        )}
        {info.timezone.offset && <Paragraph text={info.timezone.offset} />}
      </View>
    )
  }

  // --- ENTRÉE ---
  if (info.entry) {
    blocks.push(
      <View key="entry" wrap={false}>
        <Title text="FORMALITÉS D’ENTRÉE" />
        {info.entry.passport && (
          <Paragraph text={`Passeport : ${info.entry.passport}`} />
        )}
        {info.entry.visa && <Paragraph text={`Visa : ${info.entry.visa}`} />}
        {info.entry.validity && (
          <Paragraph text={`Validité du séjour : ${info.entry.validity}`} />
        )}
      </View>
    )
  }

  // --- SANTÉ ---
  if (info.health) {
    blocks.push(
      <View key="health" wrap={false}>
        <Title text="SANTÉ" />
        {info.health.vaccines && (
          <Paragraph text={`Vaccins : ${info.health.vaccines}`} />
        )}
        {info.health.insurance && (
          <Paragraph text={`Assurance : ${info.health.insurance}`} />
        )}
        {info.health.water && (
          <Paragraph text={`Eau potable : ${info.health.water}`} />
        )}
      </View>
    )
  }

  // --- CLIMAT ---
  if (info.climate) {
    blocks.push(
      <View key="climate" wrap={false}>
        <Title text="CLIMAT" />
        {info.climate.current && (
          <Paragraph text={`Actuellement : ${info.climate.current}`} />
        )}
        {info.climate.summer && <Paragraph text={`Été : ${info.climate.summer}`} />}
        {info.climate.winter && <Paragraph text={`Hiver : ${info.climate.winter}`} />}
        {info.climate.autumn && <Paragraph text={`Automne : ${info.climate.autumn}`} />}
        {info.climate.spring && <Paragraph text={`Printemps : ${info.climate.spring}`} />}
      </View>
    )
  }

  // --- VÊTEMENTS ---
  if (info.clothing) {
    blocks.push(
      <View key="clothing" wrap={false}>
        <Title text="VÊTEMENTS RECOMMANDÉS" />
        {info.clothing.season && (
          <Paragraph text={`Saison conseillée : ${info.clothing.season}`} />
        )}
        {info.clothing.temperature && (
          <Paragraph text={`Températures moyennes : ${info.clothing.temperature}`} />
        )}
        {Array.isArray(info.clothing.items) &&
          info.clothing.items.map((i: any, idx: number) => (
            <Bullet keyVal={`cloth-${idx}`} text={i} />
          ))}
      </View>
    )
  }

  // --- SPÉCIALITÉS ---
  if (info.food?.specialties?.length) {
    blocks.push(
      <View key="food" wrap={false}>
        <Title text="SPÉCIALITÉS CULINAIRES" />
        {info.food.specialties.map((s: any, i: number) => (
          <Paragraph keyVal={`food-${i}`} text={`${s.region} : ${s.specialty}`} />
        ))}
      </View>
    )
  }

  // --- ARGENT ---
  if (info.currency || info.budget) {
    blocks.push(
      <View key="money" wrap={false}>
        <Title text="ARGENT ET BUDGET" />
        {info.currency?.name && (
          <Paragraph text={`Monnaie : ${info.currency.name}`} />
        )}
        {Array.isArray(info.currency?.exchange) &&
          info.currency.exchange.map((e: any, i: number) => (
            <Bullet keyVal={`ex-${i}`} text={e} />
          ))}
        {info.budget?.coffee && <Paragraph text={`Café : ${info.budget.coffee}`} />}
        {info.budget?.meal && <Paragraph text={`Repas : ${info.budget.meal}`} />}
        {info.budget?.restaurant && (
          <Paragraph text={`Restaurant : ${info.budget.restaurant}`} />
        )}
      </View>
    )
  }

  // --- POURBOIRES ---
  if (info.tipping) {
    blocks.push(
      <View key="tips" wrap={false}>
        <Title text="POURBOIRES" />
        {info.tipping.required && (
          <Paragraph text={`Usage : ${info.tipping.required}`} />
        )}
        {info.tipping.restaurants && (
          <Paragraph text={`Restaurants : ${info.tipping.restaurants}`} />
        )}
        {info.tipping.taxis && <Paragraph text={`Taxis : ${info.tipping.taxis}`} />}
        {info.tipping.guides && (
          <Paragraph text={`Guides : ${info.tipping.guides}`} />
        )}
        {info.tipping.porters && (
          <Paragraph text={`Portiers : ${info.tipping.porters}`} />
        )}
      </View>
    )
  }

  // --- ÉLECTRICITÉ ---
  if (info.electricity) {
    blocks.push(
      <View key="elec" wrap={false}>
        <Title text="ÉLECTRICITÉ" />
        {info.electricity.voltage && (
          <Paragraph text={`Tension : ${info.electricity.voltage}`} />
        )}
        {info.electricity.plugs && (
          <Paragraph text={`Prises : ${info.electricity.plugs}`} />
        )}
        {info.electricity.adapter && (
          <Paragraph text={`Adaptateur : ${info.electricity.adapter}`} />
        )}
      </View>
    )
  }

  // --- LANGUES ---
  if (info.languages) {
    blocks.push(
      <View key="lang" wrap={false}>
        <Title text="LANGUES" />
        {info.languages.official && (
          <Paragraph text={`Officielles : ${info.languages.official}`} />
        )}
        {info.languages.french && (
          <Paragraph text={`Français parlé : ${info.languages.french}`} />
        )}
        {info.languages.notes && <Paragraph text={info.languages.notes} />}
      </View>
    )
  }

  // --- RELIGION ---
  if (info.religion) {
    blocks.push(
      <View key="religion" wrap={false}>
        <Title text="RELIGION" />
        <Paragraph text={info.religion} />
      </View>
    )
  }

  // --- SÉCURITÉ ---
  if (info.safety) {
    blocks.push(
      <View key="safety" wrap={false}>
        <Title text="SÉCURITÉ" />
        <Paragraph text={info.safety} />
      </View>
    )
  }

  // --- CULTURE ---
  if (Array.isArray(info.cultural_sites) && info.cultural_sites.length) {
    blocks.push(
      <View key="culture" wrap={false}>
        <Title text="SITES CULTURELS" />
        {info.cultural_sites.map((c: any, i: number) => (
          <Paragraph keyVal={`culture-${i}`} text={`• ${c.name} — ${c.description}`} />
        ))}
      </View>
    )
  }

  // --- NATURE ---
  if (info.natural_attractions) {
    blocks.push(
      <View key="nature" wrap={false}>
        <Title text="ATTRACTIONS NATURELLES" />
        <Paragraph text={info.natural_attractions} />
      </View>
    )
  }

  // --- SHOPPING ---
  if (info.shopping) {
    blocks.push(
      <View key="shop" wrap={false}>
        <Title text="ACHATS & ARTISANAT" />
        <Paragraph text={info.shopping} />
      </View>
    )
  }

  // --- Rendu final ---
  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionHeader}>Informations générales</Text>
      <View style={[styles.contentWrap, { marginTop: 6 }]}>{blocks}</View>
    </View>
  )
}


// ---------------- EMERGENCY ----------------
interface EmergencyProps {
  contact?: any
}

export const Emergency: React.FC<EmergencyProps> = (props: any) => {
  const contact: any = props.contact || {}
  const SectionTitle = ({ text }: { text: string }) => (
    <View
      style={{
        backgroundColor: theme.gray200,
        paddingVertical: 4,
        paddingHorizontal: 6,
        marginTop: 8,
        marginBottom: 4,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: 'bold',
          color: theme.text,
        }}
      >
        {text}
      </Text>
    </View>
  )

  const SubTitle = ({ text }: { text: string }) => (
    <Text
      style={{
        fontSize: 10.5,
        fontWeight: 'bold',
        marginTop: 4,
        marginBottom: 2,
        color: theme.text,
      }}
    >
      {text}
    </Text>
  )

  const Paragraph = ({ text, keyVal }: { text: any; keyVal?: string | number }) => (
    <Text
      key={keyVal}
      style={{
        fontSize: 10,
        color: theme.text,
        marginBottom: 4,
        textAlign: 'justify',
        lineHeight: 1.4,
      }}
    >
      {stringify(text)}
    </Text>
  )

  const Bullet = ({ text, keyVal }: { text: any; keyVal?: string | number }) => (
    <Text
      key={keyVal}
      style={{
        fontSize: 10,
        color: theme.text,
        marginLeft: 10,
        marginBottom: 2,
        textAlign: 'justify',
      }}
    >
      ※ {stringify(text)}
    </Text>
  )

  const EmergencyHighlight = ({ text }: { text: any }) => (
    <Text
      style={{
        backgroundColor: theme.sand,
        color: theme.primaryDark,
        fontWeight: 'bold',
      }}
    >
      {stringify(text)}
    </Text>
  )

  return (
    <View style={styles.sectionBlock}>
      <Text style={[styles.sectionHeader, { marginBottom: 6 }]}>Qui contacter pendant votre voyage en cas de nécessité ?</Text>

      <View style={styles.contentWrap}>
        {/* 1. Avant le départ */}
        <View wrap={false}>
          <SectionTitle text="1. Avant votre départ" />
          {contact.before_departure?.text && (
            <Paragraph text={contact.before_departure.text} />
          )}
        </View>

        {/* 2. Le jour du départ */}
        <View wrap={false}>
          <SectionTitle text="2. Le jour de votre départ" />
          {contact.departure_day?.flights?.text && (
            <View>
              <SubTitle text="a. Les vols" />
              <Paragraph text={contact.departure_day.flights.text} />
            </View>
          )}
          {contact.departure_day?.agency?.text && (
            <View>
              <SubTitle text="b. Votre voyagiste" />
              <Paragraph text={contact.departure_day.agency.text} />
            </View>
          )}
        </View>

        {/* 3. Après le départ */}
        <View wrap={false}>
          <SectionTitle text="3. Après votre départ" />
          {contact.after_departure?.intro && (
            <Paragraph text={contact.after_departure.intro} />
          )}

          {contact.after_departure?.flights?.text && (
            <View>
              <SubTitle text="a. Les vols" />
              <Paragraph text={contact.after_departure.flights.text} />
            </View>
          )}

          {contact.after_departure?.local && (
            <View>
              <SubTitle text="b. Nos correspondants locaux :" />
              {contact.after_departure.local.name && (
                <Paragraph text={contact.after_departure.local.name} />
              )}
              {contact.after_departure.local.phone && (
                <Paragraph text={contact.after_departure.local.phone} />
              )}
              {Array.isArray(contact.after_departure.local.items) &&
                contact.after_departure.local.items.map((it: any, i: number) => (
                  <Bullet keyVal={`local-${i}`} text={it} />
                ))}
              {contact.after_departure.local.note && (
                <Paragraph text={contact.after_departure.local.note} />
              )}
            </View>
          )}

          {contact.after_departure?.agency?.text && (
            <View>
              <SubTitle text="c. Votre voyagiste" />
              <Paragraph text={contact.after_departure.agency.text} />
            </View>
          )}
        </View>

        {/* 4. Cas d’urgence */}
        <View wrap={false}>
          <SectionTitle text="4. Pour les cas d’extrême urgence" />
          {contact.emergency?.text1 && <Paragraph text={contact.emergency.text1} />}
          {contact.emergency?.text2 && (
            <View>
              <Paragraph text={contact.emergency.text2} />
              {contact.emergency.phone && (
                <Paragraph
                  text={
                    <>
                      Numéro d’urgence :{' '}
                      <EmergencyHighlight text={contact.emergency.phone} />
                    </>
                  }
                />
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  )
}

// ---------------- NOTES ----------------
export const Notes: React.FC = () => (
  <View style={styles.sectionBlock}>
    <Text style={styles.sectionHeader}>Mes souvenirs</Text>
    <View style={styles.contentWrap}>
      <Text style={styles.paragraph}>
        Écrivez ici vos impressions, vos adresses favorites, vos rencontres…
      </Text>
      {Array.from({ length: 55 }).map((_, i) => (
        <View key={i} style={styles.noteLine} />
      ))}
    </View>
  </View>
)

// ---------------- DOCUMENT ----------------
interface BookletDocumentProps {
  data: any
}

export const BookletDocument: React.FC<BookletDocumentProps> = ({ data }: { data: any }) => {
  const cover = data.cover || {}
  const brand = {
    logoUrl: cover.logoUrl || data.brand?.logoUrl,
    agencyName: cover.agency || data.brand?.agencyName,
    reference: cover.reference || data.brand?.reference,
    travelers: cover.travelers || data.brand?.travelers,
  }

  return (
    <Document>
      {/* Cover */}
      <Page size="A5" style={styles.coverPage}>
        <Cover cover={cover} brand={brand} />
      </Page>

      {/* Itinerary */}
      <Page size="A5" style={styles.page}>
        <Itinerary itinerary={data.itinerary || []} brand={brand} />
        <PageFooter />
      </Page>

      {/* Thank You */}
      <Page size="A5" style={styles.page}>
        <ThankYou thank={data.thank_you || {}} brand={brand} />
        <PageFooter />
      </Page>

      {/* General Info */}
      <Page size="A5" style={styles.page}>
        <GeneralInfo info={data.general_info || {}} />
        <PageFooter />
      </Page>

      {/* Emergency */}
      <Page size="A5" style={styles.page}>
        <Emergency contact={data.emergency_contacts || {}} />
        <PageFooter />
      </Page>

      {/* Notes */}
      <Page size="A5" style={styles.page}>
        <Notes />
        <PageFooter />
      </Page>
    </Document>
  )
}

export default BookletDocument
