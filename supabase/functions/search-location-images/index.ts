import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { location } = await req.json();
    
    if (!location) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Location parameter is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🖼️ Searching Wikimedia images for location:', location);

    // Search Wikimedia Commons for images related to the location
    const wikimediaSearchUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(location)}&srnamespace=6&srlimit=5&origin=*`;
    
    const searchResponse = await fetch(wikimediaSearchUrl);
    const searchData = await searchResponse.json();
    
    console.log('🔍 Wikimedia search results:', searchData.query?.search?.length || 0);

    if (!searchData.query?.search?.length) {
      return new Response(JSON.stringify({ 
        success: true, 
        images: [], 
        message: `No images found for ${location}` 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const imageUrls: string[] = [];
    
    // Get image URLs from the first few search results
    for (const result of searchData.query.search.slice(0, 3)) {
      const filename = result.title;
      
      // Get the actual image URL
      const imageInfoUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=${encodeURIComponent(filename)}&prop=imageinfo&iiprop=url&iiurlwidth=800&origin=*`;
      
      try {
        const imageResponse = await fetch(imageInfoUrl);
        const imageData = await imageResponse.json();
        
        const pages = imageData.query?.pages;
        if (pages) {
          const pageId = Object.keys(pages)[0];
          const imageInfo = pages[pageId]?.imageinfo?.[0];
          
          if (imageInfo?.thumburl) {
            imageUrls.push(imageInfo.thumburl);
            console.log('✅ Found image:', imageInfo.thumburl);
            
            // Limit to 2 images maximum
            if (imageUrls.length >= 2) break;
          }
        }
      } catch (error) {
        console.warn('Failed to get image info for:', filename, error);
        continue;
      }
    }

    console.log('🎯 Final Wikimedia images found:', imageUrls.length);

    return new Response(JSON.stringify({ 
      success: true, 
      images: imageUrls,
      source: 'wikimedia'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in search-location-images function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});