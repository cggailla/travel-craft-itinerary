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

// --- Fonts ------------------------------------------------------------------
let DEFAULT_TEXT = 'Helvetica'
let TITLE_FONT = 'Helvetica'
let BODY_FONT = 'Helvetica'

// Load bundled fonts
const loadFont = async (fileName: string) => {
  try {
    const url = new URL(`./fonts/${fileName}`, import.meta.url)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Status ${res.status}`)
    return await res.arrayBuffer()
  } catch (e) {
    console.error(`Failed to load font ${fileName}:`, e)
    return null
  }
}

// Register fonts with top-level await
try {
  const [
    montserratRegular,
    montserratBold,
    latoRegular,
    latoBold,
    latoItalic
  ] = await Promise.all([
    loadFont('Montserrat-Regular.woff'),
    loadFont('Montserrat-Bold.woff'),
    loadFont('Lato-Regular.woff'),
    loadFont('Lato-Bold.woff'),
    loadFont('Lato-Italic.woff')
  ])

  if (montserratRegular && montserratBold && latoRegular && latoBold && latoItalic) {
    Font.register({
      family: 'Montserrat',
      fonts: [
        { src: montserratBold, fontWeight: 'bold' },
        { src: montserratRegular, fontWeight: 'normal' },
      ]
    })

    Font.register({
      family: 'Lato',
      fonts: [
        { src: latoRegular, fontWeight: 'normal' },
        { src: latoBold, fontWeight: 'bold' },
        { src: latoItalic, fontStyle: 'italic' },
      ]
    })

    DEFAULT_TEXT = 'Lato'
    TITLE_FONT = 'Montserrat'
    BODY_FONT = 'Lato'
  } else {
    console.warn('Some fonts failed to load, falling back to Helvetica')
  }
} catch (e) {
  console.error('Error registering fonts:', e)
}

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
const SafeView: React.FC<any> = ({ style, wrap, children, ...props }) => {
  const safeChildren = React.Children.toArray(children).filter(
    (ch: any) => !(typeof ch === 'string' || typeof ch === 'number')
  )
  // @ts-ignore wrap est accepté par react-pdf
  return <View style={style} wrap={wrap} {...props}>{safeChildren}</View>
}

// --- Styles -----------------------------------------------------------------
const styles = StyleSheet.create({
  page: {
    fontFamily: BODY_FONT || DEFAULT_TEXT,
    fontSize: 9,
    color: theme.text,
    lineHeight: 1.2,
    paddingTop: 25,
    paddingBottom: 25,
    paddingHorizontal: 25,
    backgroundColor: 'white',
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
  coverSubtitle: { fontSize: 14, marginTop: 4, opacity: 0.95 },
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
    backgroundColor: '#Fdf4f9',
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderRadius: 4,
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: theme.primary,
  },
  contentWrap: { marginTop: 10 },

  // Itinerary
  stepBox: {
    backgroundColor: theme.gray100,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDateGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  stepDate: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.text,
  },
  stepArrow: {
    fontSize: 10,
    marginHorizontal: 8,
    color: theme.gray700,
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: theme.text,
  },
  stepSeparator: {
    marginHorizontal: 10,
    color: theme.gray300,
  },
  narrativeText: {
    fontSize: 10,
    fontStyle: 'italic',
    color: theme.gray700,
    lineHeight: 1.5,
    borderLeftWidth: 2,
    borderLeftColor: theme.gray300,
    paddingLeft: 12,
    marginLeft: 2,
    marginBottom: 20,
    textAlign: 'justify',
  },

  segment: { padding: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: theme.gray200, borderRadius: 4 },
  segmentTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  segmentTitle: { fontSize: 11, fontWeight: 'bold' },
  segmentBadge: { fontSize: 10, backgroundColor: theme.sand, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4 },
  segmentMeta: { fontSize: 10, color: theme.gray700, marginTop: 2, textAlign: 'justify' },

  stepListTitle: { fontSize: 10, fontWeight: 'bold', marginTop: 4, color: theme.gray700 },
  stepListItem: { fontSize: 10, color: theme.gray700, marginLeft: 6, textAlign: 'justify' },

  endOfService: { marginTop: 30, textAlign: 'center', fontWeight: 'bold', fontSize: 12, color: theme.primary },

  // General info
  infoGrid: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoCard: { width: '48%', borderWidth: 1, borderColor: theme.gray300, backgroundColor: theme.gray100, borderRadius: 6, padding: 8 },
  infoTitle: { fontSize: 11, fontWeight: 'bold', marginBottom: 2 },
  infoText: { fontSize: 10, textAlign: 'justify' },

  // Thank you
  thankBlock: { gap: 6 },
  thankLine: { fontSize: 11, textAlign: 'justify' },
  thankClosing: { fontSize: 11, fontWeight: 'bold', marginTop: 8 },

  // Emergency
  card: { borderWidth: 1, borderColor: theme.gray300, borderRadius: 6, padding: 10, marginBottom: 10, backgroundColor: '#fff' },
  cardTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  paragraph: { fontSize: 10, marginBottom: 3, textAlign: 'justify' },

  // Notes
  noteLine: { height: 1, backgroundColor: theme.gray300, marginVertical: 8 },

  // Modern Cover
  modernHeader: {
    height: 40,
    backgroundColor: theme.primary,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modernTitle: { fontSize: 12, color: 'white', fontWeight: 'bold', textTransform: 'uppercase' },
  modernFooter: {
    height: 40,
    backgroundColor: theme.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernFooterDate: { fontSize: 9, color: theme.primary, fontWeight: 'bold', marginBottom: 2 },
  modernFooterDuration: { fontSize: 9, color: theme.primary },

  // Page number
  pageNumber: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 9,
    color: theme.gray700,
  },
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
  const images: string[] = Array.isArray(cover.images) ? cover.images : []
  const image1 = images[0]
  const image2 = images[1]
  const description = pick(cover.description, cover.overview) || 'Votre carnet de voyage'

  // Helper for duration
  const days = start && end ? daysBetween(start, end) : ''
  const nights = days ? Number(days) - 1 : 0
  const durationLabel = cover.duration || (nights > 0 ? `${nights} nuits` : (days ? `${days} jours` : ''))

  // Helper for dates
  const formatDateShort = (dStr: string) => {
    if (!dStr) return ''
    const d = new Date(dStr)
    if (isNaN(d.getTime())) return ''
    // Basic fallback formatting if locale fails: DD/MM
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }
  const startStr = formatDateShort(start)
  const endStr = formatDateShort(end)
  const dateRange = cover.dateRange || (startStr && endStr ? `${startStr} au ${endStr}` : (startStr || ''))

  const travelers = pick(cover.travelers, brand.travelers)

  return (
    <View style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: 'white' }}>
      {/* HEADER - Fixed Top */}
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 60,
        backgroundColor: theme.primary,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10
      }}>
        <Image
          src={brand.logoUrl || 'https://www.ad-gentes.ch/build/assets/images/logo-adgentes.33ba4059.png'}
          style={{ width: 80, height: 24, objectFit: 'contain' }}
        />
        <SafeText ctx="cover.destination" style={{ fontSize: 12, color: 'white', fontWeight: 'bold', textTransform: 'uppercase' }} value={destination} />
      </View>

      {/* MAIN IMAGE AREA - Absolute Middle */}
      <View style={{
        position: 'absolute',
        top: 60,
        bottom: 40,
        left: 0,
        right: 0,
        backgroundColor: 'white'
      }}>
        {image1 && image2 ? (
          <View style={{ width: '100%', height: '100%', flexDirection: 'column' }}>
            <View style={{ height: '50%', width: '100%' }}>
              <Image
                src={image1}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </View>
            <View style={{ height: '50%', width: '100%' }}>
              <Image
                src={image2}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </View>
          </View>
        ) : image1 ? (
          <Image
            src={image1}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.gray100 }}>
             <Text style={{ fontSize: 10, color: theme.gray300 }}>Aucune image de couverture</Text>
          </View>
        )}
      </View>

      {/* FOOTER - Fixed Bottom */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 40,
        backgroundColor: theme.gray100,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10
      }}>
        <SafeText ctx="cover.date" style={{ fontSize: 9, color: theme.primary, fontWeight: 'bold', marginBottom: 2 }} value={dateRange} />
        <SafeText ctx="cover.duration" style={{ fontSize: 9, color: theme.primary }} value={durationLabel} />
      </View>
    </View>
  )
}

// ---------------- ITINERARY ----------------
interface ItineraryProps { itinerary?: any[]; brand?: any }

export const Itinerary: React.FC<ItineraryProps> = (props: any) => {
  const itinerary: any[] = props.itinerary || []
  const A5_HEIGHT_PT = 595
  const STEP_SPACER_PT = Math.round(A5_HEIGHT_PT * 0.1)
  const MIN_IMAGE_HEIGHT_PT = Math.round(A5_HEIGHT_PT * 0.35)

  // Helper date DD/MM
  const formatDDMM = (dStr?: string) => {
    if (!dStr) return ''
    const d = new Date(dStr)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
  }

  return (
    <SafeView style={styles.sectionBlock}>
      <Text style={styles.sectionHeader}>Programme détaillé</Text>

      <SafeView style={styles.contentWrap}>
        {itinerary.map((step: any, i: number) => {
          const title = step.title || `Étape ${i + 1}`
          const startStr = formatDDMM(step.start_date)
          const endStr = step.end_date && step.end_date !== step.start_date ? formatDDMM(step.end_date) : ''

          // --- Étape principale
          const infosBlock = (
            <SafeView key={step.id || i} style={{ marginBottom: 22 }}>
              
              {/* Keep Header and Overview together to avoid orphans */}
              <SafeView wrap={false}>
                {/* HEADER MODERNE: Date -> Date : Titre */}
                <SafeView style={styles.stepBox}>
                  <Text style={styles.stepDate}>{startStr}</Text>
                  {endStr ? (
                    <>
                      <Text style={styles.stepArrow}>-</Text>
                      <Text style={styles.stepDate}>{endStr}</Text>
                    </>
                  ) : null}
                  <Text style={{ marginHorizontal: 10, color: theme.gray300 }}>:</Text>
                  <SafeText
                    ctx={`itinerary[${i}].title`}
                    style={[styles.stepTitle, { color: theme.primary }]} // Keeps purple per instruction
                    value={stringify(title, `itinerary[${i}].title`)}
                  />
                </SafeView>

                {/* DESCRIPTION NARRATIVE */}
                {Boolean(step.overview) && (
                  <SafeText
                    ctx={`itinerary[${i}].overview`}
                    style={styles.narrativeText}
                    value={step.overview}
                  />
                )}
              </SafeView>

              {/* Segments */}
              {(step.segments || []).map((s: any, si: number) => {
                const roleLabel = labelFor(s.role)

                // 1. Description (Normal text)
                const description = s.description

                // 2. Practical Infos (Bullet points, Italic, Smaller)
                const infosRaw: string[] = []
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
                      marginBottom: 12,
                      flexDirection: 'row',
                    }}
                  >
                    {/* Colonne gauche : Type de segment */}
                    <View style={{ width: 60, paddingRight: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: 'bold', color: theme.primary }}>
                        {roleLabel}
                      </Text>
                    </View>

                    {/* Colonne droite : Contenu */}
                    <View style={{ flex: 1 }}>
                      {/* Titre (Gras) */}
                      <SafeText
                        ctx={`segment[${si}].title`}
                        style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 2, color: theme.text }}
                        value={stringify(s.title, `segment[${si}].title`)}
                      />

                      {/* Description (Normal) */}
                      {description && (
                         <SafeText
                          ctx={`segment[${si}].description`}
                          style={{ fontSize: 10, color: theme.text, marginBottom: 4, lineHeight: 1.3, textAlign: 'justify' }}
                          value={description}
                        />
                      )}

                      {/* Infos Pratiques (Italique, Petit, Bullet points) */}
                      {infos.map((line, li) => (
                        <SafeText
                          key={`seg-${s.id || si}-info-${li}`}
                          ctx={`segment[${si}].info[${li}]`}
                          style={{ fontSize: 9, color: theme.gray700, lineHeight: 1.3, fontStyle: 'italic', marginBottom: 1 }}
                          renderPrefix="• "
                          value={line}
                        />
                      ))}
                    </View>
                  </SafeView>
                )
              })}

              {/* Notes */}
              {Array.isArray(step.tips) && step.tips.filter(t => t && String(t).trim() !== '').length > 0 && (
                <SafeView wrap={false} style={{ marginTop: 10, marginBottom: 8, paddingLeft: 10, borderLeftWidth: 3, borderLeftColor: '#FCD34D', borderLeftStyle: 'solid' }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 4, color: '#B45309' }}>NOTE</Text>
                  {step.tips
                    .filter((t: any) => t && String(t).trim() !== '')
                    .map((t: string, ti: number) => (
                      <SafeText
                        key={`step-${step.id || i}-tip-${ti}`}
                        ctx={`itinerary[${i}].tip[${ti}]`}
                        style={{ fontSize: 10, color: theme.text, marginBottom: 4, lineHeight: 1.4, textAlign: 'justify' }}
                        value={t}
                      />
                    ))}
                </SafeView>
              )}

              {/* Info locale */}
              {Boolean(step.local_context) && (
                <SafeView wrap={false} style={{ marginTop: 10, marginBottom: 8, paddingLeft: 10, borderLeftWidth: 3, borderLeftColor: '#34d399', borderLeftStyle: 'solid' }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 4, color: '#047857' }}>🌍 Info locale</Text>
                  <SafeText
                    ctx={`itinerary[${i}].local_context`}
                    style={{ fontSize: 10, color: theme.text, lineHeight: 1.4, textAlign: 'justify' }}
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
    <SafeText ctx="general.title" style={{ fontSize: 12, fontWeight: 'bold', color: theme.primary, marginTop: 7, marginBottom: 2 }} value={text} />
  )

  const Row = ({ label, value, keyVal }: { label?: string; value: any; keyVal?: string }) => {
     if (!value) return null
     return (
       <Text style={{ fontSize: 10, marginBottom: 1, lineHeight: 1.3, color: theme.text, textAlign: 'justify' }}>
         {label ? <Text style={{ fontWeight: 'bold', color: 'black' }}>{label} : </Text> : null}
         <Text>{stringify(value, keyVal || 'row')}</Text>
       </Text>
     )
  }

  const Bullet = ({ text, keyVal }: { text: any; keyVal?: string | number }) => (
    <SafeText
      ctx={keyVal ? `bullet[${keyVal}]` : 'bullet'}
      style={{ fontSize: 10, color: theme.text, marginLeft: 8, marginBottom: 1, textAlign: 'justify', lineHeight: 1.3 }}
      renderPrefix="• "
      value={text}
    />
  )

  const blocks: JSX.Element[] = []

  // APERÇU
  if (info.capital || info.population || info.surface_area) {
    blocks.push(
      <SafeView key="base" wrap={false}>
        <Title text="Aperçu" />
        <Row label="Capitale" value={info.capital} />
        <Row label="Population" value={info.population} />
        <Row label="Superficie" value={info.surface_area} />
      </SafeView>
    )
  }

  // FUSEAU
  if (info.timezone) {
    blocks.push(
      <SafeView key="tz" wrap={false}>
        <Title text="Fuseau horaire" />
        <Row label="Fuseau principal" value={info.timezone.main} />
        <Row value={info.timezone.offset} />
      </SafeView>
    )
  }

  // ENTRÉE
  if (info.entry) {
    blocks.push(
      <SafeView key="entry" wrap={false}>
        <Title text="Formalités d'entrée" />
        <Row label="Passeport" value={info.entry.passport} />
        <Row label="Visa" value={info.entry.visa} />
        <Row label="Validité du séjour" value={info.entry.validity} />
      </SafeView>
    )
  }

  // SANTÉ
  if (info.health) {
    blocks.push(
      <SafeView key="health" wrap={false}>
        <Title text="Santé" />
        <Row label="Vaccins" value={info.health.vaccines} />
        <Row label="Assurance" value={info.health.insurance} />
        <Row label="Eau potable" value={info.health.water} />
      </SafeView>
    )
  }

  // CLIMAT
  if (info.climate) {
    blocks.push(
      <SafeView key="climate" wrap={false}>
        <Title text="Climat" />
        <Row label="Actuellement" value={info.climate.current} />
        <Row label="Été" value={info.climate.summer} />
        <Row label="Hiver" value={info.climate.winter} />
        <Row label="Automne" value={info.climate.autumn} />
        <Row label="Printemps" value={info.climate.spring} />
      </SafeView>
    )
  }

  // VÊTEMENTS
  if (info.clothing) {
    blocks.push(
      <SafeView key="clothing" wrap={false}>
        <Title text="Vêtements recommandés" />
        <Row label="Saison conseillée" value={info.clothing.season} />
        <Row label="Températures moyennes" value={info.clothing.temperature} />
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
        <Title text="Spécialités culinaires" />
        {info.food.specialties
          .filter((s: any) => s && (s.region || s.specialty))
          .map((s: any, fi: number) => (
            <Row key={`food-${fi}`} label={s.region} value={s.specialty} />
          ))}
      </SafeView>
    )
  }

  // ARGENT
  if (info.currency || info.budget) {
    blocks.push(
      <SafeView key="money" wrap={false}>
        <Title text="Argent et budget" />
        <Row label="Monnaie" value={info.currency?.name} />
        {Array.isArray(info.currency?.exchange) &&
          info.currency.exchange
            .filter((ex: any) => ex && String(ex).trim() !== '')
            .map((ex: any, ei: number) => <Bullet key={`ex-${ei}`} keyVal={`ex-${ei}`} text={ex} />)}
        <Row label="Café" value={info.budget?.coffee} />
        <Row label="Repas" value={info.budget?.meal} />
        <Row label="Restaurant" value={info.budget?.restaurant} />
      </SafeView>
    )
  }

  // POURBOIRES
  if (info.tipping) {
    blocks.push(
      <SafeView key="tips" wrap={false}>
        <Title text="Pourboires" />
        <Row label="Usage" value={info.tipping.required} />
        <Row label="Restaurants" value={info.tipping.restaurants} />
        <Row label="Taxis" value={info.tipping.taxis} />
        <Row label="Guides" value={info.tipping.guides} />
        <Row label="Portiers" value={info.tipping.porters} />
      </SafeView>
    )
  }

  // ÉLECTRICITÉ
  if (info.electricity) {
    blocks.push(
      <SafeView key="elec" wrap={false}>
        <Title text="Électricité" />
        <Row label="Tension" value={info.electricity.voltage} />
        <Row label="Prises" value={info.electricity.plugs} />
        <Row label="Adaptateur" value={info.electricity.adapter} />
      </SafeView>
    )
  }

  // LANGUES
  if (info.languages) {
    blocks.push(
      <SafeView key="lang" wrap={false}>
        <Title text="Langues" />
        <Row label="Officielles" value={info.languages.official} />
        <Row label="Français parlé" value={info.languages.french} />
        <Row value={info.languages.notes} />
      </SafeView>
    )
  }

  // RELIGION
  if (info.religion) {
    blocks.push(
      <SafeView key="religion" wrap={false}>
        <Title text="Religion" />
        <Row value={info.religion} />
      </SafeView>
    )
  }

  // SÉCURITÉ
  if (info.safety) {
    blocks.push(
      <SafeView key="safety" wrap={false}>
        <Title text="Sécurité" />
        <Row value={info.safety} />
      </SafeView>
    )
  }

  // CULTURE
  if (Array.isArray(info.cultural_sites) && info.cultural_sites.length) {
    blocks.push(
      <SafeView key="culture" wrap={false}>
        <Title text="Sites culturels" />
        {info.cultural_sites
          .filter((c: any) => c && (c.name || c.description))
          .map((c: any, ci: number) => (
            <Row key={`culture-${ci}`} value={`• ${c.name} — ${c.description}`} />
          ))}
      </SafeView>
    )
  }

  // NATURE
  if (info.natural_attractions) {
    blocks.push(
      <SafeView key="nature" wrap={false}>
        <Title text="Attractions naturelles" />
        <Row value={info.natural_attractions} />
      </SafeView>
    )
  }

  // SHOPPING
  if (info.shopping) {
    blocks.push(
      <SafeView key="shop" wrap={false}>
        <Title text="Achats & artisanat" />
        <Row value={info.shopping} />
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

  // Default texts matching the frontend
  const defaults = {
    before_departure: {
      text: "Avant votre départ, votre voyagiste reste le contact à privilégier en cas de changement à réaliser ou d'annulations à effectuer."
    },
    departure_day: {
      flights: {
        text: "En cas de retard ou de problèmes concernant les vols, la compagnie aérienne est le contact à privilégier pour tout renseignement. C'est cette dernière qui vous proposera la meilleure solution possible afin de vous acheminer dans les meilleurs délais."
      }
    },
    after_departure: {
      intro: "Afin de pouvoir répondre au mieux et le plus rapidement à vos besoins, veuillez contacter dans l'ordre suivant :",
      flights: {
        text: "En cas de retard ou de problèmes concernant les vols, la compagnie aérienne est le contact à privilégier pour tout renseignement. C'est cette dernière qui vous proposera la meilleure solution possible afin de vous acheminer dans les meilleurs délais."
      },
      local: {
        items: [
          "Pour signaler un retard important à votre arrivée",
          "Pour toute demande de modification de programme/circuit (sous réserve)",
          "Pour des renseignements complémentaires au sujet des prestations",
          "Pour tout manquement ou mécontentement relatif au programme",
          "Pour un problème d'hébergement, après avoir vérifié auprès de la réception de votre hôtel si une solution peut être trouvée sur place."
        ],
        note: "Si le cas n'a pas pu être résolu après prise de contact avec notre correspondant local, alors contactez :"
      }
    },
    emergency: {
      text1: "*Sont considérées comme extrême urgence (maladie, accident, décès...), veuillez contacter votre assurance voyage.",
      text2: "Si notre correspondant local ou votre assurance ne peut résoudre votre problème, vous pouvez nous contacter sur notre numéro d'urgence au 0041 76 296 25 40."
    }
  }

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
      style={{ fontSize: 10.5, fontWeight: 'bold', marginTop: 4, marginBottom: 2, color: theme.text, marginLeft: 10 }}
      value={text}
    />
  )

  const Paragraph = ({ text, keyVal }: { text: any; keyVal?: string | number }) => (
    <SafeText
      ctx={keyVal ? `paragraph[${keyVal}]` : 'paragraph'}
      style={{ fontSize: 10, color: theme.text, marginBottom: 4, textAlign: 'justify', lineHeight: 1.4, marginLeft: 15 }}
      value={text}
    />
  )

  const Bullet = ({ text, keyVal }: { text: any; keyVal?: string | number }) => (
    <SafeText
      ctx={keyVal ? `bullet[${keyVal}]` : 'bullet'}
      style={{ fontSize: 10, color: theme.text, marginLeft: 25, marginBottom: 2, textAlign: 'justify' }}
      renderPrefix="• "
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
      <Text style={styles.sectionHeader}>Contacts d'urgence</Text>

      <SafeView style={styles.contentWrap}>
        {/* 1. Avant le départ */}
        <SafeView wrap={false}>
          <SectionTitle text="1. Avant votre départ" />
          <Paragraph text={contact.before_departure?.text || defaults.before_departure.text} />
        </SafeView>

        {/* 2. Le jour du départ */}
        <SafeView wrap={false}>
          <SectionTitle text="2. Le jour de votre départ" />
          <SafeView>
            <SubTitle text="a. Les vols" />
            <Paragraph text={contact.departure_day?.flights?.text || defaults.departure_day.flights.text} />
          </SafeView>
          
          <SafeView>
            <SubTitle text="b. Votre voyagiste" />
            {Boolean(contact.departure_day?.agency?.text) && <Paragraph text={contact.departure_day.agency.text} />}
          </SafeView>
        </SafeView>

        {/* 3. Après le départ */}
        <SafeView wrap={false}>
          <SectionTitle text="3. Après votre départ" />
          <Paragraph text={contact.after_departure?.intro || defaults.after_departure.intro} />

          <SafeView>
            <SubTitle text="a. Les vols" />
            <Paragraph text={contact.after_departure?.flights?.text || defaults.after_departure.flights.text} />
          </SafeView>

          <SafeView>
            <SubTitle text="b. Nos correspondants locaux :" />
            {Boolean(contact.after_departure?.local?.name) && (
              <Paragraph keyVal="local-name" text={contact.after_departure.local.name} />
            )}
            {Boolean(contact.after_departure?.local?.phone) && (
              <Paragraph keyVal="local-phone" text={contact.after_departure.local.phone} />
            )}
            
            {/* Default items if none provided */}
            {(contact.after_departure?.local?.items || defaults.after_departure.local.items)
              .filter((it: any) => it && String(it).trim() !== '')
              .map((it: any, li: number) => <Bullet key={`local-${li}`} keyVal={`local-${li}`} text={it} />)}
              
            <Paragraph text={contact.after_departure?.local?.note || defaults.after_departure.local.note} />
          </SafeView>

          <SafeView>
            <SubTitle text="c. Votre voyagiste" />
            {Boolean(contact.after_departure?.agency?.text) && <Paragraph text={contact.after_departure.agency.text} />}
          </SafeView>
        </SafeView>

        {/* 4. Cas d’urgence */}
        <SafeView wrap={false}>
          <SectionTitle text="4. Pour les cas d’extrême urgence" />
          <Paragraph text={contact.emergency?.text1 || defaults.emergency.text1} />

          <SafeView>
            <Paragraph text={contact.emergency?.text2 || defaults.emergency.text2} />

            {Boolean(contact.emergency?.phone) && (
              <Text style={{ fontSize: 10, color: theme.text, marginBottom: 4, textAlign: 'justify', lineHeight: 1.4 }}>
                Numéro d'urgence :
                <Text style={{ backgroundColor: theme.sand, color: theme.primaryDark, fontWeight: 'bold' }}>
                  {' '}{stringify(contact.emergency.phone, 'emergency-phone')}
                </Text>
              </Text>
            )}
          </SafeView>
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
      {Array.from({ length: 25 }).map((_, ni) => (
        <SafeView key={`note-${ni}`} style={styles.noteLine} />
      ))}
    </SafeView>
  </SafeView>
)

export const NotesEmpty: React.FC = () => (
  <SafeView style={styles.sectionBlock}>
    <SafeView style={styles.contentWrap}>
      {Array.from({ length: 32 }).map((_, ni) => (
        <SafeView key={`note-empty-${ni}`} style={styles.noteLine} />
      ))}
    </SafeView>
  </SafeView>
)

export const NotesDocument: React.FC = () => (
  <Document>
    <Page size="A5" style={styles.page}>
      <Notes />
    </Page>
    <Page size="A5" style={styles.page}>
      <NotesEmpty />
    </Page>
  </Document>
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
      </Page>

      {/* Thank You */}
      <Page size="A5" style={styles.page}>
        <ThankYou thank={data.thank_you || {}} brand={brand} />
      </Page>

      {/* General Info */}
      <Page size="A5" style={styles.page}>
        <GeneralInfo info={data.general_info || {}} />
      </Page>

      {/* Emergency */}
      <Page size="A5" style={styles.page}>
        <Emergency contact={data.emergency_contacts || {}} />
      </Page>
    </Document>
  )
}

export default BookletDocument