import { BookletData, BookletOptions } from './bookletService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function generateStaticHTML(
  data: BookletData,
  options: BookletOptions,
  tripId: string,
  generalInfo?: any,
  emergencyContacts?: any
): string {
  const { tripTitle, startDate, endDate, totalDays, timeline } = data;

  // Format dates
  const formattedStartDate = startDate ? format(startDate, 'dd MMMM yyyy', { locale: fr }) : '';
  const formattedEndDate = endDate ? format(endDate, 'dd MMMM yyyy', { locale: fr }) : '';

  // Color theme
  const colorThemes = {
    blue: { primary: '#3B82F6', secondary: '#93C5FD', accent: '#1E40AF' },
    green: { primary: '#10B981', secondary: '#6EE7B7', accent: '#047857' },
    orange: { primary: '#F97316', secondary: '#FDBA74', accent: '#C2410C' },
  };
  const theme = colorThemes[options.colorTheme];

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${tripTitle} - Carnet de voyage">
  <meta property="og:title" content="${tripTitle}">
  <meta property="og:description" content="Carnet de voyage - ${formattedStartDate} au ${formattedEndDate}">
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
      background: linear-gradient(135deg, ${theme.primary}, ${theme.accent});
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
      color: ${theme.primary};
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 3px solid ${theme.secondary};
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
      background: ${theme.secondary};
    }
    
    .day-card {
      position: relative;
      margin-bottom: 40px;
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
      border-left: 4px solid ${theme.primary};
    }
    
    .day-card::before {
      content: '';
      position: absolute;
      left: -36px;
      top: 25px;
      width: 12px;
      height: 12px;
      background: ${theme.primary};
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 0 0 3px ${theme.secondary};
    }
    
    .day-header {
      font-size: 1.3rem;
      font-weight: 600;
      color: ${theme.accent};
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
      background: ${theme.secondary};
      color: ${theme.accent};
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
      border-left: 4px solid ${theme.primary};
    }
    
    .info-card h3 {
      font-size: 1.1rem;
      font-weight: 600;
      color: ${theme.accent};
      margin-bottom: 10px;
    }
    
    .info-card p {
      font-size: 0.95rem;
      color: #4b5563;
    }
    
    .emergency-contact {
      padding: 15px;
      background: #fef2f2;
      border-left: 4px solid #ef4444;
      border-radius: 6px;
      margin-bottom: 15px;
    }
    
    .emergency-contact strong {
      color: #991b1b;
      display: block;
      margin-bottom: 5px;
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
      <p>${formattedStartDate} - ${formattedEndDate} • ${totalDays} jour${totalDays > 1 ? 's' : ''}</p>
    </div>
    
    <div class="content">
      <!-- Timeline Section -->
      <section class="section">
        <h2 class="section-title">📍 Itinéraire</h2>
        <div class="timeline">
          ${timeline.map((day, index) => `
            <div class="day-card">
              <div class="day-header">
                Jour ${index + 1} - ${format(day.date, 'EEEE dd MMMM', { locale: fr })}
              </div>
              ${day.segments.map(segment => `
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
          `).join('')}
        </div>
      </section>
      
      <!-- General Info Section -->
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
      
      <!-- Emergency Contacts Section -->
      ${emergencyContacts && emergencyContacts.length > 0 ? `
        <section class="section">
          <h2 class="section-title">🚨 Contacts d'Urgence</h2>
          ${emergencyContacts.map((contact: any) => `
            <div class="emergency-contact">
              <strong>${contact.name}</strong>
              ${contact.phone ? `<div>📞 ${contact.phone}</div>` : ''}
              ${contact.email ? `<div>✉️ ${contact.email}</div>` : ''}
            </div>
          `).join('')}
        </section>
      ` : ''}
    </div>
    
    <div class="footer">
      <p>Carnet de voyage généré le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}</p>
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
