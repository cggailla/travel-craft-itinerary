import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

/* ----------------------------- TYPES DE DONNÉES ----------------------------- */
type Segment = {
  type: "flight" | "transfer" | "hotel" | "train" | "activity" | "transport" | "other";
  title: string;
  info: string[]; // lignes indentées (• …)
};

type Step = {
  dateLabel: string; // ex: "Lundi 12 mai 2025"
  title: string;
  overview?: string; // texte enrichi d’aperçu
  segments: Segment[]; // chaque segment est insécable
  tips?: string[]; // conseils (bloc jaune)
  localInfo?: string; // info locale (bloc vert)
  photos?: string[]; // 0..n URLs / dataURI
};

type BookletData = {
  logoUrl: string; // URL/dataURI du logo
  tripTitle: string;
  startDateLabel: string; // "10/04/2025"
  endDateLabel: string; // "20/04/2025"
  totalDays: number;
  coverPhotos: string[]; // au moins 0..2 (on affiche max 2)
  steps: Step[];
  thankYouText: string; // texte brut
  generalInfoText: string; // texte brut (peut contenir des listes en lignes)
  emergencyContactsText: string; // texte brut hiérarchisé (contacts)
  emergencyNotesText: string; // “notes d’urgence”
};

/* --------------------------------- STYLES ---------------------------------- */
const COLORS = {
  primary: "#822a62", // AdGentes
  greyBg: "#F4F5F6",
  text: "#222222",
  mid: "#555555",
  light: "#8a8a8a",
  tip: "#FFF7D6",
  local: "#E7F6EA",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 11,
    color: COLORS.text,
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 40,
    lineHeight: 1.4,
  },

  /* ----- Couverture ----- */
  banner: {
    width: "100%",
    backgroundColor: COLORS.primary,
    color: "white",
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bannerLogo: { height: 20, width: 100, objectFit: "contain" },
  bannerTitle: { fontSize: 14, fontWeight: 700, textAlign: "right" },

  coverTitle: { fontSize: 22, fontWeight: 700, marginTop: 16, textAlign: "center" },
  coverImgWrap: { marginTop: 16 },
  coverImg: { width: "100%", height: 180, objectFit: "cover" },
  dateStrip: {
    marginTop: 14,
    backgroundColor: COLORS.greyBg,
    paddingVertical: 8,
    textAlign: "center",
  },
  dateText: { fontSize: 12, color: COLORS.mid },

  /* ----- Titres sections ----- */
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: COLORS.primary,
    borderBottom: `1pt solid ${COLORS.primary}`,
    paddingBottom: 4,
    marginBottom: 12,
  },

  /* ----- Étapes & segments ----- */
  stepHeader: {
    backgroundColor: COLORS.greyBg,
    borderRadius: 4,
    padding: 8,
    marginTop: 12,
  },
  stepHeaderText: { fontSize: 12, fontWeight: 700, color: "#333" },
  overview: { marginTop: 8, textAlign: "justify" },

  segmentCard: {
    borderLeft: `2pt solid ${COLORS.primary}`,
    paddingLeft: 10,
    marginTop: 8,
  },
  segRow: { flexDirection: "row" },
  segType: { width: 90, fontSize: 11, fontWeight: 700, color: COLORS.primary },
  segTitleWrap: { flex: 1 },
  segTitle: { fontSize: 11, fontWeight: 500 },
  segInfo: { fontSize: 10, color: "#444", marginLeft: 6, marginTop: 2 },

  tipBlock: {
    backgroundColor: COLORS.tip,
    borderRadius: 4,
    padding: 8,
    marginTop: 8,
  },
  localBlock: {
    backgroundColor: COLORS.local,
    borderRadius: 4,
    padding: 8,
    marginTop: 8,
  },

  stepPhoto: { width: "100%", height: 150, objectFit: "cover", marginTop: 8 },

  endOfServices: {
    marginTop: 18,
    textAlign: "center",
    fontSize: 12,
    fontWeight: 700,
  },

  /* ----- Texte brut sections suivantes ----- */
  paragraph: { marginTop: 6, textAlign: "justify" },

  /* ----- Notes perso page ----- */
  ruledLine: { height: 18, borderBottom: "1pt solid #D7DADF" },
});

