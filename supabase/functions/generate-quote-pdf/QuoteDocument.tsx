import React from "npm:react@18.2.0";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
  Font,
} from "npm:@react-pdf/renderer@3.4.3";
import { QuoteData } from "./extract.ts";

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    fontFamily: "Helvetica",
  },
  section: {
    margin: 10,
    padding: 10,
  },
  coverPage: {
    flex: 1,
    flexDirection: "row",
    padding: 0,
  },
  coverLeft: {
    width: "50%",
    height: "100%",
  },
  coverImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  coverRight: {
    width: "50%",
    padding: 40,
    justifyContent: "center",
  },
  logo: {
    width: 150,
    marginBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#1a1a1a",
  },
  client: {
    fontSize: 18,
    marginBottom: 10,
    color: "#4a4a4a",
  },
  dates: {
    fontSize: 14,
    color: "#666666",
  },
  header: {
    fontSize: 24,
    marginBottom: 20,
    color: "#2563eb",
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
    paddingBottom: 5,
  },
  summaryContainer: {
    flexDirection: "row",
    marginTop: 20,
  },
  summaryList: {
    width: "65%",
    paddingRight: 20,
  },
  summaryImageContainer: {
    width: "35%",
    height: 300,
  },
  summaryImage: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
    objectFit: "cover",
  },
  stepRow: {
    flexDirection: "row",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 5,
  },
  stepDate: {
    width: 60,
    fontSize: 10,
    color: "#2563eb",
    fontWeight: "bold",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 2,
  },
  stepLocation: {
    fontSize: 8,
    color: "#666",
    textTransform: "uppercase",
  },
  pricingContainer: {
    flexDirection: "row",
    marginTop: 20,
  },
  pricingLeft: {
    width: "60%",
    paddingRight: 20,
  },
  pricingRight: {
    width: "40%",
    backgroundColor: "#f8f9fa",
    padding: 20,
    borderRadius: 10,
  },
  priceBox: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: "white",
    borderRadius: 5,
    alignItems: "center",
  },
  priceValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2563eb",
  },
  highlightItem: {
    flexDirection: "row",
    marginBottom: 8,
  },
  highlightBullet: {
    width: 15,
    fontSize: 10,
    color: "#2563eb",
  },
  highlightText: {
    fontSize: 10,
    flex: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  card: {
    width: "30%",
    padding: 10,
    backgroundColor: "#f8f9fa",
    borderRadius: 5,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#2563eb",
  },
  cardText: {
    fontSize: 10,
    color: "#4a4a4a",
  },
});

const QuoteDocument = ({ data }: { data: QuoteData }) => (
  <Document>
    {/* Cover Page */}
    <Page size="A4" style={styles.page}>
      <View style={styles.coverPage}>
        <View style={styles.coverLeft}>
          {data.cover?.image && (
            <Image src={data.cover.image} style={styles.coverImage} />
          )}
        </View>
        <View style={styles.coverRight}>
          {/* Logo would go here if we had the URL/Base64 */}
          <Text style={styles.title}>{data.cover?.title || "Votre Voyage"}</Text>
          <Text style={styles.client}>{data.cover?.client}</Text>
          <Text style={styles.dates}>{data.cover?.dates}</Text>
        </View>
      </View>
    </Page>

    {/* Itinerary Summary */}
    {data.summary && (
      <Page size="A4" style={{ ...styles.page, padding: 40 }}>
        <Text style={styles.header}>Votre Itinéraire</Text>
        <View style={styles.summaryContainer}>
          <View style={styles.summaryList}>
            {data.summary.steps.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <Text style={styles.stepDate}>{step.date}</Text>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepLocation}>{step.location}</Text>
                </View>
              </View>
            ))}
          </View>
          <View style={styles.summaryImageContainer}>
            {data.summary.image && (
              <Image src={data.summary.image} style={styles.summaryImage} />
            )}
          </View>
        </View>
      </Page>
    )}

    {/* Pricing & Details */}
    {data.pricing && (
      <Page size="A4" style={{ ...styles.page, padding: 40 }}>
        <Text style={styles.header}>Votre Devis</Text>
        <View style={styles.pricingContainer}>
          <View style={styles.pricingLeft}>
            <Text style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 20 }}>
              {data.pricing.description}
            </Text>
            {data.pricing.image && (
              <Image
                src={data.pricing.image}
                style={{ width: "100%", height: 200, borderRadius: 10, objectFit: "cover" }}
              />
            )}
          </View>
          <View style={styles.pricingRight}>
            <View style={styles.priceBox}>
              <Text style={{ fontSize: 10, color: "#666", marginBottom: 5 }}>Prix Total</Text>
              <Text style={styles.priceValue}>{data.pricing.price} CHF</Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: "bold", marginBottom: 10 }}>
              Points forts
            </Text>
            {data.pricing.highlights?.map((h, i) => (
              <View key={i} style={styles.highlightItem}>
                <Text style={styles.highlightBullet}>✓</Text>
                <Text style={styles.highlightText}>{h}</Text>
              </View>
            ))}
          </View>
        </View>
      </Page>
    )}

    {/* Why Us & Reviews */}
    {(data.whyUs || data.reviews) && (
      <Page size="A4" style={{ ...styles.page, padding: 40 }}>
        {data.whyUs && (
          <View style={{ marginBottom: 30 }}>
            <Text style={styles.header}>Pourquoi nous choisir ?</Text>
            <View style={styles.grid}>
              {data.whyUs.map((item, i) => (
                <View key={i} style={styles.card}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardText}>{item.description}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {data.reviews && (
          <View>
            <Text style={styles.header}>Témoignages</Text>
            <View style={styles.grid}>
              {data.reviews.map((review, i) => (
                <View key={i} style={styles.card}>
                  <Text style={{ ...styles.cardText, fontStyle: "italic", marginBottom: 5 }}>
                    "{review.text}"
                  </Text>
                  <Text style={{ ...styles.cardTitle, fontSize: 10 }}>
                    - {review.author}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </Page>
    )}

    {/* FAQ */}
    {data.faq && (
      <Page size="A4" style={{ ...styles.page, padding: 40 }}>
        <Text style={styles.header}>Questions Fréquentes</Text>
        <View>
          {data.faq.map((item, i) => (
            <View key={i} style={{ marginBottom: 15 }}>
              <Text style={{ fontSize: 12, fontWeight: "bold", color: "#2563eb", marginBottom: 5 }}>
                {item.question}
              </Text>
              <Text style={{ fontSize: 10, lineHeight: 1.5, color: "#4a4a4a" }}>
                {item.answer}
              </Text>
            </View>
          ))}
        </View>
      </Page>
    )}
  </Document>
);

export default QuoteDocument;
