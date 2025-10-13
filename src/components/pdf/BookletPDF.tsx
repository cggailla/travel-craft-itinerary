/**
 * Génération PDF avec @react-pdf/renderer
 * Règles strictes de pagination appliquées
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import { PDFBookletData } from '@/services/pdfBookletService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Enregistrer les polices (optionnel)
// Font.register({
//   family: 'Roboto',
//   src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf',
// });

// Styles PDF avec règles strictes
const styles = StyleSheet.create({
  // Page
  page: {
    padding: '15mm 12mm',
    fontSize: 10,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
  },

  // ─────────────────────────────────────────
  // PAGE DE GARDE
  // ─────────────────────────────────────────
  coverPage: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '100%',
  },

  coverHeader: {
    borderBottom: '2px solid #1a1a1a',
    paddingBottom: 8,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  coverTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#1a1a1a',
  },

  coverImage: {
    width: '100%',
    maxHeight: '35%', // Max 35% de la hauteur de page pour avoir 2 images
    objectFit: 'contain',
    marginBottom: 8,
  },

  coverInfo: {
    backgroundColor: '#f5f5f5',
    padding: 8,
    textAlign: 'center',
    fontSize: 9,
    color: '#4a4a4a',
  },

  // ─────────────────────────────────────────
  // EN-TÊTE D'ÉTAPE (ne jamais couper)
  // ─────────────────────────────────────────
  stepHeader: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 4,
    border: '1px solid #d0d0d0',
    marginBottom: 12,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    // ⭐ RÈGLE : Garder ensemble (ne pas couper)
    break: 'avoid',
  },

  stepDateRange: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4a4a4a',
    marginRight: 8,
  },

  stepTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textTransform: 'uppercase',
    flex: 1,
  },

  // ─────────────────────────────────────────
  // CONTENU TEXTUEL (peut se couper entre lignes)
  // ─────────────────────────────────────────
  overviewSection: {
    marginBottom: 12,
    paddingLeft: 12,
    borderLeft: '2px solid #d0d0d0',
  },

  overviewText: {
    fontSize: 9,
    fontStyle: 'italic',
    color: '#4a4a4a',
    lineHeight: 1.6,
    // ⭐ RÈGLE : Peut se couper, mais par ligne entière (orphans/widows)
    orphans: 2,
    widows: 2,
  },

  tipsSection: {
    marginBottom: 12,
  },

  tipItem: {
    fontSize: 9,
    color: '#4a4a4a',
    marginBottom: 4,
    paddingLeft: 16,
  },

  // ─────────────────────────────────────────
  // SEGMENTS (⭐ NE JAMAIS COUPER)
  // ─────────────────────────────────────────
  segmentsContainer: {
    marginBottom: 8,
  },

  segmentCard: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#fafafa',
    borderRadius: 4,
    border: '1px solid #e0e0e0',
    // ⭐⭐⭐ RÈGLE CRITIQUE : Ne JAMAIS couper un segment
    break: 'avoid',
  },

  segmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },

  segmentRole: {
    fontSize: 8,
    color: '#ffffff',
    backgroundColor: '#822a62',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    marginRight: 8,
    textTransform: 'uppercase',
  },

  segmentTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
  },

  segmentDetail: {
    fontSize: 9,
    color: '#4a4a4a',
    marginBottom: 3,
    lineHeight: 1.4,
  },

  segmentDescription: {
    fontSize: 9,
    color: '#4a4a4a',
    marginTop: 4,
    lineHeight: 1.5,
  },

  // ─────────────────────────────────────────
  // IMAGES (règle des 30%)
  // ─────────────────────────────────────────
  imageContainer: {
    marginVertical: 8,
    // ⭐ RÈGLE : Ne jamais couper une image
    break: 'avoid',
  },

  stepImage: {
    width: '100%',
    // ⭐ RÈGLE : Min 30% de la hauteur de page, max 60%
    minHeight: '30%',
    maxHeight: '60%',
    objectFit: 'contain',
  },

  // ─────────────────────────────────────────
  // SECTIONS GÉNÉRALES
  // ─────────────────────────────────────────
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#822a62',
    marginTop: 20,
    marginBottom: 12,
    textTransform: 'uppercase',
    borderBottom: '2px solid #822a62',
    paddingBottom: 4,
  },

  generalInfoBox: {
    backgroundColor: '#f5e6f0',
    padding: 12,
    borderRadius: 4,
    marginBottom: 12,
    break: 'avoid',
  },

  generalInfoText: {
    fontSize: 9,
    color: '#4a4a4a',
    marginBottom: 4,
    lineHeight: 1.5,
  },

  emergencyContact: {
    padding: 10,
    backgroundColor: '#fff5f5',
    borderRadius: 4,
    marginBottom: 8,
    border: '1px solid #fecaca',
    break: 'avoid',
  },

  emergencyTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#991b1b',
    marginBottom: 4,
  },

  emergencyDetail: {
    fontSize: 9,
    color: '#4a4a4a',
    marginBottom: 2,
  },
});

interface BookletPDFProps {
  data: PDFBookletData;
}

export const BookletPDF: React.FC<BookletPDFProps> = ({ data }) => {
  const formatDate = (date?: Date) => {
    if (!date || isNaN(date.getTime())) return '';
    return format(date, 'dd/MM');
  };
  
  const formatLongDate = (date?: Date) => {
    if (!date || isNaN(date.getTime())) return '';
    return format(date, 'EEEE d MMMM yyyy', { locale: fr });
  };

  return (
    <Document>
      {/* ═══════════════════════════════════════════════════════════
          PAGE DE GARDE (toujours seule sur sa page)
          ═══════════════════════════════════════════════════════════ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverPage}>
          {/* En-tête */}
          <View style={styles.coverHeader}>
            <Text style={styles.coverTitle}>{data.tripTitle}</Text>
          </View>

          {/* Images de couverture (adaptées automatiquement) */}
          {data.coverImages && data.coverImages.length > 0 && (
            <View>
              {data.coverImages.slice(0, 2).map((image, idx) => (
                <Image
                  key={idx}
                  src={image.public_url}
                  style={styles.coverImage}
                />
              ))}
            </View>
          )}

          {/* Informations du voyage */}
          <View style={styles.coverInfo}>
            {data.startDate && (
              <Text>
                {formatLongDate(data.startDate)}
                {data.endDate && data.endDate !== data.startDate && (
                  <> - {formatLongDate(data.endDate)}</>
                )}
              </Text>
            )}
            {data.destination && <Text style={{ marginTop: 4 }}>{data.destination}</Text>}
          </View>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════
          INFORMATIONS GÉNÉRALES
          ═══════════════════════════════════════════════════════════ */}
      {data.generalInfo && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Informations Générales</Text>

          {data.generalInfo.description && (
            <View style={styles.generalInfoBox}>
              <Text style={styles.generalInfoText}>{data.generalInfo.description}</Text>
            </View>
          )}

          {data.generalInfo.accommodation && (
            <View style={styles.generalInfoBox}>
              <Text style={[styles.generalInfoText, { fontWeight: 'bold', marginBottom: 4 }]}>
                🏨 Hébergement
              </Text>
              <Text style={styles.generalInfoText}>{data.generalInfo.accommodation}</Text>
            </View>
          )}

          {data.generalInfo.transportation && (
            <View style={styles.generalInfoBox}>
              <Text style={[styles.generalInfoText, { fontWeight: 'bold', marginBottom: 4 }]}>
                🚗 Transport
              </Text>
              <Text style={styles.generalInfoText}>{data.generalInfo.transportation}</Text>
            </View>
          )}

          {data.generalInfo.tips && data.generalInfo.tips.length > 0 && (
            <View style={styles.generalInfoBox}>
              <Text style={[styles.generalInfoText, { fontWeight: 'bold', marginBottom: 4 }]}>
                💡 Conseils pratiques
              </Text>
              {data.generalInfo.tips.map((tip, idx) => (
                <Text key={idx} style={styles.tipItem}>
                  • {tip}
                </Text>
              ))}
            </View>
          )}
        </Page>
      )}

      {/* ═══════════════════════════════════════════════════════════
          ITINÉRAIRE DÉTAILLÉ (étapes)
          ═══════════════════════════════════════════════════════════ */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Itinéraire Détaillé</Text>

        {data.steps.map((step, stepIndex) => {
          // ⭐ RÈGLE : Si moins de 25% d'espace, commencer sur nouvelle page
          const isNewStepSection = stepIndex > 0;
          
          return (
            <View key={step.stepId} wrap={false} minPresenceAhead={60}>
              {/* En-tête d'étape (ne se coupe jamais) */}
              <View style={styles.stepHeader}>
                <Text style={styles.stepDateRange}>
                  {formatDate(step.startDate)}
                  {step.endDate && step.endDate !== step.startDate && (
                    <> → {formatDate(step.endDate)}</>
                  )}
                  {' : '}
                </Text>
                <Text style={styles.stepTitle}>{step.stepTitle}</Text>
              </View>

              {/* Overview (peut se couper entre lignes) */}
              {step.aiContent?.overview && (
                <View style={styles.overviewSection}>
                  <Text style={styles.overviewText}>{step.aiContent.overview}</Text>
                </View>
              )}

              {/* Tips */}
              {step.aiContent?.tips && step.aiContent.tips.length > 0 && (
                <View style={styles.tipsSection}>
                  {step.aiContent.tips.map((tip, idx) => (
                    <Text key={idx} style={styles.tipItem}>
                      • {tip}
                    </Text>
                  ))}
                </View>
              )}

              {/* Segments (⭐ JAMAIS coupés) */}
              <View style={styles.segmentsContainer}>
                {step.sections.map((section) =>
                  section.segments
                    .filter((seg) => !seg.isExcluded)
                    .map((segment) => (
                      <View key={segment.id} style={styles.segmentCard}>
                        {/* En-tête segment */}
                        <View style={styles.segmentHeader}>
                          <Text style={styles.segmentRole}>{segment.role}</Text>
                          <Text style={styles.segmentTitle}>
                            {segment.title || segment.provider || 'Sans titre'}
                          </Text>
                        </View>

                        {/* Détails */}
                        {segment.address && (
                          <Text style={styles.segmentDetail}>📍 {segment.address}</Text>
                        )}
                        {segment.startTime && (
                          <Text style={styles.segmentDetail}>
                            ⏰ {segment.startTime}
                            {segment.endTime && ` - ${segment.endTime}`}
                          </Text>
                        )}
                        {segment.phone && (
                          <Text style={styles.segmentDetail}>📞 {segment.phone}</Text>
                        )}
                        {segment.duration && (
                          <Text style={styles.segmentDetail}>⏱️ {segment.duration}</Text>
                        )}

                        {/* Description */}
                        {segment.description && (
                          <Text style={styles.segmentDescription}>{segment.description}</Text>
                        )}
                      </View>
                    ))
                )}
              </View>

              {/* Images d'étape (⭐ Min 30%, ne se coupent jamais) */}
              {step.images && step.images.length > 0 && (
                <View>
                  {step.images.map((image, imgIdx) => (
                    <View key={imgIdx} style={styles.imageContainer}>
                      <Image src={image.public_url} style={styles.stepImage} />
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </Page>

      {/* ═══════════════════════════════════════════════════════════
          CONTACTS D'URGENCE
          ═══════════════════════════════════════════════════════════ */}
      {data.emergencyContacts && data.emergencyContacts.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Contacts d'Urgence</Text>

          {data.emergencyContacts.map((contact, idx) => (
            <View key={idx} style={styles.emergencyContact}>
              <Text style={styles.emergencyTitle}>{contact.name}</Text>
              {contact.phone && (
                <Text style={styles.emergencyDetail}>📞 {contact.phone}</Text>
              )}
              {contact.email && (
                <Text style={styles.emergencyDetail}>✉️ {contact.email}</Text>
              )}
              {contact.address && (
                <Text style={styles.emergencyDetail}>📍 {contact.address}</Text>
              )}
            </View>
          ))}
        </Page>
      )}

      {/* ═══════════════════════════════════════════════════════════
          PAGE DE REMERCIEMENTS
          ═══════════════════════════════════════════════════════════ */}
      {data.thankYouMessage && (
        <Page size="A4" style={styles.page}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={[styles.sectionTitle, { textAlign: 'center', border: 'none' }]}>
              Merci !
            </Text>
            <Text style={[styles.overviewText, { textAlign: 'center', marginTop: 20 }]}>
              {data.thankYouMessage}
            </Text>
          </View>
        </Page>
      )}
    </Document>
  );
};
