import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { tripId } = await req.json();

    if (!tripId) {
      throw new Error('tripId is required');
    }

    console.log('Generating static booklet for trip:', tripId);

    // Fetch trip data
    const { data: trip } = await supabase
      .from('trips')
      .select('title, created_at')
      .eq('id', tripId)
      .single();

    // Fetch validated segments
    const { data: segments } = await supabase
      .from('travel_segments')
      .select('*')
      .eq('trip_id', tripId)
      .eq('validated', true)
      .order('start_date', { ascending: true })
      .order('sequence_order', { ascending: true });

    // Fetch general info
    const { data: generalInfo } = await supabase
      .from('trip_general_info')
      .select('*')
      .eq('trip_id', tripId)
      .maybeSingle();

    // Generate HTML content
    const html = generateHTML(trip, segments || [], generalInfo);

    // Upload to storage
    const timestamp = new Date().getTime();
    const fileName = `booklet-${tripId}-${timestamp}.html`;
    const filePath = fileName;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('booklet-exports')
      .upload(filePath, new Blob([html], { type: 'text/html' }), {
        contentType: 'text/html',
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('booklet-exports')
      .getPublicUrl(filePath);

    console.log('Booklet generated successfully:', urlData.publicUrl);

    return new Response(
      JSON.stringify({ url: urlData.publicUrl }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error generating booklet:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function generateHTML(trip: any, segments: any[], generalInfo: any): string {
  const tripTitle = trip?.title || 'Mon Voyage';
  
  // Group segments by date
  const segmentsByDate = new Map<string, any[]>();
  segments.forEach(segment => {
    if (segment.start_date) {
      const dateKey = segment.start_date.split('T')[0];
      if (!segmentsByDate.has(dateKey)) {
        segmentsByDate.set(dateKey, []);
      }
      segmentsByDate.get(dateKey)!.push(segment);
    }
  });

  const sortedDates = Array.from(segmentsByDate.keys()).sort();

  const colorTheme = { primary: '#3B82F6', secondary: '#93C5FD', accent: '#1E40AF' };

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${tripTitle} - Carnet de voyage">
  <meta property="og:title" content="${tripTitle}">
  <meta property="og:description" content="Carnet de voyage">
  <meta property="og:type" content="website">
  <title>${tripTitle} - Carnet de Voyage</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: #f9fafb;
      padding: 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, ${colorTheme.primary}, ${colorTheme.accent});
      color: white;
      padding: 40px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 10px;
    }
    
    .header p {
      font-size: 1.1rem;
      opacity: 0.95;
    }
    
    .content {
      padding: 40px;
    }
    
    .section {
      margin-bottom: 50px;
    }
    
    .section-title {
      font-size: 2rem;
      font-weight: 700;
      color: ${colorTheme.primary};
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 3px solid ${colorTheme.secondary};
    }
    
    .timeline {
      position: relative;
      padding-left: 30px;
    }
    
    .timeline::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: ${colorTheme.secondary};
    }
    
    .day-card {
      position: relative;
      margin-bottom: 40px;
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
      border-left: 4px solid ${colorTheme.primary};
    }
    
    .day-card::before {
      content: '';
      position: absolute;
      left: -36px;
      top: 25px;
      width: 12px;
      height: 12px;
      background: ${colorTheme.primary};
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 0 0 3px ${colorTheme.secondary};
    }
    
    .day-header {
      font-size: 1.3rem;
      font-weight: 600;
      color: ${colorTheme.accent};
      margin-bottom: 15px;
    }
    
    .segment {
      padding: 15px;
      background: white;
      border-radius: 6px;
      margin-bottom: 10px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    
    .segment-type {
      display: inline-block;
      padding: 4px 12px;
      background: ${colorTheme.secondary};
      color: ${colorTheme.accent};
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    .segment-title {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 5px;
    }
    
    .segment-details {
      font-size: 0.9rem;
      color: #6b7280;
      margin-top: 8px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    
    .info-card {
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
      border-left: 4px solid ${colorTheme.primary};
    }
    
    .info-card h3 {
      font-size: 1.1rem;
      font-weight: 600;
      color: ${colorTheme.accent};
      margin-bottom: 10px;
    }
    
    .info-card p {
      font-size: 0.95rem;
      color: #4b5563;
    }
    
    .footer {
      text-align: center;
      padding: 30px;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 0.9rem;
    }
    
    @media print {
      body {
        padding: 0;
        background: white;
      }
      
      .container {
        box-shadow: none;
      }
      
      .day-card {
        page-break-inside: avoid;
      }
    }
    
    @media (max-width: 768px) {
      .header h1 {
        font-size: 1.8rem;
      }
      
      .content {
        padding: 20px;
      }
      
      .section-title {
        font-size: 1.5rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${tripTitle}</h1>
      <p>${segments.length} segment${segments.length > 1 ? 's' : ''} de voyage</p>
    </div>
    
    <div class="content">
      <section class="section">
        <h2 class="section-title">📍 Itinéraire</h2>
        <div class="timeline">
          ${sortedDates.map((dateKey, index) => {
            const daySegments = segmentsByDate.get(dateKey) || [];
            const date = new Date(dateKey);
            const dayLabel = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
            
            return `
              <div class="day-card">
                <div class="day-header">Jour ${index + 1} - ${dayLabel}</div>
                ${daySegments.map(segment => `
                  <div class="segment">
                    <span class="segment-type">${getSegmentTypeLabel(segment.segment_type)}</span>
                    <div class="segment-title">${segment.title || 'Sans titre'}</div>
                    ${segment.description ? `<p>${segment.description}</p>` : ''}
                    <div class="segment-details">
                      ${segment.reference_number ? `<div>📋 Référence: ${segment.reference_number}</div>` : ''}
                      ${segment.address ? `<div>📍 ${segment.address}</div>` : ''}
                      ${segment.provider ? `<div>🏢 ${segment.provider}</div>` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            `;
          }).join('')}
        </div>
      </section>
      
      ${generalInfo ? `
        <section class="section">
          <h2 class="section-title">ℹ️ Informations Générales</h2>
          <div class="info-grid">
            ${generalInfo.currency ? `
              <div class="info-card">
                <h3>💱 Monnaie</h3>
                <p>${generalInfo.currency}</p>
                ${generalInfo.exchange_rate ? `<p><small>${generalInfo.exchange_rate}</small></p>` : ''}
              </div>
            ` : ''}
            ${generalInfo.climate_info?.description ? `
              <div class="info-card">
                <h3>☀️ Climat</h3>
                <p>${generalInfo.climate_info.description}</p>
              </div>
            ` : ''}
            ${generalInfo.languages?.main_language ? `
              <div class="info-card">
                <h3>🗣️ Langue</h3>
                <p>${generalInfo.languages.main_language}</p>
              </div>
            ` : ''}
            ${generalInfo.timezone_info?.timezone ? `
              <div class="info-card">
                <h3>⏰ Fuseau Horaire</h3>
                <p>${generalInfo.timezone_info.timezone}</p>
              </div>
            ` : ''}
          </div>
        </section>
      ` : ''}
    </div>
    
    <div class="footer">
      <p>Carnet de voyage généré le ${new Date().toLocaleDateString('fr-FR')}</p>
    </div>
  </div>
</body>
</html>`;
}

function getSegmentTypeLabel(type: string): string {
  const types: Record<string, string> = {
    flight: '✈️ Vol',
    hotel: '🏨 Hébergement',
    activity: '🎯 Activité',
    car: '🚗 Voiture',
    train: '🚂 Train',
    boat: '🚢 Bateau',
    pass: '🎫 Pass/Billet',
    transfer: '🚌 Transfert',
    other: '📍 Autre',
  };
  return types[type] || '📍 ' + type;
}
