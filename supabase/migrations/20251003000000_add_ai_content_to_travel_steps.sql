-- Add ai_content column to store generated AI content for steps
-- This allows persistence of AI-generated content (overview, tips, localContext, images)
-- for display in Static Itinerary (Mode Dev)

ALTER TABLE travel_steps 
ADD COLUMN IF NOT EXISTS ai_content JSONB;

-- Add index for faster queries on ai_content
CREATE INDEX IF NOT EXISTS idx_travel_steps_ai_content 
ON travel_steps USING GIN (ai_content);

-- Add comment to document the column
COMMENT ON COLUMN travel_steps.ai_content IS 'Stores AI-generated content: overview, tips, localContext, images, and generatedAt timestamp';
