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
// Font.register({ family: 'Playfair Display', src: path.resolve(__dirname, './fonts/PlayfairDisplay-Regular.ttf') })
// Font.register({ family: 'Lato', src: path.resolve(__dirname, './fonts/Lato-Regular.ttf') })
// Font.register({ family: 'Lato', src: path.resolve(__dirname, './fonts/Lato-Bold.ttf'), fontWeight: 'bold' })

const DEFAULT_TEXT = 'Helvetica'
const TITLE_FONT = 'Helvetica' // 'Playfair Display' or 'Lato' if available
const BODY_FONT = 'Helvetica'

// --- Thème ------------------------------------------------------------------
const theme = {
  primary: '#822a62',
  primaryDark: '#611717',
  sand: '#fdf2f8', // Lighter pink/sand for backgrounds
  sandDark: '#c084ab',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray700: '#374151',
  text: '#2B2B2B',
  success: '#10B981', // Green for checkmarks
  error: '#EF4444',   // Red for crosses
}

// A5 Dimensions
const A5_HEIGHT_PT = 595
const STEP_SPACER_PT = 20

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
  if (v === undefined || v === null) return ' '
  if (typeof v === 'string') return v.trim() === '' ? ' ' : v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)

  if (Array.isArray(v)) {
    const result = v.map((x, i) => stringify(x, `${context}[${i}]`)).join(', ')
    return result.trim() === '' ? ' ' : result
  }

  if (typeof v === 'object') {
    if (React.isValidElement(v)) return ' '
    if ((v as any).name) return String((v as any).name)
    if ((v as any).title) return String((v as any).title)
    try {
      const json = JSON.stringify(v)
      return json.trim() === '' ? ' ' : json
    } catch {
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
const SafeView: React.FC<{ style?: any; wrap?: boolean; children?: React.ReactNode }> = ({ style, wrap, children }) => {
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
    fontSize: 9,
    color: theme.text,
    lineHeight: 1.3,
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 30,
    backgroundColor: 'white',
  },

  // --- Cover ---
  coverPage: {
    padding: 0,
    margin: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
    flexDirection: 'column',
  },
  coverTopSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 30,
    paddingTop: 40,
    height: '80%',
  },
  coverLeftCol: {
    width: '62%',
    paddingRight: 10,
  },
  coverRightCol: {
    width: '35%',
    alignItems: 'flex-end',
  },
  coverTitle: {
    fontFamily: TITLE_FONT || DEFAULT_TEXT,
    fontSize: 26,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 10,
    textTransform: 'none', // Modern look often mixes case nicely
  },
  coverSubtitle: {
    fontSize: 12,
    color: theme.gray700,
    marginBottom: 20,
    lineHeight: 1.4,
  },
  coverMainImage: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    objectFit: 'cover',
    marginBottom: 10,
  },
  
  // Price/Duration Box
  coverPriceBox: {
    width: '100%',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: theme.gray200,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPriceDuration: {
    fontSize: 12,
    color: theme.gray700,
    marginBottom: 4,
  },
  coverPriceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.primary,
  },

  // Highlights Box
  coverHighlightsBox: {
    width: '100%',
    backgroundColor: 'white',
    // borderLeftWidth: 3,
    // borderLeftColor: theme.primary,
    // paddingLeft: 10,
  },
  highlightsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 8,
  },
  highlightItem: {
    fontSize: 10,
    color: theme.gray700,
    marginBottom: 4,
    flexDirection: 'row',
  },

  // Cover Footer
  coverFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    height: '18%', // Bottom strip
    backgroundColor: theme.sand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  footerItem: {
    alignItems: 'center',
    width: '25%',
  },
  footerIcon: {
    fontSize: 18,
    marginBottom: 4,
    color: theme.primary,
  },
  footerLabel: {
    fontSize: 8,
    textTransform: 'uppercase',
    color: theme.gray700,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  footerValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.primaryDark,
    textAlign: 'center',
  },

  // --- Common Headers ---
  sectionBlock: { marginTop: 20 },
  sectionHeader: {
    color: theme.primary,
    fontFamily: TITLE_FONT || DEFAULT_TEXT,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: theme.sand,
    paddingBottom: 4,
  },
  contentWrap: { marginTop: 5 },

  // --- Itinerary ---
  stepCard: {
    marginBottom: 15,
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 0,
  },
  stepHeaderNew: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
    borderLeftWidth: 4,
    borderLeftColor: theme.primary,
    paddingLeft: 8,
  },
  stepHeaderTitleNew: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.primary,
    textTransform: 'uppercase',
  },
  stepHeaderDateNew: {
    fontSize: 10,
    color: theme.gray700,
  },
  segmentBox: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: theme.gray50,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: theme.gray200,
  },
  
  // --- Why Us ---
  whyUsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    marginTop: 10,
  },
  whyUsItem: {
    width: '46%', // 2 cols
    backgroundColor: theme.gray50,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: theme.gray200,
  },
  whyUsIcon: {
    fontSize: 20,
    marginBottom: 6,
    backgroundColor: theme.sand,
    borderRadius: 50,
    padding: 6,
    width: 32,
    height: 32,
    textAlign: 'center',
  },
  whyUsTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 4,
  },
  whyUsText: {
    fontSize: 9,
    color: theme.gray700,
    lineHeight: 1.3,
  },

  // --- Includes / Excludes ---
  incExcContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  incColumn: {
    width: '48%',
    backgroundColor: '#F0FDF4', // Light green bg
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  excColumn: {
    width: '48%',
    backgroundColor: '#FEF2F2', // Light red bg
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  incExcHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  incItem: {
    fontSize: 9,
    marginBottom: 4,
    color: theme.gray700,
    flexDirection: 'row',
  },

  // --- Footer ---
  pageNumber: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8,
    color: theme.gray300,
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
  // On prend la première image comme image principale
  const mainImage = Array.isArray(cover.images) && cover.images[0] ? cover.images[0] : null
  
  const days = start && end ? daysBetween(start, end) : ''
  const travelers = pick(cover.travelers, brand.travelers) || '2 pers.'
  
  const dateStr = (() => {
    const s = formatDateFull(start)
    const e = end ? formatDateFull(end) : ''
    return s && e ? `${s} au ${e}` : s
  })()

  // Mock highlights if not present (logic for display purpose, remove if strict)
  // For now we check if cover.highlights exists. If not, we don't render.
  const highlights = Array.isArray(cover.highlights) ? cover.highlights : []
  
  const price = cover.price || '' // Expecting "2600CHF" format

  return (
    <SafeView style={styles.coverPage}>
      {/* Top Section */}
      <SafeView style={styles.coverTopSection}>
        {/* Left: Title + Desc + Image */}
        <SafeView style={styles.coverLeftCol}>
          <Text style={styles.coverTitle}>{destination || 'Carnet de Voyage'}</Text>
          {Boolean(cover.description) && (
            <Text style={styles.coverSubtitle}>{cover.description}</Text>
          )}
          {Boolean(mainImage) && (
            <Image src={mainImage} style={styles.coverMainImage} />
          )}
        </SafeView>

        {/* Right: Price + Highlights */}
        <SafeView style={styles.coverRightCol}>
          {/* Price/Duration Box */}
          <SafeView style={styles.coverPriceBox}>
            <Text style={styles.coverPriceDuration}>{days ? `${days} nuits` : ''}</Text>
            {Boolean(price) && <Text style={styles.coverPriceValue}>{price}</Text>}
          </SafeView>

          {/* Highlights */}
          {highlights.length > 0 && (
            <SafeView style={styles.coverHighlightsBox}>
               <Text style={styles.highlightsTitle}>Les points forts de ce voyage</Text>
               {highlights.map((h: string, i: number) => (
                 <Text key={i} style={styles.highlightItem}>✓  {h}</Text>
               ))}
            </SafeView>
          )}
          {/* If no highlights, maybe show agency info or logo */}
          {(!highlights.length) && (
             <SafeView style={{ marginTop: 20, alignItems: 'flex-end' }}>
                <Image 
                   src={brand.logoUrl || 'https://www.ad-gentes.ch/build/assets/images/logo-adgentes.33ba4059.png'} 
                   style={{ width: 100, height: 50, objectFit: 'contain' }}
                />
             </SafeView>
          )}
        </SafeView>
      </SafeView>

      {/* Bottom Footer Section */}
      <SafeView style={styles.coverFooter}>
         <SafeView style={styles.footerItem}>
            <Text style={styles.footerIcon}>📍</Text>
            <Text style={styles.footerLabel}>DESTINATION</Text>
            <Text style={styles.footerValue}>{destination}</Text>
         </SafeView>
         <SafeView style={styles.footerItem}>
            <Text style={styles.footerIcon}>📅</Text>
            <Text style={styles.footerLabel}>DATES</Text>
            <Text style={styles.footerValue}>{dateStr}</Text>
         </SafeView>
         <SafeView style={styles.footerItem}>
            <Text style={styles.footerIcon}>⏱️</Text>
            <Text style={styles.footerLabel}>DURÉE</Text>
            <Text style={styles.footerValue}>{days ? `${days} nuits` : ''}</Text>
         </SafeView>
         <SafeView style={styles.footerItem}>
            <Text style={styles.footerIcon}>👥</Text>
            <Text style={styles.footerLabel}>VOYAGEURS</Text>
            <Text style={styles.footerValue}>{travelers}</Text>
         </SafeView>
      </SafeView>
    </SafeView>
  )
}

// ---------------- WHY CHOOSE US ----------------
export const WhyChooseUs: React.FC = () => {
  const reasons = [
    { icon: '👤', title: 'Accompagnement personnalisé', text: 'Un conseiller dédié vous accompagne de A à Z.' },
    { icon: '🎖️', title: 'Conseillers spécialistes', text: 'Notre équipe connaît personnellement les destinations.' },
    { icon: '⭐', title: 'Voyages testés et validés', text: 'Tous nos circuits sont testés par nos équipes.' },
    { icon: '🕒', title: 'Réactivité 24/7', text: 'Une assistance disponible avant, pendant et après.' },
    { icon: '🛡️', title: 'Garantie suisse', text: 'Sécurité financière et garantie de remboursement.' },
    { icon: '💎', title: 'Service premium', text: 'Des prestations haut de gamme sélectionnées avec soin.' },
  ]

  return (
    <SafeView style={styles.sectionBlock}>
       <View style={{ alignItems: 'center', marginBottom: 15 }}>
          <Text style={{ fontSize: 16, fontFamily: TITLE_FONT, color: theme.primary, fontWeight: 'bold' }}>
             Pourquoi choisir Ad Gentes ?
          </Text>
          <View style={{ width: 40, height: 2, backgroundColor: theme.primary, marginTop: 5 }} />
       </View>
       
       <SafeView style={styles.whyUsGrid}>
          {reasons.map((r, i) => (
             <SafeView key={i} style={styles.whyUsItem} wrap={false}>
                <Text style={styles.whyUsIcon}>{r.icon}</Text>
                <Text style={styles.whyUsTitle}>{r.title}</Text>
                <Text style={styles.whyUsText}>{r.text}</Text>
             </SafeView>
          ))}
       </SafeView>
    </SafeView>
  )
}

// ---------------- ITINERARY ----------------
interface ItineraryProps { itinerary?: any[]; brand?: any }

export const Itinerary: React.FC<ItineraryProps> = (props: any) => {
  const itinerary: any[] = props.itinerary || []
  
  return (
    <SafeView style={styles.sectionBlock}>
      <Text style={styles.sectionHeader}>Programme détaillé</Text>

      <SafeView style={styles.contentWrap}>
        {itinerary.map((step: any, i: number) => {
          const title = step.title || `Étape ${i + 1}`
          const dateRange = `${formatDate(step.start_date)}${
            step.end_date && step.end_date !== step.start_date ? ` – ${formatDate(step.end_date)}` : ''
          }`

          return (
            <SafeView key={step.id || i} style={styles.stepCard} wrap={false}>
              {/* Header Step */}
              <View style={styles.stepHeaderNew}>
                 <SafeText 
                   ctx={`itinerary[${i}].title`}
                   style={styles.stepHeaderTitleNew} 
                   value={title} 
                 />
                 <Text style={styles.stepHeaderDateNew}>{dateRange}</Text>
              </View>

              {/* Overview */}
              {Boolean(step.overview) && (
                <SafeText
                  ctx={`itinerary[${i}].overview`}
                  style={{ fontSize: 10, color: theme.gray700, marginBottom: 8, lineHeight: 1.4 }}
                  value={step.overview}
                />
              )}

              {/* Images */}
              {Array.isArray(step.images) && step.images.length > 0 && (
                 <SafeView style={{ flexDirection: 'row', gap: 6, marginBottom: 8, overflow: 'hidden' }}>
                    {step.images.slice(0, 2).map((img: string, idx: number) => (
                       <Image 
                         key={idx} 
                         src={img} 
                         style={{ 
                            width: step.images.length > 1 ? '48%' : '100%', 
                            height: 120, 
                            objectFit: 'cover',
                            borderRadius: 4 
                         }} 
                       />
                    ))}
                 </SafeView>
              )}

              {/* Segments */}
              {(step.segments || []).map((s: any, si: number) => {
                const roleLabel = labelFor(s.role)
                return (
                  <SafeView key={si} style={styles.segmentBox} wrap={false}>
                     <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <Text style={{ fontSize: 12, marginRight: 6 }}>{SEGMENT_ICON[s.role] || '🔹'}</Text>
                        <Text style={{ fontSize: 10, fontWeight: 'bold' }}>
                           {roleLabel} {s.title ? `— ${s.title}` : ''}
                        </Text>
                     </View>
                     {Boolean(s.description) && (
                        <SafeText style={{ fontSize: 9, color: theme.gray700, marginLeft: 20 }} value={s.description} />
                     )}
                     {(s.start_time || s.duration) && (
                        <Text style={{ fontSize: 8, color: theme.gray700, marginLeft: 20, marginTop: 2 }}>
                           {s.start_time ? `Départ : ${s.start_time}` : ''}
                           {s.start_time && s.duration ? ' • ' : ''}
                           {s.duration ? `Durée : ${s.duration}` : ''}
                        </Text>
                     )}
                  </SafeView>
                )
              })}

              {/* Tips */}
               {Array.isArray(step.tips) && step.tips.length > 0 && (
                <SafeView style={{ marginTop: 6, padding: 8, backgroundColor: '#FFFBEB', borderRadius: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#B45309', marginBottom: 2 }}>NOTE</Text>
                  {step.tips.map((t: string, ti: number) => (
                      <SafeText key={ti} style={{ fontSize: 9, color: '#92400E' }} renderPrefix="• " value={t} />
                  ))}
                </SafeView>
              )}
              
              <View style={{ height: 15 }} />
            </SafeView>
          )
        })}

        <Text style={{ marginTop: 20, textAlign: 'center', fontWeight: 'bold', fontSize: 10, color: theme.primary }}>
           FIN DE NOS SERVICES
        </Text>
      </SafeView>
    </SafeView>
  )
}

// ---------------- INCLUDE / EXCLUDE (New) ----------------
// Checks props.included / props.excluded arrays of strings
interface IncExcProps { included?: string[]; excluded?: string[] }

export const IncludesExcludes: React.FC<IncExcProps> = ({ included, excluded }) => {
   if ((!included || included.length === 0) && (!excluded || excluded.length === 0)) return null

   return (
      <SafeView style={styles.sectionBlock} wrap={false}>
         <Text style={styles.sectionHeader}>Le prix comprend</Text>
         <View style={styles.incExcContainer}>
            {/* Included */}
            <View style={styles.incColumn}>
               <View style={styles.incExcHeader}>
                  <Text style={{ color: theme.success, fontSize: 14, marginRight: 4 }}>✓</Text>
                  <Text style={{ color: '#166534', fontWeight: 'bold' }}>Ce qui est inclus</Text>
               </View>
               {included?.map((item, i) => (
                  <View key={i} style={styles.incItem}>
                     <Text style={{ color: theme.success, marginRight: 4 }}>✓</Text>
                     <SafeText value={item} style={{ flex: 1 }} />
                  </View>
               ))}
            </View>

            {/* Excluded */}
            <View style={styles.excColumn}>
               <View style={styles.incExcHeader}>
                  <Text style={{ color: theme.error, fontSize: 14, marginRight: 4 }}>✕</Text>
                  <Text style={{ color: '#991B1B', fontWeight: 'bold' }}>Ce qui n'est pas inclus</Text>
               </View>
               {excluded?.map((item, i) => (
                  <View key={i} style={styles.incItem}>
                     <Text style={{ color: theme.error, marginRight: 4 }}>✕</Text>
                     <SafeText value={item} style={{ flex: 1 }} />
                  </View>
               ))}
            </View>
         </View>
      </SafeView>
   )
}


// ---------------- GENERAL INFO ----------------
interface GeneralInfoProps { info?: any }

export const GeneralInfo: React.FC<GeneralInfoProps> = (props: any) => {
  const info: any = props.info || {}
  
  // Reusing logic but styling simpler
  const Paragraph = ({ label, text }: { label?: string, text: any }) => (
    <Text style={{ fontSize: 10, marginBottom: 4 }}>
       {label && <Text style={{ fontWeight: 'bold', color: theme.primary }}>{label} : </Text>}
       <SafeText value={text} />
    </Text>
  )

  return (
    <SafeView style={styles.sectionBlock}>
      <Text style={styles.sectionHeader}>Informations générales</Text>
      
      <SafeView style={[styles.contentWrap, { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }]}>
         {/* Simple Cards for info groups */}
         {[
            { title: 'Aperçu', data: [info.capital, info.population].filter(Boolean) },
            { title: 'Formalités', data: [info.entry?.passport, info.entry?.visa].filter(Boolean) },
            { title: 'Santé', data: [info.health?.vaccines].filter(Boolean) },
            { title: 'Décalage horaire', data: [info.timezone?.diff].filter(Boolean) },
         ].map((grp, i) => (
            grp.data.length > 0 && (
               <View key={i} style={{ width: '48%', marginBottom: 10, padding: 8, backgroundColor: theme.gray50, borderRadius: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: theme.primary, marginBottom: 4, textTransform: 'uppercase' }}>{grp.title}</Text>
                  {grp.data.map((d, k) => <SafeText key={k} value={d} style={{ fontSize: 9, marginBottom: 2, color: theme.gray700 }} />)}
               </View>
            )
         ))}
      </SafeView>
      
      {/* Detailed Text Sections */}
      {Boolean(info.climate?.current) && (
         <View style={{ marginTop: 10 }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 2 }}>CLIMAT</Text>
            <Paragraph text={info.climate.current} />
         </View>
      )}
    </SafeView>
  )
}

// ---------------- OTHER SECTIONS (Keep simplified for brevity, assume similar styling) ----------------
// (Keeping Emergency and Notes simplified but clean)
export const Emergency: React.FC<{ contact: any }> = ({ contact }) => (
   <SafeView style={styles.sectionBlock}>
      <Text style={styles.sectionHeader}>Contacts d'urgence</Text>
      {/* ... Content adapted ... */}
      <SafeText value={contact?.emergency?.text1 || "En cas d'urgence, contactez notre service 24/7."} style={{ fontSize: 10 }} />
      {contact?.emergency?.phone && (
         <View style={{ marginTop: 6, padding: 8, backgroundColor: '#FEF2F2', borderRadius: 4, alignSelf: 'flex-start' }}>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#B91C1C' }}>SOS : {contact.emergency.phone}</Text>
         </View>
      )}
   </SafeView>
)

export const Notes: React.FC = () => (
   <SafeView style={styles.sectionBlock}>
     <Text style={styles.sectionHeader}>Mes souvenirs</Text>
     <View style={{ marginTop: 10 }}>
       {Array.from({ length: 15 }).map((_, i) => (
          <View key={i} style={{ height: 1, backgroundColor: theme.gray200, marginBottom: 25 }} />
       ))}
     </View>
   </SafeView>
)

export const ThankYou: React.FC<{ thank: any }> = ({ thank }) => (
   <SafeView style={styles.sectionBlock}>
      <Text style={styles.sectionHeader}>Bon voyage !</Text>
      <SafeText value={thank?.closing || "Toute l'équipe vous souhaite un excellent séjour."} style={{ fontSize: 10, marginTop: 4 }} />
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

  return (
    <Document>
      {/* Cover */}
      <Page size="A5" style={styles.coverPage}>
        <Cover cover={cover} brand={brand} />
      </Page>

      {/* Itinerary */}
      <Page size="A5" style={styles.page}>
        <Itinerary itinerary={data.itinerary || []} brand={brand} />
        
        {/* Optional Includes/Excludes if data present */}
        <IncludesExcludes included={data.included} excluded={data.excluded} />
        
        <PageFooter />
      </Page>

      {/* Why Choose Us + General Info */}
      <Page size="A5" style={styles.page}>
         <WhyChooseUs />
         <View style={{ height: 30 }} />
         <GeneralInfo info={data.general_info || {}} />
         <PageFooter />
      </Page>

      {/* Emergency + Thank You + Notes */}
      <Page size="A5" style={styles.page}>
        <Emergency contact={data.emergency_contacts || {}} />
        <View style={{ height: 20 }} />
        <ThankYou thank={data.thank_you || {}} />
        <View style={{ height: 20 }} />
        <Notes />
        <PageFooter />
      </Page>
    </Document>
  )
}

export default BookletDocument
