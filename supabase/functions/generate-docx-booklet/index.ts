import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, ImageRun, BorderStyle } from "npm:docx@8.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tripId } = await req.json();
    
    if (!tripId) {
      throw new Error('Trip ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching trip data for:', tripId);

    // Fetch trip data
    const { data: segments, error: segmentsError } = await supabase
      .from('travel_segments')
      .select('*')
      .eq('trip_id', tripId)
      .eq('validated', true)
      .order('start_date', { ascending: true });

    if (segmentsError) throw segmentsError;

    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (tripError) throw tripError;

    // Fetch general info and emergency contacts
    const { data: generalInfo } = await supabase
      .from('trip_general_info')
      .select('*')
      .eq('trip_id', tripId)
      .single();

    const { data: emergencyContacts } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('trip_id', tripId);

    console.log('Building DOCX document...');

    // Helper function to download image
    async function downloadImage(url: string): Promise<Uint8Array | null> {
      try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const arrayBuffer = await response.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      } catch (error) {
        console.error('Error downloading image:', url, error);
        return null;
      }
    }

    // Build document sections
    const docSections: Paragraph[] = [];

    // Title
    docSections.push(
      new Paragraph({
        text: trip.title || 'Carnet de Voyage',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    // Trip dates
    if (segments && segments.length > 0) {
      const startDate = new Date(segments[0].start_date).toLocaleDateString('fr-FR', { 
        day: 'numeric', month: 'long', year: 'numeric' 
      });
      const lastSegment = segments[segments.length - 1];
      const endDate = new Date(lastSegment.end_date || lastSegment.start_date).toLocaleDateString('fr-FR', { 
        day: 'numeric', month: 'long', year: 'numeric' 
      });
      
      docSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Du ${startDate} au ${endDate}`,
              bold: true,
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
        })
      );
    }

    // Itinerary section
    docSections.push(
      new Paragraph({
        text: 'Itinéraire',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 300 },
      })
    );

    // Group segments by day
    const segmentsByDay = new Map<string, typeof segments>();
    segments?.forEach(segment => {
      const day = new Date(segment.start_date).toLocaleDateString('fr-FR');
      if (!segmentsByDay.has(day)) {
        segmentsByDay.set(day, []);
      }
      segmentsByDay.get(day)!.push(segment);
    });

    // Add each day
    for (const [day, daySegments] of segmentsByDay) {
      docSections.push(
        new Paragraph({
          text: day,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 200 },
        })
      );

      for (const segment of daySegments) {
        // Segment title
        const segmentIcon = getSegmentIcon(segment.segment_type);
        docSections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${segmentIcon} ${segment.title || 'Sans titre'}`,
                bold: true,
                size: 22,
              }),
            ],
            spacing: { before: 200, after: 100 },
          })
        );

        // Time
        if (segment.start_date) {
          const time = new Date(segment.start_date).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          });
          docSections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `Heure: ${time}`,
                  italics: true,
                }),
              ],
              spacing: { after: 100 },
            })
          );
        }

        // Description
        if (segment.description) {
          docSections.push(
            new Paragraph({
              text: segment.description,
              spacing: { after: 100 },
            })
          );
        }

        // Address
        if (segment.address) {
          docSections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `📍 ${segment.address}`,
                }),
              ],
              spacing: { after: 100 },
            })
          );
        }

        // Reference number
        if (segment.reference_number) {
          docSections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `Référence: ${segment.reference_number}`,
                  italics: true,
                }),
              ],
              spacing: { after: 100 },
            })
          );
        }

        // AI Content
        if (segment.ai_content) {
          docSections.push(
            new Paragraph({
              text: segment.ai_content,
              spacing: { after: 200 },
            })
          );
        }

        // Images
        if (segment.cover_images && Array.isArray(segment.cover_images)) {
          for (const imageUrl of segment.cover_images.slice(0, 3)) {
            try {
              const imageData = await downloadImage(imageUrl);
              if (imageData) {
                docSections.push(
                  new Paragraph({
                    children: [
                      new ImageRun({
                        data: imageData,
                        transformation: {
                          width: 400,
                          height: 300,
                        },
                      }),
                    ],
                    spacing: { after: 200 },
                  })
                );
              }
            } catch (error) {
              console.error('Error adding image:', error);
            }
          }
        }
      }
    }

    // General Information section
    if (generalInfo) {
      docSections.push(
        new Paragraph({
          text: 'Informations Générales',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 600, after: 300 },
          pageBreakBefore: true,
        })
      );

      const infoFields = [
        { label: 'Documents requis', value: generalInfo.required_documents },
        { label: 'Santé et vaccinations', value: generalInfo.health_vaccinations },
        { label: 'Monnaie locale', value: generalInfo.local_currency },
        { label: 'Décalage horaire', value: generalInfo.time_zone },
        { label: 'Langue', value: generalInfo.language },
        { label: 'Climat', value: generalInfo.climate },
        { label: 'Bagages', value: generalInfo.luggage_info },
        { label: 'Transport local', value: generalInfo.local_transport },
        { label: 'Conseils pratiques', value: generalInfo.practical_tips },
      ];

      for (const field of infoFields) {
        if (field.value) {
          docSections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${field.label}: `,
                  bold: true,
                }),
                new TextRun({
                  text: field.value,
                }),
              ],
              spacing: { after: 200 },
            })
          );
        }
      }
    }

    // Emergency Contacts section
    if (emergencyContacts && emergencyContacts.length > 0) {
      docSections.push(
        new Paragraph({
          text: 'Contacts d\'Urgence',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 600, after: 300 },
          pageBreakBefore: true,
        })
      );

      for (const contact of emergencyContacts) {
        docSections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${contact.name || 'Contact'}\n`,
                bold: true,
                size: 24,
              }),
              new TextRun({
                text: `Téléphone: ${contact.phone || 'N/A'}\n`,
              }),
              new TextRun({
                text: `Email: ${contact.email || 'N/A'}\n`,
              }),
            ],
            spacing: { after: 300 },
          })
        );
      }
    }

    // Create document
    const doc = new Document({
      sections: [{
        properties: {},
        children: docSections,
      }],
    });

    console.log('Generating DOCX file...');
    const buffer = await Packer.toBuffer(doc);

    // Ensure bucket exists and allows DOCX uploads
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucket = buckets?.find(b => b.name === 'booklet-exports');
    
    if (!bucket) {
      console.log('Creating booklet-exports bucket...');
      const { error: createBucketError } = await supabase.storage.createBucket('booklet-exports', {
        public: true,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: [
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/octet-stream'
        ]
      });
      if (createBucketError) console.error('Error creating bucket:', createBucketError);
    } else {
      // Update bucket to ensure mime types are allowed
      const { error: updateBucketError } = await supabase.storage.updateBucket('booklet-exports', {
        public: true,
        fileSizeLimit: 52428800,
        allowedMimeTypes: [
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/octet-stream'
        ]
      });
      if (updateBucketError) console.warn('Warning updating bucket (may already be configured):', updateBucketError);
    }

    // Upload to Supabase Storage
    const fileName = `booklet_${tripId}_${Date.now()}.docx`;
    const { error: uploadError } = await supabase.storage
      .from('booklet-exports')
      .upload(fileName, buffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('booklet-exports')
      .getPublicUrl(fileName);

    console.log('DOCX generated successfully:', urlData.publicUrl);

    return new Response(
      JSON.stringify({ url: urlData.publicUrl }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error generating DOCX:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function getSegmentIcon(type: string): string {
  const icons: Record<string, string> = {
    flight: '✈️',
    hotel: '🏨',
    activity: '🎯',
    restaurant: '🍽️',
    transport: '🚗',
    visit: '🏛️',
    other: '📍',
  };
  return icons[type] || '📍';
}