/* ---------------------------- HELPERS / FORMATAGE --------------------------- */
const formatType = (t: Segment["type"]) => {
  switch (t) {
    case "flight":
      return "Vol";
    case "transfer":
      return "Transfert";
    case "hotel":
      return "Hébergement";
    case "train":
      return "Train";
    case "activity":
      return "Activité";
    case "transport":
      return "Transport";
    default:
      return "Prestation";
  }
};

/* ------------------------------ COMPOSANT PDF ------------------------------- */
export const StaticBookletTemplate: React.FC<{ data: BookletData }> = ({ data }) => {
  const durationLabel = data.totalDays > 1 ? `${data.totalDays} jours` : `${data.totalDays} jour`;

  return (
    <Document>
      {/* =============================== COUVERTURE =============================== */}
      <Page size="A4" style={styles.page}>
        <View style={styles.banner} wrap={false}>
          <Image src={data.logoUrl} style={styles.bannerLogo} />
          <Text style={styles.bannerTitle}>Carnet de voyage</Text>
        </View>

        <Text style={styles.coverTitle}>{data.tripTitle}</Text>

        <View style={styles.coverImgWrap} wrap={false}>
          {data.coverPhotos.slice(0, 2).map((src, i) => (
            <Image key={i} src={src} style={styles.coverImg} />
          ))}
        </View>

        <View style={styles.dateStrip} wrap={false}>
          <Text style={styles.dateText}>
            {data.startDateLabel} – {data.endDateLabel}
          </Text>
          <Text style={styles.dateText}>Durée : {durationLabel}</Text>
        </View>
      </Page>

      {/* =========================== PROGRAMME DÉTAILLÉ =========================== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Programme détaillé</Text>

        {data.steps.map((step, sIdx) => (
          <View key={sIdx}>
            {/* Bandeau gris (insécable avec la 1re ligne qui suit) */}
            <View style={styles.stepHeader} wrap={false}>
              <Text style={styles.stepHeaderText}>
                {step.dateLabel} : {step.title}
              </Text>
            </View>

            {step.overview && <Text style={styles.overview}>{step.overview}</Text>}

            {/* Segments (chaque segment est insécable) */}
            {step.segments.map((seg, i) => (
              <View key={i} style={styles.segmentCard} wrap={false}>
                <View style={styles.segRow}>
                  <Text style={styles.segType}>{formatType(seg.type)}</Text>
                  <View style={styles.segTitleWrap}>
                    <Text style={styles.segTitle}>{seg.title}</Text>
                    {seg.info.map((line, j) => (
                      <Text key={j} style={styles.segInfo}>
                        • {line}
                      </Text>
                    ))}
                  </View>
                </View>
              </View>
            ))}

            {/* Conseils */}
            {step.tips && step.tips.length > 0 && (
              <View style={styles.tipBlock} wrap={false}>
                {step.tips.map((t, i) => (
                  <Text key={i}>• {t}</Text>
                ))}
              </View>
            )}

            {/* Info locale */}
            {step.localInfo && (
              <View style={styles.localBlock} wrap={false}>
                <Text>{step.localInfo}</Text>
              </View>
            )}

            {/* Photos d’étape (chaque photo est insécable) */}
            {step.photos?.map((src, i) => (
              <View key={i} wrap={false}>
                <Image src={src} style={styles.stepPhoto} />
              </View>
            ))}
          </View>
        ))}

        <Text style={styles.endOfServices}>FIN DE NOS SERVICES</Text>
      </Page>

      {/* ============================== REMERCIEMENTS ============================= */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle} break>
          Remerciements
        </Text>
        <Text style={styles.paragraph}>{data.thankYouText}</Text>
      </Page>

      {/* ========================= INFORMATIONS COMPLÉMENTAIRES =================== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle} break>
          Informations complémentaires
        </Text>
        <Text style={styles.paragraph}>{data.generalInfoText}</Text>
      </Page>

      {/* ============================== CONTACTS D’URGENCE ======================== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle} break>
          Contacts d’urgence
        </Text>
        <Text style={styles.paragraph}>{data.emergencyContactsText}</Text>
      </Page>

      {/* =============================== NOTES D’URGENCE ========================== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle} break>
          Notes d’urgence
        </Text>
        <Text style={styles.paragraph}>{data.emergencyNotesText}</Text>
        {/* page lignée simple */}
        <View style={{ marginTop: 16 }}>
          {Array.from({ length: 20 }).map((_, i) => (
            <View key={i} style={styles.ruledLine} />
          ))}
        </View>
      </Page>
    </Document>
  );
};
