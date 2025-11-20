import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tripId, quoteData } = await req.json();

    if (!tripId || !quoteData) {
      throw new Error("Missing tripId or quoteData");
    }

    console.log(`Generating quote PDF for trip ${tripId}`);

    // Créer le client Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Générer le HTML du devis
    const html = generateQuoteHTML(quoteData);

    // Pour l'instant, on stocke le HTML
    // TODO: Intégrer avec Puppeteer pour générer un vrai PDF
    const htmlBlob = new Blob([html], { type: "text/html" });
    const fileName = `${tripId}/quote-${Date.now()}.html`;

    // Upload vers le storage
    const { error: uploadError } = await supabase.storage
      .from("quote-exports")
      .upload(fileName, htmlBlob, {
        contentType: "text/html",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw uploadError;
    }

    // Récupérer l'URL publique
    const { data: urlData } = supabase.storage
      .from("quote-exports")
      .getPublicUrl(fileName);

    console.log(`Quote generated successfully: ${urlData.publicUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        pdfUrl: urlData.publicUrl,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating quote:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function generateQuoteHTML(quoteData: any): string {
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Devis - ${quoteData.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #fff;
    }
    .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    .header {
      text-align: center;
      padding: 40px 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      margin-bottom: 40px;
    }
    .header img { height: 60px; margin-bottom: 20px; }
    .header h1 { font-size: 2.5em; margin-bottom: 10px; }
    .header .meta { font-size: 1.1em; opacity: 0.9; }
    .section { margin-bottom: 40px; }
    .section-title {
      font-size: 1.8em;
      margin-bottom: 20px;
      color: #667eea;
      border-bottom: 3px solid #667eea;
      padding-bottom: 10px;
    }
    .step {
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 4px;
    }
    .step-number {
      display: inline-block;
      width: 40px;
      height: 40px;
      background: #667eea;
      color: white;
      border-radius: 50%;
      text-align: center;
      line-height: 40px;
      font-weight: bold;
      margin-right: 15px;
    }
    .step-title { font-size: 1.4em; font-weight: bold; margin-bottom: 10px; }
    .step-meta { color: #666; font-size: 0.9em; margin-bottom: 10px; }
    .segment { padding: 10px 0 10px 55px; border-left: 2px solid #ddd; margin-left: 20px; }
    .segment-item {
      margin-bottom: 8px;
      padding-left: 20px;
      position: relative;
    }
    .segment-item:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #667eea;
      font-weight: bold;
    }
    .why-us {
      background: #f8f9fa;
      padding: 30px;
      border-radius: 8px;
      margin: 40px 0;
    }
    .why-us-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .why-us-item { text-align: center; }
    .why-us-item h3 { color: #667eea; margin: 10px 0; }
    .testimonials {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .testimonial {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 20px;
    }
    .stars { color: #ffc107; margin-bottom: 10px; }
    .faq-item { margin-bottom: 20px; }
    .faq-question {
      font-weight: bold;
      color: #667eea;
      margin-bottom: 5px;
    }
    .contact {
      text-align: center;
      background: #667eea;
      color: white;
      padding: 40px;
      margin-top: 40px;
      border-radius: 8px;
    }
    .contact h2 { margin-bottom: 20px; }
    @media print {
      body { background: white; }
      .header { break-after: avoid; }
      .step { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${quoteData.title}</h1>
    <div class="meta">
      📍 ${quoteData.destination} | 📅 ${quoteData.duration} jours<br>
      ${quoteData.startDate ? `Du ${formatDate(quoteData.startDate)} au ${formatDate(quoteData.endDate)}` : ""}
    </div>
  </div>

  <div class="container">
    <div class="section">
      <h2 class="section-title">Votre programme</h2>
      ${quoteData.steps
        .map(
          (step: any, index: number) => `
        <div class="step">
          <span class="step-number">${index + 1}</span>
          <div style="display: inline-block; vertical-align: top; width: calc(100% - 60px);">
            <div class="step-title">${step.title}</div>
            <div class="step-meta">
              ${step.date ? `📅 ${formatDate(step.date)}` : ""}
              ${step.location ? `| 📍 ${step.location}` : ""}
            </div>
            ${step.description ? `<p>${step.description}</p>` : ""}
            ${
              step.segments.length > 0
                ? `
              <div class="segment">
                ${step.segments
                  .map(
                    (seg: any) => `
                  <div class="segment-item">
                    <strong>${seg.title}</strong>
                    ${seg.provider ? `<em>(${seg.provider})</em>` : ""}
                    ${seg.description ? `<br><span style="color: #666;">${seg.description}</span>` : ""}
                  </div>
                `
                  )
                  .join("")}
              </div>
            `
                : ""
            }
          </div>
        </div>
      `
        )
        .join("")}
    </div>

    <div class="why-us">
      <h2 class="section-title">Pourquoi réserver avec AD Gentes ?</h2>
      <div class="why-us-grid">
        <div class="why-us-item">
          <div style="font-size: 2em;">✅</div>
          <h3>Expertise locale</h3>
          <p>Plus de 20 ans d'expérience</p>
        </div>
        <div class="why-us-item">
          <div style="font-size: 2em;">👤</div>
          <h3>Accompagnement personnalisé</h3>
          <p>Un conseiller dédié</p>
        </div>
        <div class="why-us-item">
          <div style="font-size: 2em;">🔄</div>
          <h3>Flexibilité garantie</h3>
          <p>Modifications possibles</p>
        </div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Ce que disent nos clients</h2>
      <div class="testimonials">
        <div class="testimonial">
          <div class="stars">⭐⭐⭐⭐⭐</div>
          <p>"Un voyage absolument merveilleux ! L'organisation était parfaite."</p>
          <p><strong>Marie & Pierre</strong> - Italie</p>
        </div>
        <div class="testimonial">
          <div class="stars">⭐⭐⭐⭐⭐</div>
          <p>"Service impeccable, équipe très professionnelle et à l'écoute."</p>
          <p><strong>Sophie</strong> - Japon</p>
        </div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Questions fréquentes</h2>
      <div class="faq-item">
        <div class="faq-question">❓ Puis-je modifier mon programme ?</div>
        <p>Oui, nous pouvons adapter le programme selon vos préférences.</p>
      </div>
      <div class="faq-item">
        <div class="faq-question">❓ Quelles sont les conditions d'annulation ?</div>
        <p>Les conditions dépendent des prestataires. Nous vous fournirons tous les détails.</p>
      </div>
      <div class="faq-item">
        <div class="faq-question">❓ Êtes-vous joignable pendant le voyage ?</div>
        <p>Oui, assistance 24h/24 et 7j/7 disponible pendant toute la durée.</p>
      </div>
    </div>

    <div class="contact">
      <h2>Prêt à partir ?</h2>
      <p>Contactez-nous pour finaliser votre réservation</p>
      <p style="margin-top: 20px;">
        📞 +33 1 23 45 67 89<br>
        ✉️ contact@adgentes.fr<br>
        🌐 www.adgentes.fr
      </p>
    </div>
  </div>
</body>
</html>`;
}
