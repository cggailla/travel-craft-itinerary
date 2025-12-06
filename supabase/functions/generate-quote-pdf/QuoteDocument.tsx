import React from "npm:react@18.2.0";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
  Svg,
  Path,
  Circle,
  Polyline,
  Line,
  Rect,
  G,
} from "npm:@react-pdf/renderer@3.4.3";
import { QuoteData } from "./extract.ts";

// Palette de couleurs basée sur le site (Bleu Ad Gentes)
const COLORS = {
  primary: "#7F296D", // Ad Gentes Purple (approx HSL 316 51% 33%)
  secondary: "#1e40af",
  text: "#1a1a1a",
  textLight: "#6b7280",
  background: "#FFFFFF",
  backgroundAlt: "#FDFBF7",
  border: "#e5e7eb",
};

// --- ICONS ---
const IconCheck = ({ size = 12, color = COLORS.primary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="20 6 9 17 4 12" fill="none" />
  </Svg>
);

const IconMapPin = ({ size = 16, color = COLORS.primary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill="none" />
    <Circle cx="12" cy="10" r="3" fill="none" />
  </Svg>
);

const IconCalendar = ({ size = 16, color = COLORS.primary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill="none" />
    <Line x1="16" y1="2" x2="16" y2="6" />
    <Line x1="8" y1="2" x2="8" y2="6" />
    <Line x1="3" y1="10" x2="21" y2="10" />
  </Svg>
);

const IconClock = ({ size = 16, color = COLORS.primary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" fill="none" />
    <Polyline points="12 6 12 12 16 14" fill="none" />
  </Svg>
);

const IconUsers = ({ size = 16, color = COLORS.primary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" fill="none" />
    <Circle cx="9" cy="7" r="4" fill="none" />
    <Path d="M23 21v-2a4 4 0 0 0-3-3.87" fill="none" />
    <Path d="M16 3.13a4 4 0 0 1 0 7.75" fill="none" />
  </Svg>
);

const IconCross = ({ size = 12, color = "#ea580c" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="18" y1="6" x2="6" y2="18" />
    <Line x1="6" y1="6" x2="18" y2="18" />
  </Svg>
);

const IconPassport = ({ size = 16, color = COLORS.primary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4 4v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.342a2 2 0 0 0-.602-1.43l-4.44-4.342A2 2 0 0 0 13.56 2H6a2 2 0 0 0-2 2z" fill="none" />
    <Path d="M9 13h6" fill="none" />
    <Path d="M9 17h3" fill="none" />
    <Path d="M14 2v6h6" fill="none" />
  </Svg>
);

const IconPlane = ({ size = 16, color = COLORS.primary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M2 12h20" fill="none" />
    <Path d="M13 2l9 10-9 10" fill="none" />
  </Svg>
);

const IconSyringe = ({ size = 16, color = COLORS.primary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M18 6L6 18" fill="none" />
    <Path d="M21 3l-3 3" fill="none" />
    <Path d="M3 21l3-3" fill="none" />
    <Path d="M9 15l-4.5 4.5" fill="none" />
    <Path d="M15 9l4.5-4.5" fill="none" />
    <Line x1="19" y1="5" x2="14" y2="10" />
    <Line x1="10" y1="14" x2="5" y2="19" />
  </Svg>
);

const IconShield = ({ size = 16, color = COLORS.primary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" />
  </Svg>
);

const IconDrop = ({ size = 16, color = COLORS.primary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 2.69l5.74 5.74a8 8 0 1 1-11.31 0z" fill="none" />
  </Svg>
);

const IconInfo = ({ size = 16, color = COLORS.primary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" fill="none" />
    <Line x1="12" y1="16" x2="12" y2="12" />
    <Line x1="12" y1="8" x2="12.01" y2="8" />
  </Svg>
);

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: COLORS.background,
    fontFamily: "Helvetica",
    padding: 40,
  },
  // Included/Excluded Section
  incExcContainer: {
    flexDirection: "row",
    gap: 20,
    marginTop: 20,
  },
  incExcCard: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  incCard: {
    borderColor: "#bbf7d0", // green-200
    backgroundColor: "#ffffff",
  },
  excCard: {
    borderColor: "#fed7aa", // orange-200
    backgroundColor: "#ffffff",
  },
  incHeader: {
    backgroundColor: "#f0fdf4", // green-50
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  excHeader: {
    backgroundColor: "#fff7ed", // orange-50
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  incTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#16a34a", // green-600
  },
  excTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ea580c", // orange-600
  },
  cardBody: {
    padding: 15,
    gap: 12,
  },
  incItem: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  incItemText: {
    fontSize: 10,
    color: "#374151", // gray-700
    flex: 1,
    lineHeight: 1.4,
  },
  pageBackgroundAlt: {
    backgroundColor: COLORS.backgroundAlt,
  },
  // Typography
  h1: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 10,
  },
  h2: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingBottom: 5,
  },
  h3: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 8,
  },
  text: {
    fontSize: 11,
    color: COLORS.text,
    lineHeight: 1.5,
  },
  textSmall: {
    fontSize: 9,
    color: COLORS.textLight,
  },
  // Layout Utils
  row: {
    flexDirection: "row",
    width: "100%",
  },
  col: {
    flexDirection: "column",
  },
  flex1: {
    flex: 1,
  },
  gap10: {
    gap: 10,
  },
  gap20: {
    gap: 20,
  },
  mt20: {
    marginTop: 20,
  },
  mb20: {
    marginBottom: 20,
  },
  // Specific Components
  coverContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  coverLeft: {
    width: "55%",
    paddingRight: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  coverRight: {
    width: "45%",
    height: "100%",
    justifyContent: "center",
    paddingLeft: 10,
  },
  coverImage: {
    width: "100%",
    height: 450,
    objectFit: "cover",
    borderRadius: 24,
  },
  coverLogoText: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#a8a29e", // Gris/Mauve clair pour "ad"
    marginBottom: 40,
  },
  coverLogoTextSuffix: {
    color: COLORS.primary, // Mauve pour "gentes"
  },
  coverTitle: {
    fontSize: 38,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 20,
    lineHeight: 1.2,
  },
  coverParticipants: {
    fontSize: 14,
    fontWeight: "medium",
    color: COLORS.text,
    marginBottom: 15,
  },
  coverDates: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  
  // Pricing
  pricingPage: {
    flexDirection: "column",
    justifyContent: "space-between",
    padding: 40,
    paddingBottom: 0, // Bottom bar goes to edge
  },
  pricingContent: {
    flexDirection: "row",
    flex: 1,
    gap: 40,
  },
  pricingLeft: {
    width: "60%",
    flexDirection: "column",
  },
  pricingRight: {
    width: "40%",
    flexDirection: "column",
    gap: 20,
  },
  pricingTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 15,
  },
  pricingDescription: {
    fontSize: 11,
    color: COLORS.textLight,
    lineHeight: 1.5,
    marginBottom: 20,
  },
  pricingImage: {
    width: "100%",
    height: 300,
    objectFit: "cover",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f3f4f6", // dashed border effect simulation
  },
  pricingBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    // Shadow simulation via border/bg
  },
  pricingPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pricingPriceText: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  pricingDurationText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: "medium",
  },
  pricingHighlightsTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 15,
  },
  pricingHighlightItem: {
    flexDirection: "row",
    marginBottom: 10,
    alignItems: "flex-start",
  },
  pricingCheckIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#fdf2f8", // light pink
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  pricingCheckText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "bold",
  },
  
  // Bottom Bar
  bottomBar: {
    flexDirection: "row",
    backgroundColor: "#f3e8f0", // Light purple background
    marginHorizontal: -40, // Stretch to edges
    paddingVertical: 20,
    paddingHorizontal: 40,
    marginTop: 20,
    justifyContent: "space-between",
  },
  bottomBarItem: {
    flexDirection: "column",
    alignItems: "center",
    width: "25%",
    borderRightWidth: 1,
    borderRightColor: "rgba(0,0,0,0.05)",
  },
  bottomBarItemLast: {
    borderRightWidth: 0,
  },
  bottomBarIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  bottomBarLabel: {
    fontSize: 9,
    textTransform: "uppercase",
    color: COLORS.textLight,
    marginBottom: 4,
    letterSpacing: 1,
  },
  bottomBarValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.text,
  },

  // Lists (Included/Excluded)
  listContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 6,
    alignItems: "flex-start",
  },
  bullet: {
    width: 15,
    fontSize: 14,
    color: COLORS.primary,
  },
  bulletRed: {
    width: 15,
    fontSize: 14,
    color: "#ef4444",
  },

  // Cards (Why Us, Reviews)
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
  },
  card: {
    width: "31%", // ~3 columns
    backgroundColor: "#f9fafb",
    padding: 15,
    borderRadius: 6,
    marginBottom: 15,
  },
  
  // Itinerary
  stepContainer: {
    flexDirection: "row",
    height: "100%",
  },
  stepContent: {
    flex: 1,
    paddingRight: 20,
  },
  stepImageContainer: {
    width: "40%",
    height: "100%",
  },
  stepImage: {
    width: "100%",
    height: 300,
    objectFit: "cover",
    borderRadius: 8,
  },
  
  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pageNumber: {
    fontSize: 9,
    color: COLORS.textLight,
  },
});

