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
// Font.register({ family: 'Playfair Display', src: path.resolve(__dirname, './fonts/PlayfairDisplay-Regular.ttf') })
// Font.register({ family: 'Lato', src: path.resolve(__dirname, './fonts/Lato-Regular.ttf') })
// Font.register({ family: 'Lato', src: path.resolve(__dirname, './fonts/Lato-Bold.ttf'), fontWeight: 'bold' })

const DEFAULT_TEXT = 'Helvetica'
const TITLE_FONT = 'Helvetica'
const BODY_FONT = 'Helvetica'

// --- Thème ------------------------------------------------------------------
const theme = {
  primary: '#822a62',
  primaryDark: '#611717',
  sand: '#c084ab',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray700: '#374151',
  text: '#2B2B2B',
}

// A5
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

function labelFor(role: string): string {
  return SEGMENT_LABEL[role] || SEGMENT_LABEL.default
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: undefined })
}

export function formatDateFull(date: string | Date | undefined): string {
  if (!date) return ''
  if (typeof date === 'string' && date.includes('/')) {
    const [day, month, year] = date.split('/')
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`
  }
  const d = new Date(date as any)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function parseDateFlexible(v?: string | null): Date | null {
  if (!v) return null
  if (v.includes('/')) {
    const parts = v.split('/')
    if (parts.length === 3) {
      const dd = parseInt(parts[0], 10)
      const mm = parseInt(parts[1], 10)
      const yyyy = parseInt(parts[2], 10)
      if (!isNaN(dd) && !isNaN(mm) && !isNaN(yyyy)) {
        return new Date(yyyy, mm - 1, dd)
      }
    }
  }
  const d = new Date(v)
  if (isNaN(d.getTime())) return null
  return d
}

function daysBetween(start?: string, end?: string): number | string {
  const s = parseDateFlexible(start ?? null)
  const e = parseDateFlexible(end ?? null)
  if (!s || !e) return ''
  const utcStart = Date.UTC(s.getFullYear(), s.getMonth(), s.getDate())
  const utcEnd = Date.UTC(e.getFullYear(), e.getMonth(), e.getDate())
  const msPerDay = 1000 * 60 * 60 * 24
  const diffDays = Math.floor((utcEnd - utcStart) / msPerDay) + 1
  return diffDays > 0 ? diffDays : 1
}

/** stringify — robuste : ne renvoie JAMAIS "" (au pire " "). */
function stringify(v: any, context: string = 'unknown'): string {
  if (v === undefined || v === null) {
    console.log(`⚠️ [${context}] received undefined/null`)
    return ' '
  }
  if (typeof v === 'string') {
    if (v.trim() === '') {
      console.log(`⚠️ [${context}] empty string detected`)
      return ' '
    }
    return v
  }
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)

  if (Array.isArray(v)) {
    const result = v.map((x, i) => stringify(x, `${context}[${i}]`)).join(', ')
    if (result.trim() === '') console.log(`⚠️ [${context}] array produced empty string`)
    return result.trim() === '' ? ' ' : result
  }

  if (typeof v === 'object') {
    if (React.isValidElement(v)) {
      console.log(`⚠️ [${context}] JSX element passed to stringify()`)
      return ' '
    }
    if ((v as any).name) return String((v as any).name)
    if ((v as any).title) return String((v as any).title)
    if ((v as any).rate) return String((v as any).rate)
    try {
      const json = JSON.stringify(v)
      if (json === '{}') console.log(`⚠️ [${context}] empty object`)
      return json.trim() === '' ? ' ' : json
    } catch {
      console.log(`⚠️ [${context}] failed JSON.stringify`)
      return ' '
    }
  }
  return String(v)
}

function pick(...vals: (string | undefined | null)[]): string {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

/** SafeText — force tout texte à passer par stringify() */
const SafeText: React.FC<{ value: any; style?: any; ctx?: string; renderPrefix?: string; renderSuffix?: string }> = ({
  value,
  style,
  ctx = 'text',
  renderPrefix = '',
  renderSuffix = '',
}) => {
  const s = stringify(value, ctx)
  return <Text style={style}>{`${renderPrefix}${s}${renderSuffix}`}</Text>
}

/** SafeView — filtre automatiquement toute chaîne brute enfant (erreurs React-PDF) */
const SafeView: React.FC<{ style?: any; wrap?: boolean }> = ({ style, wrap, children }) => {
  const safeChildren = React.Children.toArray(children).filter(
    (ch: any) => !(typeof ch === 'string' || typeof ch === 'number')
  )
  // @ts-ignore wrap est accepté par react-pdf
  return <View style={style} wrap={wrap}>{safeChildren}</View>
}

// --- Styles -----------------------------------------------------------------
const styles = StyleSheet.create({
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
  headerBar: {},
  pageNumber: {
    position: 'absolute',
    bottom: 18,
    right: 40,
    fontSize: 9,
    color: theme.gray700,
  },

  // Cover
  coverPage: { padding: 0, margin: 0, width: '100%', height: '100%', backgroundColor: 'white' },

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
    borderWidth: 1,
    borderColor: theme.gray200,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    textAlign: 'center',
  },
  dateLine: { fontSize: 12, fontWeight: 600 as any },
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
  stepCard: { marginBottom: 14, borderWidth: 1, borderColor: theme.gray300, borderRadius: 6, overflow: 'hidden' },
  stepHeader: {
    backgroundColor: theme.gray100,
    borderBottomWidth: 1,
    borderBottomColor: theme.gray300,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepHeaderTitle: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  stepHeaderDate: { fontSize: 10, color: theme.gray700 },
  stepBody: { padding: 10, gap: 6 },
  stepOverview: { fontSize: 11 },

  segment: { padding: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: theme.gray200, borderRadius: 4 },
  segmentTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  segmentTitle: { fontSize: 11, fontWeight: 'bold' },
  segmentBadge: { fontSize: 10, backgroundColor: theme.sand, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4 },
  segmentMeta: { fontSize: 10, color: theme.gray700, marginTop: 2 },

  stepListTitle: { fontSize: 10, fontWeight: 'bold', marginTop: 4, color: theme.gray700 },
  stepListItem: { fontSize: 10, color: theme.gray700, marginLeft: 6 },

  endOfService: { marginTop: 30, textAlign: 'center', fontWeight: 'bold', fontSize: 12, color: theme.primary },

  // General info
  infoGrid: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoCard: { width: '48%', borderWidth: 1, borderColor: theme.gray300, backgroundColor: theme.gray100, borderRadius: 6, padding: 8 },
  infoTitle: { fontSize: 11, fontWeight: 'bold', marginBottom: 2 },
  infoText: { fontSize: 10 },

  // Thank you
  thankBlock: { gap: 6 },
  thankLine: { fontSize: 11 },
  thankClosing: { fontSize: 11, fontWeight: 'bold', marginTop: 8 },

  // Emergency
  card: { borderWidth: 1, borderColor: theme.gray300, borderRadius: 6, padding: 10, marginBottom: 10, backgroundColor: '#fff' },
  cardTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  paragraph: { fontSize: 10, marginBottom: 3 },

  // Notes
  noteLine: { height: 1, backgroundColor: theme.gray300, marginVertical: 8 },
})

// --- Footer -----------------------------------------------------------------
export const PageFooter: React.FC = () => (
  <Text
    style={styles.pageNumber}
    render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
      `Page ${pageNumber} / ${totalPages}`
    }
    fixed
  />
)

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

  // Prépare la ligne de dates de manière sûre
  const dateLine = (() => {
    const startStr = formatDateFull(start)
    const endStr = end ? formatDateFull(end) : ''
    const daysStr =
      start && end ? `  ·  ${days} jour${Number(days) > 1 ? 's' : ''}` : ''
    const finalStr = `${startStr}${endStr ? ` - ${endStr}` : ''}${daysStr}`
    return finalStr.trim() === '' ? ' ' : finalStr
  })()

  return (
    <SafeView
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        padding: 0,
        margin: 0,
      }}
    >
      {/* Bandeau supérieur */}
      <SafeView
        style={{
          backgroundColor: theme.primary,
          paddingVertical: 8,
          paddingHorizontal: 12,
          width: '100%',
          position: 'relative',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {/* Left: logo */}
        <SafeView style={{ width: 80, height: 40, justifyContent: 'center' }}>
          <Image
            src={brand.logoUrl || 'https://www.ad-gentes.ch/build/assets/images/logo-adgentes.33ba4059.png'}
            style={{ width: 80, height: 40, objectFit: 'contain' }}
          />
        </SafeView>

        {/* Center: title */}
        <SafeView
          style={{
            position: 'absolute',
            left: 92,
            right: 152,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SafeText
            ctx="cover.destination"
            style={{ fontSize: 20, color: 'white', fontWeight: 'bold', textTransform: 'uppercase' }}
            value={destination || 'Carnet de voyage'}
          />
        </SafeView>

        {/* Right: header info */}
        <SafeView style={{ width: 140, alignItems: 'flex-end', justifyContent: 'center' }}>
          {Boolean(headerRight) ? (
            <SafeText ctx="cover.headerRight" style={{ fontSize: 10, color: 'white' }} value={headerRight} />
          ) : (
            <SafeView />
          )}
        </SafeView>
      </SafeView>

      {/* Zone centrale : 2 images demi-page */}
      <SafeView style={{ flex: 1, width: '100%', height: '100%' }}>
        {images
          .filter(Boolean)
          .map((src, i) => (
            <Image
              key={`cover-img-${i}`}
              src={src}
              style={{ width: '100%', height: '50%', objectFit: 'cover', objectPosition: 'center', margin: 0, padding: 0 }}
            />
          ))}
      </SafeView>

      {/* Bandeau inférieur : dates + voyageurs */}
      <SafeView
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
        <SafeText ctx="cover.dateLine" style={{ fontSize: 11, fontWeight: 'bold', color: 'white' }} value={dateLine} />
        {Boolean(travelers) && (
          <SafeText ctx="cover.travelers" style={{ fontSize: 10, color: 'white', marginTop: 2 }} value={travelers} />
        )}
      </SafeView>
    </SafeView>
  )
}

// ---------------- ITINERARY ----------------
interface ItineraryProps { itinerary?: any[]; brand?: any }

export const Itinerary: React.FC<ItineraryProps> = (props: any) => {
  const itinerary: any[] = props.itinerary || []
  const A5_HEIGHT_PT = 595
  const STEP_SPACER_PT = Math.round(A5_HEIGHT_PT * 0.1)
  const MIN_IMAGE_HEIGHT_PT = Math.round(A5_HEIGHT_PT * 0.35)

  return (
    <SafeView style={styles.sectionBlock}>
      <Text style={styles.sectionHeader}>Programme détaillé</Text>

      <SafeView style={styles.contentWrap}>
        {itinerary.map((step: any, i: number) => {
          const title = step.title || `Étape ${i + 1}`
          const dateRange = `${formatDate(step.start_date)}${
            step.end_date && step.end_date !== step.start_date ? ` – ${formatDate(step.end_date)}` : ''
          }`

          // --- Étape principale
          const infosBlock = (
            <SafeView key={step.id || i} style={{ marginBottom: 22 }}>
              {/* Bandeau d’étape */}
              <SafeView style={{ marginBottom: 6 }}>
                <SafeText
                  ctx={`itinerary[${i}].header`}
                  style={{ fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', color: theme.primary }}
                  value={`${dateRange}  •  ${stringify(title, `itinerary[${i}].title`)}`}
                />
              </SafeView>

              {/* Aperçu */}
              {Boolean(step.overview) && (
                <SafeText
                  ctx={`itinerary[${i}].overview`}
                  style={{ fontSize: 11, marginBottom: 6 }}
                  value={step.overview}
                />
              )}

              {/* Segments */}
              {(step.segments || []).map((s: any, si: number) => {
                const roleLabel = labelFor(s.role)

                const infosRaw: string[] = []
                if (s.description) infosRaw.push(s.description)
                if (s.duration) infosRaw.push(s.duration)
                if (s.start_time || s.end_time) {
                  let t = ''
                  if (s.start_time) t += `Départ à ${s.start_time}`
                  if (s.end_time) t += (t ? ', ' : '') + `Arrivée à ${s.end_time}`
                  infosRaw.push(t)
                }
                if (s.provider) infosRaw.push(s.provider)
                if (s.address) infosRaw.push(s.address)
                if (s.phone) infosRaw.push(`Contact: ${s.phone}`)

                const infos = infosRaw.filter(v => typeof v === 'string' && v.trim() !== '')

                return (
                  <SafeView
                    key={s.id || si}
                    wrap={false}
                    style={{
                      marginBottom: 8,
                      paddingLeft: 8,
                      borderLeftWidth: 2,
                      borderLeftColor: theme.primary,
                      borderLeftStyle: 'solid',
                    }}
                  >
                    <SafeText
                      ctx={`segment[${si}].title`}
                      style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 2 }}
                      value={`${roleLabel} — ${stringify(s.title, `segment[${si}].title`)}`}
                    />

                    {infos.map((line, li) => (
                      <SafeText
                        key={`seg-${s.id || si}-info-${li}`}
                        ctx={`segment[${si}].info[${li}]`}
                        style={{ fontSize: 10, color: theme.text, lineHeight: 1.4 }}
                        renderPrefix="• "
                        value={line}
                      />
                    ))}
                  </SafeView>
                )
              })}

              {/* Notes */}
              {Array.isArray(step.tips) && step.tips.filter(t => t && String(t).trim() !== '').length > 0 && (
                <SafeView style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 2 }}>NOTE</Text>
                  {step.tips
                    .filter((t: any) => t && String(t).trim() !== '')
                    .map((t: string, ti: number) => (
                      <SafeText
                        key={`step-${step.id || i}-tip-${ti}`}
                        ctx={`itinerary[${i}].tip[${ti}]`}
                        style={{ fontSize: 10, color: theme.text, marginLeft: 6, lineHeight: 1.4 }}
                        renderPrefix="• "
                        value={t}
                      />
                    ))}
                </SafeView>
              )}

              {/* Info locale */}
              {Boolean(step.local_context) && (
                <SafeView style={{ marginTop: 10 }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 2 }}>INFO LOCALE</Text>
                  <SafeText
                    ctx={`itinerary[${i}].local_context`}
                    style={{ fontSize: 10, color: theme.text, lineHeight: 1.4 }}
                    value={step.local_context}
                  />
                </SafeView>
              )}
            </SafeView>
          )

          // --- Images d’étape
          const images =
            Array.isArray(step.images) && step.images.length > 0
              ? step.images
                  .filter(Boolean)
                  .map((img: string, idx: number) => (
                    <Image
                      key={`${i}-img-${idx}`}
                      src={img}
                      style={{ width: '100%', height: MIN_IMAGE_HEIGHT_PT, objectFit: 'cover', marginTop: 8, marginBottom: 4 }}
                    />
                  ))
              : null

          const imageBlock = images && images.length ? <SafeView wrap={false}>{images}</SafeView> : null
          const spacer = i !== itinerary.length - 1 ? <SafeView style={{ height: STEP_SPACER_PT }} /> : null

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
      </SafeView>
    </SafeView>
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

  return (
    <SafeView style={styles.sectionBlock}>
      <Text style={styles.sectionHeader}>Remerciements</Text>

      <SafeView style={[styles.contentWrap, styles.thankBlock]}>
        {Boolean(thank.greeting) && <SafeText ctx="thank.greeting" style={styles.thankLine} value={thank.greeting} />}
        {Boolean(thank.para1) && <SafeText ctx="thank.para1" style={styles.thankLine} value={thank.para1} />}
        {Boolean(thank.para2) && <SafeText ctx="thank.para2" style={styles.thankLine} value={thank.para2} />}
        {Boolean(thank.para3) && <SafeText ctx="thank.para3" style={styles.thankLine} value={thank.para3} />}
        {Boolean(thank.closing) && <SafeText ctx="thank.closing" style={styles.thankClosing} value={thank.closing} />}
      </SafeView>
    </SafeView>
  )
}

// ---------------- GENERAL INFO ----------------
interface GeneralInfoProps { info?: any }

export const GeneralInfo: React.FC<GeneralInfoProps> = (props: any) => {
  const info: any = props.info || {}

  const Title = ({ text }: { text: string }) => (
    <SafeText ctx="general.title" style={{ fontSize: 10, fontWeight: 'bold', color: theme.primary, marginTop: 7, marginBottom: 2, textTransform: 'uppercase' }} value={text} />
  )

  const Paragraph = ({ text, keyVal }: { text: any; keyVal?: string | number }) => (
    <SafeText
      ctx={keyVal ? `paragraph[${keyVal}]` : 'paragraph'}
      style={{ fontSize: 10.5, color: theme.text, marginBottom: 3, lineHeight: 1.4 }}
      value={text}
    />
  )

  const Bullet = ({ text, keyVal }: { text: any; keyVal?: string | number }) => (
    <SafeText
      ctx={keyVal ? `bullet[${keyVal}]` : 'bullet'}
      style={{ fontSize: 10, color: theme.text, marginLeft: 8, marginBottom: 2 }}
      renderPrefix="• "
      value={text}
    />
  )

  const blocks: JSX.Element[] = []

  // APERÇU
  if (info.capital || info.population || info.surface_area) {
    blocks.push(
      <SafeView key="base" wrap={false}>
        <Title text="APERÇU" />
        {info.capital && <Paragraph text={`Capitale : ${info.capital}`} />}
        {info.population && <Paragraph text={`Population : ${info.population}`} />}
        {info.surface_area && <Paragraph text={`Superficie : ${info.surface_area}`} />}
      </SafeView>
    )
  }

  // FUSEAU
  if (info.timezone) {
    blocks.push(
      <SafeView key="tz" wrap={false}>
        <Title text="FUSEAU HORAIRE" />
        {info.timezone.main && <Paragraph text={`Fuseau principal : ${info.timezone.main}`} />}
        {info.timezone.offset && <Paragraph text={info.timezone.offset} />}
      </SafeView>
    )
  }

  // ENTRÉE
  if (info.entry) {
    blocks.push(
      <SafeView key="entry" wrap={false}>
        <Title text="FORMALITÉS D’ENTRÉE" />
        {info.entry.passport && <Paragraph text={`Passeport : ${info.entry.passport}`} />}
        {info.entry.visa && <Paragraph text={`Visa : ${info.entry.visa}`} />}
        {info.entry.validity && <Paragraph text={`Validité du séjour : ${info.entry.validity}`} />}
      </SafeView>
    )
  }

  // SANTÉ
  if (info.health) {
    blocks.push(
      <SafeView key="health" wrap={false}>
        <Title text="SANTÉ" />
        {info.health.vaccines && <Paragraph text={`Vaccins : ${info.health.vaccines}`} />}
        {info.health.insurance && <Paragraph text={`Assurance : ${info.health.insurance}`} />}
        {info.health.water && <Paragraph text={`Eau potable : ${info.health.water}`} />}
      </SafeView>
    )
  }

  // CLIMAT
  if (info.climate) {
    blocks.push(
      <SafeView key="climate" wrap={false}>
        <Title text="CLIMAT" />
        {info.climate.current && <Paragraph text={`Actuellement : ${info.climate.current}`} />}
        {info.climate.summer && <Paragraph text={`Été : ${info.climate.summer}`} />}
        {info.climate.winter && <Paragraph text={`Hiver : ${info.climate.winter}`} />}
        {info.climate.autumn && <Paragraph text={`Automne : ${info.climate.autumn}`} />}
        {info.climate.spring && <Paragraph text={`Printemps : ${info.climate.spring}`} />}
      </SafeView>
    )
  }

  // VÊTEMENTS
  if (info.clothing) {
    blocks.push(
      <SafeView key="clothing" wrap={false}>
        <Title text="VÊTEMENTS RECOMMANDÉS" />
        {info.clothing.season && <Paragraph text={`Saison conseillée : ${info.clothing.season}`} />}
        {info.clothing.temperature && <Paragraph text={`Températures moyennes : ${info.clothing.temperature}`} />}
        {Array.isArray(info.clothing.items) &&
          info.clothing.items
            .filter((x: any) => x && String(x).trim() !== '')
            .map((item: any, idx: number) => <Bullet key={`cloth-${idx}`} keyVal={`cloth-${idx}`} text={item} />)}
      </SafeView>
    )
  }

  // SPÉCIALITÉS
  if (info.food?.specialties?.length) {
    blocks.push(
      <SafeView key="food" wrap={false}>
        <Title text="SPÉCIALITÉS CULINAIRES" />
        {info.food.specialties
          .filter((s: any) => s && (s.region || s.specialty))
          .map((s: any, fi: number) => (
            <Paragraph key={`food-${fi}`} keyVal={`food-${fi}`} text={`${s.region} : ${s.specialty}`} />
          ))}
      </SafeView>
    )
  }

  // ARGENT
  if (info.currency || info.budget) {
    blocks.push(
      <SafeView key="money" wrap={false}>
        <Title text="ARGENT ET BUDGET" />
        {info.currency?.name && <Paragraph text={`Monnaie : ${info.currency.name}`} />}
        {Array.isArray(info.currency?.exchange) &&
          info.currency.exchange
            .filter((ex: any) => ex && String(ex).trim() !== '')
            .map((ex: any, ei: number) => <Bullet key={`ex-${ei}`} keyVal={`ex-${ei}`} text={ex} />)}
        {info.budget?.coffee && <Paragraph text={`Café : ${info.budget.coffee}`} />}
        {info.budget?.meal && <Paragraph text={`Repas : ${info.budget.meal}`} />}
        {info.budget?.restaurant && <Paragraph text={`Restaurant : ${info.budget.restaurant}`} />}
      </SafeView>
    )
  }

  // POURBOIRES
  if (info.tipping) {
    blocks.push(
      <SafeView key="tips" wrap={false}>
        <Title text="POURBOIRES" />
        {info.tipping.required && <Paragraph text={`Usage : ${info.tipping.required}`} />}
        {info.tipping.restaurants && <Paragraph text={`Restaurants : ${info.tipping.restaurants}`} />}
        {info.tipping.taxis && <Paragraph text={`Taxis : ${info.tipping.taxis}`} />}
        {info.tipping.guides && <Paragraph text={`Guides : ${info.tipping.guides}`} />}
        {info.tipping.porters && <Paragraph text={`Portiers : ${info.tipping.porters}`} />}
      </SafeView>
    )
  }

  // ÉLECTRICITÉ
  if (info.electricity) {
    blocks.push(
      <SafeView key="elec" wrap={false}>
        <Title text="ÉLECTRICITÉ" />
        {info.electricity.voltage && <Paragraph text={`Tension : ${info.electricity.voltage}`} />}
        {info.electricity.plugs && <Paragraph text={`Prises : ${info.electricity.plugs}`} />}
        {info.electricity.adapter && <Paragraph text={`Adaptateur : ${info.electricity.adapter}`} />}
      </SafeView>
    )
  }

  // LANGUES
  if (info.languages) {
    blocks.push(
      <SafeView key="lang" wrap={false}>
        <Title text="LANGUES" />
        {info.languages.official && <Paragraph text={`Officielles : ${info.languages.official}`} />}
        {info.languages.french && <Paragraph text={`Français parlé : ${info.languages.french}`} />}
        {info.languages.notes && <Paragraph text={info.languages.notes} />}
      </SafeView>
    )
  }

  // RELIGION
  if (info.religion) {
    blocks.push(
      <SafeView key="religion" wrap={false}>
        <Title text="RELIGION" />
        <Paragraph text={info.religion} />
      </SafeView>
    )
  }

  // SÉCURITÉ
  if (info.safety) {
    blocks.push(
      <SafeView key="safety" wrap={false}>
        <Title text="SÉCURITÉ" />
        <Paragraph text={info.safety} />
      </SafeView>
    )
  }

  // CULTURE
  if (Array.isArray(info.cultural_sites) && info.cultural_sites.length) {
    blocks.push(
      <SafeView key="culture" wrap={false}>
        <Title text="SITES CULTURELS" />
        {info.cultural_sites
          .filter((c: any) => c && (c.name || c.description))
          .map((c: any, ci: number) => (
            <Paragraph key={`culture-${ci}`} keyVal={`culture-${ci}`} text={`• ${c.name} — ${c.description}`} />
          ))}
      </SafeView>
    )
  }

  // NATURE
  if (info.natural_attractions) {
    blocks.push(
      <SafeView key="nature" wrap={false}>
        <Title text="ATTRACTIONS NATURELLES" />
        <Paragraph text={info.natural_attractions} />
      </SafeView>
    )
  }

  // SHOPPING
  if (info.shopping) {
    blocks.push(
      <SafeView key="shop" wrap={false}>
        <Title text="ACHATS & ARTISANAT" />
        <Paragraph text={info.shopping} />
      </SafeView>
    )
  }

  return (
    <SafeView style={styles.sectionBlock}>
      <Text style={styles.sectionHeader}>Informations générales</Text>
      <SafeView style={[styles.contentWrap, { marginTop: 6 }]}>{blocks}</SafeView>
    </SafeView>
  )
}

// ---------------- EMERGENCY ----------------
interface EmergencyProps { contact?: any }

export const Emergency: React.FC<EmergencyProps> = (props: any) => {
  const contact: any = props.contact || {}

  const SectionTitle = ({ text }: { text: string }) => (
    <SafeView
      style={{ backgroundColor: theme.gray200, paddingVertical: 4, paddingHorizontal: 6, marginTop: 8, marginBottom: 4 }}
    >
      <SafeText ctx="emergency.sectionTitle" style={{ fontSize: 11, fontWeight: 'bold', color: theme.text }} value={text} />
    </SafeView>
  )

  const SubTitle = ({ text }: { text: string }) => (
    <SafeText
      ctx="emergency.subtitle"
      style={{ fontSize: 10.5, fontWeight: 'bold', marginTop: 4, marginBottom: 2, color: theme.text }}
      value={text}
    />
  )

  const Paragraph = ({ text, keyVal }: { text: any; keyVal?: string | number }) => (
    <SafeText
      ctx={keyVal ? `paragraph[${keyVal}]` : 'paragraph'}
      style={{ fontSize: 10, color: theme.text, marginBottom: 4, textAlign: 'justify', lineHeight: 1.4 }}
      value={text}
    />
  )

  const Bullet = ({ text, keyVal }: { text: any; keyVal?: string | number }) => (
    <SafeText
      ctx={keyVal ? `bullet[${keyVal}]` : 'bullet'}
      style={{ fontSize: 10, color: theme.text, marginLeft: 10, marginBottom: 2, textAlign: 'justify' }}
      renderPrefix="※ "
      value={text}
    />
  )

  const EmergencyHighlight = ({ text }: { text: any }) => (
    <SafeText
      ctx="emergency-highlight"
      style={{ backgroundColor: theme.sand, color: theme.primaryDark, fontWeight: 'bold' }}
      value={text}
    />
  )

  return (
    <SafeView style={styles.sectionBlock}>
      <Text style={[styles.sectionHeader, { marginBottom: 6 }]}>
        Qui contacter pendant votre voyage en cas de nécessité ?
      </Text>

      <SafeView style={styles.contentWrap}>
        {/* 1. Avant le départ */}
        <SafeView wrap={false}>
          <SectionTitle text="1. Avant votre départ" />
          {Boolean(contact.before_departure?.text) && <Paragraph text={contact.before_departure.text} />}
        </SafeView>

        {/* 2. Le jour du départ */}
        <SafeView wrap={false}>
          <SectionTitle text="2. Le jour de votre départ" />
          {Boolean(contact.departure_day?.flights?.text) && (
            <SafeView>
              <SubTitle text="a. Les vols" />
              <Paragraph text={contact.departure_day.flights.text} />
            </SafeView>
          )}
          {Boolean(contact.departure_day?.agency?.text) && (
            <SafeView>
              <SubTitle text="b. Votre voyagiste" />
              <Paragraph text={contact.departure_day.agency.text} />
            </SafeView>
          )}
        </SafeView>

        {/* 3. Après le départ */}
        <SafeView wrap={false}>
          <SectionTitle text="3. Après votre départ" />
          {Boolean(contact.after_departure?.intro) && <Paragraph text={contact.after_departure.intro} />}

          {Boolean(contact.after_departure?.flights?.text) && (
            <SafeView>
              <SubTitle text="a. Les vols" />
              <Paragraph text={contact.after_departure.flights.text} />
            </SafeView>
          )}

          {Boolean(contact.after_departure?.local) && (
            <SafeView>
              <SubTitle text="b. Nos correspondants locaux :" />
              {Boolean(contact.after_departure.local.name) && (
                <Paragraph keyVal="local-name" text={contact.after_departure.local.name} />
              )}
              {Boolean(contact.after_departure.local.phone) && (
                <Paragraph keyVal="local-phone" text={contact.after_departure.local.phone} />
              )}
              {Array.isArray(contact.after_departure.local.items) &&
                contact.after_departure.local.items
                  .filter((it: any) => it && String(it).trim() !== '')
                  .map((it: any, li: number) => <Bullet key={`local-${li}`} keyVal={`local-${li}`} text={it} />)}
              {Boolean(contact.after_departure.local.note) && <Paragraph text={contact.after_departure.local.note} />}
            </SafeView>
          )}

          {Boolean(contact.after_departure?.agency?.text) && (
            <SafeView>
              <SubTitle text="c. Votre voyagiste" />
              <Paragraph text={contact.after_departure.agency.text} />
            </SafeView>
          )}
        </SafeView>

        {/* 4. Cas d’urgence */}
        <SafeView wrap={false}>
          <SectionTitle text="4. Pour les cas d’extrême urgence" />
          {Boolean(contact.emergency?.text1) && <Paragraph text={contact.emergency.text1} />}

          {Boolean(contact.emergency?.text2) && (
            <SafeView>
              <Paragraph text={contact.emergency.text2} />

              {Boolean(contact.emergency.phone) && (
                <Text style={{ fontSize: 10, color: theme.text, marginBottom: 4, textAlign: 'justify', lineHeight: 1.4 }}>
                  Numéro d'urgence :
                  <Text style={{ backgroundColor: theme.sand, color: theme.primaryDark, fontWeight: 'bold' }}>
                    {' '}{stringify(contact.emergency.phone, 'emergency-phone')}
                  </Text>
                </Text>
              )}
            </SafeView>
          )}
        </SafeView>
      </SafeView>
    </SafeView>
  )
}

// ---------------- NOTES ----------------
export const Notes: React.FC = () => (
  <SafeView style={styles.sectionBlock}>
    <Text style={styles.sectionHeader}>Mes souvenirs</Text>
    <SafeView style={styles.contentWrap}>
      <Text style={styles.paragraph}>
        Écrivez ici vos impressions, vos adresses favorites, vos rencontres…
      </Text>
      {Array.from({ length: 55 }).map((_, ni) => (
        <SafeView key={`note-${ni}`} style={styles.noteLine} />
      ))}
    </SafeView>
  </SafeView>
)

// ---------------- DOCUMENT ----------------
interface BookletDocumentProps { data: any }

export const BookletDocument: React.FC<BookletDocumentProps> = ({ data }: { data: any }) => {
  const cover = data.cover || {}
  const brand = {
    logoUrl: cover.logoUrl || data.brand?.logoUrl,
    agencyName: cover.agency || data.brand?.agencyName,
    reference: cover.reference || data.brand?.reference,
    travelers: cover.travelers || data.brand?.travelers,
  }

  console.log('🧩 [Diagnostics] Top-level props summary:', {
    coverKeys: Object.keys(data.cover || {}),
    itineraryLen: (data.itinerary || []).length,
    thank: Object.keys(data.thank_you || {}),
    generalInfo: Object.keys(data.general_info || {}),
    emergencyKeys: Object.keys(data.emergency_contacts || {}),
  })

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
