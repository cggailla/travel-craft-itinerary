import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Authentication helper
async function authenticateRequest(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('No authorization header');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw new Error('Invalid token');
  }

  return { user, supabase: createClient(supabaseUrl, token) };
}

// Verify step ownership
async function verifyStepOwnership(supabase: any, userId: string, stepId: string) {
  const { data: step, error: stepError } = await supabase
    .from('travel_steps')
    .select('trip_id')
    .eq('id', stepId)
    .single();

  if (stepError || !step) {
    throw new Error('Step not found');
  }

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('user_id')
    .eq('id', step.trip_id)
    .single();

  if (tripError || !trip || trip.user_id !== userId) {
    throw new Error('Unauthorized access to step');
  }

  return trip;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { stepId, stepTitle, primaryLocation, segments, tripSummary } = await req.json();

    if (!stepId || !stepTitle || !primaryLocation) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: stepId, stepTitle, primaryLocation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate and verify ownership
    const { user, supabase } = await authenticateRequest(req);
    await verifyStepOwnership(supabase, user.id, stepId);

    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityApiKey) {
      throw new Error('PERPLEXITY_API_KEY not configured');
    }

    // Build context from segments
    const segmentContext = segments?.map((seg: any) => {
      const details = [];
      if (seg.segments?.length > 0) {
        const segmentTitles = seg.segments.map((s: any) => s.title).join(', ');
        details.push(`${seg.title}: ${segmentTitles}`);
      }
      return details.join(' ');
    }).filter(Boolean).join('\n') || 'No specific segments';

    // Construct prompt for commercial quote description
    const prompt = `Tu es un expert en rédaction de devis de voyage haut de gamme.

CONTEXTE DU VOYAGE:
${tripSummary || 'Voyage personnalisé'}

ÉTAPE À DÉCRIRE:
Titre: ${stepTitle}
Lieu: ${primaryLocation}
Éléments inclus:
${segmentContext}

INSTRUCTIONS:
Rédige un paragraphe commercial de 50-80 mots pour présenter cette étape dans un devis de voyage.
Le style doit être:
- Professionnel et élégant
- Vendeur mais pas exagéré
- Mettant en avant les points forts et l'expérience unique
- Concret et précis sur ce qui est inclus
- Donnant envie au client de réserver

FORMAT DE RÉPONSE (JSON strict):
{
  "quoteDescription": "Votre paragraphe commercial ici..."
}

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`;

    console.log('Calling Perplexity API for quote description...');
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en rédaction commerciale pour le secteur du tourisme de luxe. Tu réponds UNIQUEMENT en JSON valide.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in Perplexity response');
    }

    // Parse JSON response
    let quoteDescription: string;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      const parsed = JSON.parse(jsonMatch[0]);
      quoteDescription = parsed.quoteDescription;
    } catch (parseError) {
      console.error('Failed to parse JSON:', content);
      throw new Error('Invalid JSON response from AI');
    }

    if (!quoteDescription) {
      throw new Error('Missing quoteDescription in response');
    }

    // Save to database
    const { error: updateError } = await supabase
      .from('travel_steps')
      .update({
        ai_content: {
          quoteDescription
        }
      })
      .eq('id', stepId);

    if (updateError) {
      console.error('Error updating step:', updateError);
      throw new Error('Failed to save quote description');
    }

    console.log('Quote description generated and saved successfully');

    return new Response(
      JSON.stringify({ 
        stepId,
        quoteDescription,
        success: true 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in generate-quote-step-description:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});