const Footer = ({ text, pageIndex }: { text?: string, pageIndex?: number }) => (
  <View style={styles.footer}>
    <Text style={styles.textSmall}>{text || "Ad Gentes - Voyage sur mesure"}</Text>
    {pageIndex !== undefined && (
      <Text style={styles.pageNumber}>{pageIndex}</Text>
    )}
  </View>
);

const QuoteDocument = ({ data }: { data: QuoteData }) => (
  <Document>
    {/* 1. COVER PAGE */}
    <Page size="A4" orientation="landscape" style={[styles.page, styles.pageBackgroundAlt]}>
      <View style={styles.coverContainer}>
        {/* Left: Image */}
        <View style={styles.coverLeft}>
          {data.cover?.image && (
            <Image src={data.cover.image} style={styles.coverImage} />
          )}
        </View>
        
        {/* Right: Content */}
        <View style={styles.coverRight}>
          {/* Logo */}
          {data.cover?.logo ? (
             <Image src={data.cover.logo} style={{ height: 60, width: 200, objectFit: "contain", marginBottom: 40 }} />
          ) : (
            <View style={{ flexDirection: "row", marginBottom: 40 }}>
              <Text style={styles.coverLogoText}>ad</Text>
              <Text style={[styles.coverLogoText, styles.coverLogoTextSuffix]}>gentes</Text>
            </View>
          )}

          <Text style={styles.coverTitle}>{data.cover?.title || "Votre Voyage"}</Text>
          <Text style={styles.coverParticipants}>{data.cover?.participants}</Text>
          <Text style={styles.coverDates}>
            {data.cover?.startDate && data.cover?.endDate 
              ? `du ${new Date(data.cover.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} au ${new Date(data.cover.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
              : data.cover?.dates}
          </Text>
        </View>
      </View>
    </Page>

    {/* 2. PRICING */}
    {data.pricing && (
      <Page size="A4" orientation="landscape" style={[styles.page, { paddingBottom: 0 }]}>
        <View style={styles.pricingContent}>
          {/* Left Column */}
          <View style={styles.pricingLeft}>
            <Text style={styles.pricingTitle}>{data.pricing.title || "Votre Devis"}</Text>
            <Text style={styles.pricingDescription}>{data.pricing.description}</Text>
            
            <View style={{ flex: 1, justifyContent: "center" }}>
              {data.pricing.image && (
                <Image src={data.pricing.image} style={styles.pricingImage} />
              )}
            </View>
          </View>

          {/* Right Column */}
          <View style={styles.pricingRight}>
            {/* Price Box */}
            <View style={styles.pricingBox}>
              <View style={styles.pricingPriceRow}>
                <Text style={styles.pricingDurationText}>{data.pricing.duration || "7 nuits"}</Text>
                <Text style={styles.pricingPriceText}>{data.pricing.price || ""}</Text>
              </View>
            </View>

            {/* Highlights Box */}
            <View style={[styles.pricingBox, { flex: 1 }]}>
              <Text style={styles.pricingHighlightsTitle}>Les points forts de ce voyage</Text>
              {data.pricing.highlights && data.pricing.highlights.map((h, i) => (
                <View key={i} style={styles.pricingHighlightItem}>
                  <View style={styles.pricingCheckIcon}>
                    <IconCheck size={10} color={COLORS.primary} />
                  </View>
                  <Text style={[styles.text, { flex: 1 }]}>{h}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Bottom Bar */}
        <View style={styles.bottomBar}>
          {/* Destination */}
          <View style={styles.bottomBarItem}>
            <View style={styles.bottomBarIcon}>
              <IconMapPin size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.bottomBarLabel}>DESTINATION</Text>
            <Text style={styles.bottomBarValue}>{data.pricing.destination || data.metadata?.destination || "Non spécifié"}</Text>
          </View>

          {/* Dates */}
          <View style={styles.bottomBarItem}>
            <View style={styles.bottomBarIcon}>
              <IconCalendar size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.bottomBarLabel}>DATES</Text>
            <Text style={styles.bottomBarValue}>{data.pricing.dates || "Dates à définir"}</Text>
          </View>

          {/* Duration */}
          <View style={styles.bottomBarItem}>
            <View style={styles.bottomBarIcon}>
              <IconClock size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.bottomBarLabel}>DURÉE</Text>
            <Text style={styles.bottomBarValue}>{data.pricing.duration || "7 nuits"}</Text>
          </View>

          {/* Travelers */}
          <View style={[styles.bottomBarItem, styles.bottomBarItemLast]}>
            <View style={styles.bottomBarIcon}>
              <IconUsers size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.bottomBarLabel}>VOYAGEURS</Text>
            <Text style={styles.bottomBarValue}>{data.pricing.travelers || data.metadata?.participants || "2 pers."}</Text>
          </View>
        </View>
      </Page>
    )}

    {/* 3. INCLUDED / EXCLUDED */}
    {(data.included || data.excluded) && (
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={{ marginBottom: 30 }}>
          <Text style={{ fontSize: 28, fontWeight: "bold", color: COLORS.primary }}>Le prix comprend</Text>
          <View style={{ width: 60, height: 4, backgroundColor: "#e9d5ff", marginTop: 8 }} />
        </View>
        
        <View style={styles.incExcContainer}>
          {/* Included */}
          <View style={[styles.incExcCard, styles.incCard]}>
            <View style={styles.incHeader}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center" }}>
                <IconCheck size={14} color="#16a34a" />
              </View>
              <Text style={styles.incTitle}>Ce qui est inclus</Text>
            </View>
            <View style={styles.cardBody}>
              {data.included?.items.map((item, i) => (
                <View key={i} style={styles.incItem}>
                  <IconCheck size={12} color="#16a34a" />
                  <Text style={styles.incItemText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
          
          {/* Excluded */}
          <View style={[styles.incExcCard, styles.excCard]}>
            <View style={styles.excHeader}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#ffedd5", alignItems: "center", justifyContent: "center" }}>
                <IconCross size={14} color="#ea580c" />
              </View>
              <Text style={styles.excTitle}>Ce qui n'est pas inclus</Text>
            </View>
            <View style={styles.cardBody}>
              {data.excluded?.items.map((item, i) => (
                <View key={i} style={styles.incItem}>
                  <IconCross size={12} color="#ea580c" />
                  <Text style={styles.incItemText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Page>
    )}

    {/* 4. HEALTH & FORMALITIES */}
    {data.healthFormalities && (
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={{ marginBottom: 30 }}>
          <Text style={{ fontSize: 28, fontWeight: "bold", color: COLORS.primary }}>Santé & Formalités</Text>
          <View style={{ width: 60, height: 4, backgroundColor: "#e9d5ff", marginTop: 8 }} />
        </View>

        <View style={{ flexDirection: "row", gap: 20, marginBottom: 20 }}>
          {/* Formalities Card */}
          <View style={{ flex: 1, backgroundColor: "#fdf4ff", borderRadius: 12, padding: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: "rgba(127, 41, 109, 0.1)" }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" }}>
                <IconPassport size={18} color="#ffffff" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "bold", color: COLORS.primary }}>Formalités d'entrée</Text>
            </View>
            
            <View style={{ gap: 15 }}>
              {(data.healthFormalities.formalities || data.healthFormalities.items || []).map((item, i) => {
                let Icon = IconInfo;
                const l = item.label.toLowerCase();
                if (l.includes('passeport')) Icon = IconPassport;
                else if (l.includes('visa')) Icon = IconPlane;
                else if (l.includes('validité') || l.includes('validite')) Icon = IconCalendar;

                return (
                  <View key={i} style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={14} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: COLORS.primary, marginBottom: 2, textTransform: "uppercase" }}>{item.label}</Text>
                      <Text style={{ fontSize: 10, color: "#4b5563", lineHeight: 1.4 }}>{item.content}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Health Card */}
          <View style={{ flex: 1, backgroundColor: "#fdf4ff", borderRadius: 12, padding: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: "rgba(127, 41, 109, 0.1)" }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" }}>
                <IconSyringe size={18} color="#ffffff" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "bold", color: COLORS.primary }}>Santé</Text>
            </View>
            
            <View style={{ gap: 15 }}>
              {(data.healthFormalities.health || []).map((item, i) => {
                let Icon = IconInfo;
                const l = item.label.toLowerCase();
                if (l.includes('vaccin')) Icon = IconSyringe;
                else if (l.includes('conseil') || l.includes('assurance')) Icon = IconShield;
                else if (l.includes('eau')) Icon = IconDrop;

                return (
                  <View key={i} style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={14} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: COLORS.primary, marginBottom: 2, textTransform: "uppercase" }}>{item.label}</Text>
                      <Text style={{ fontSize: 10, color: "#4b5563", lineHeight: 1.4 }}>{item.content}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Cancellation Policy */}
        {data.healthFormalities.cancellation && (
          <View style={{ backgroundColor: "#f8fafc", borderRadius: 12, padding: 20, borderLeftWidth: 4, borderLeftColor: "#94a3b8" }}>
            <View style={{ flexDirection: "row", gap: 15 }}>
              <View style={{ marginTop: 2 }}>
                <IconInfo size={24} color="#64748b" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: "#1e293b", marginBottom: 6 }}>Conditions d'annulation</Text>
                <Text style={{ fontSize: 10, color: "#64748b", lineHeight: 1.5 }}>{data.healthFormalities.cancellation}</Text>
              </View>
            </View>
          </View>
        )}
      </Page>
    )}

    {/* 5. SUMMARY */}
    {data.summary && (
      <Page size="A4" orientation="landscape" style={[styles.page, styles.pageBackgroundAlt]}>
        <Text style={styles.h2}>Résumé de votre itinéraire</Text>
        <View style={[styles.row, styles.mt20]}>
          <View style={[styles.flex1, { paddingRight: 30 }]}>
            {data.summary.steps.map((step, i) => (
              <View key={i} style={{ flexDirection: "row", marginBottom: 12, borderBottomWidth: 1, borderBottomColor: "#e5e7eb", paddingBottom: 8 }}>
                <Text style={{ width: 80, fontWeight: "bold", color: COLORS.primary, fontSize: 11 }}>
                  {step.date}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "bold", fontSize: 11, marginBottom: 2 }}>{step.title}</Text>
                  <Text style={{ fontSize: 10, color: COLORS.textLight }}>{step.location}</Text>
                </View>
              </View>
            ))}
          </View>
          <View style={{ width: "40%" }}>
            {data.summary.image && (
              <Image src={data.summary.image} style={{ width: "100%", height: 350, borderRadius: 8, objectFit: "cover" }} />
            )}
          </View>
        </View>
      </Page>
    )}

    {/* 6. ITINERARY DETAILS - One page per step */}
    {data.itinerary?.steps.map((step, i) => (
      <Page key={`step-${i}`} size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.h2}>{step.title}</Text>
        <View style={styles.stepContainer}>
          <View style={styles.stepContent}>
            <Text style={[styles.text, { marginBottom: 20, fontSize: 12 }]}>{step.description}</Text>
            
            {step.accommodation && (
              <View style={{ marginTop: "auto", backgroundColor: "#f0f9ff", padding: 15, borderRadius: 6 }}>
                <Text style={[styles.h3, { color: COLORS.primary, fontSize: 12 }]}>Hébergement</Text>
                <Text style={[styles.text, { fontWeight: "bold" }]}>{step.accommodation.name}</Text>
                {step.accommodation.description && (
                  <Text style={styles.textSmall}>{step.accommodation.description}</Text>
                )}
              </View>
            )}
          </View>
          
          {step.image && (
            <View style={styles.stepImageContainer}>
              <Image src={step.image} style={styles.stepImage} />
            </View>
          )}
        </View>
      </Page>
    ))}

    {/* 7. ACCOMMODATIONS */}
    {data.accommodations && data.accommodations.items.length > 0 && (
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.h2}>Vos Hébergements</Text>
        <View style={styles.cardGrid}>
          {data.accommodations.items.map((acc, i) => (
            <View key={i} style={styles.card}>
              <Text style={styles.h3}>{acc.name}</Text>
              <Text style={styles.text}>{acc.description}</Text>
            </View>
          ))}
        </View>
      </Page>
    )}

    {/* 8. WHY US */}
    {data.whyUs && (
      <Page size="A4" orientation="landscape" style={[styles.page, { backgroundColor: "#f0f9ff" }]}>
        <Text style={styles.h2}>{data.whyUs.mainTitle || "Pourquoi nous choisir ?"}</Text>
        <View style={styles.cardGrid}>
          {data.whyUs.items.map((item, i) => (
            <View key={i} style={[styles.card, { backgroundColor: "white" }]}>
              <Text style={[styles.h3, { color: COLORS.primary }]}>{item.title}</Text>
              <Text style={styles.text}>{item.description}</Text>
            </View>
          ))}
        </View>
      </Page>
    )}

    {/* 9. REVIEWS */}
    {data.reviews && (
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.h2}>{data.reviews.title || "Témoignages"}</Text>
        <View style={styles.cardGrid}>
          {data.reviews.items.map((review, i) => (
            <View key={i} style={styles.card}>
              <Text style={[styles.text, { fontStyle: "italic", marginBottom: 10 }]}>"{review.text}"</Text>
              <Text style={{ fontWeight: "bold", fontSize: 10, textAlign: "right" }}>- {review.author}</Text>
            </View>
          ))}
        </View>
      </Page>
    )}

    {/* 10. FAQ */}
    {data.faq && (
      <Page size="A4" orientation="landscape" style={[styles.page, styles.pageBackgroundAlt]}>
        <Text style={styles.h2}>{data.faq.title || "Questions Fréquentes"}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 20 }}>
          {data.faq.items.map((item, i) => (
            <View key={i} style={{ width: "48%", marginBottom: 15 }}>
              <Text style={[styles.h3, { fontSize: 12 }]}>{item.question}</Text>
              <Text style={styles.text}>{item.answer}</Text>
            </View>
          ))}
        </View>
      </Page>
    )}

    {/* 11. LEGAL & CONTACT */}
    {data.legal && (
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={[styles.h2, { borderBottomWidth: 0 }]}>Contactez-nous</Text>
          
          <View style={{ alignItems: "center", marginBottom: 40 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 5 }}>{data.legal.contact?.name}</Text>
            <Text style={{ fontSize: 14, color: COLORS.primary, marginBottom: 5 }}>{data.legal.contact?.email}</Text>
            <Text style={{ fontSize: 14 }}>{data.legal.contact?.phone}</Text>
          </View>

          <View style={{ padding: 20, backgroundColor: "#f3f4f6", borderRadius: 8, width: "80%" }}>
            <Text style={[styles.textSmall, { textAlign: "center" }]}>
              {data.legal.mentions}
            </Text>
          </View>
        </View>
      </Page>
    )}
  </Document>
);

export default QuoteDocument;
