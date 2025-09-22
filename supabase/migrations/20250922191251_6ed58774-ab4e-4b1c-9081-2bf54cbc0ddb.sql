-- Create travel_steps table
CREATE TABLE public.travel_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL,
  step_id TEXT NOT NULL, -- STEP_001, STEP_002, etc.
  step_type TEXT NOT NULL,
  step_title TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  primary_location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(trip_id, step_id)
);

-- Create travel_step_segments table for the relationship
CREATE TABLE public.travel_step_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  step_id UUID NOT NULL REFERENCES public.travel_steps(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL REFERENCES public.travel_segments(id) ON DELETE CASCADE,
  position_in_step INTEGER NOT NULL,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(step_id, segment_id),
  UNIQUE(step_id, position_in_step)
);

-- Enable RLS on travel_steps
ALTER TABLE public.travel_steps ENABLE ROW LEVEL SECURITY;

-- Create policies for travel_steps
CREATE POLICY "Users can access their own travel steps or anonymous steps"
ON public.travel_steps 
FOR ALL 
USING ((EXISTS (
  SELECT 1 FROM trips 
  WHERE trips.id = travel_steps.trip_id 
  AND ((trips.user_id = auth.uid()) OR ((auth.uid() IS NULL) AND (trips.user_id IS NOT NULL)))
)));

-- Enable RLS on travel_step_segments
ALTER TABLE public.travel_step_segments ENABLE ROW LEVEL SECURITY;

-- Create policies for travel_step_segments
CREATE POLICY "Users can access their own travel step segments or anonymous segments"
ON public.travel_step_segments 
FOR ALL 
USING ((EXISTS (
  SELECT 1 FROM travel_steps 
  JOIN trips ON trips.id = travel_steps.trip_id
  WHERE travel_steps.id = travel_step_segments.step_id 
  AND ((trips.user_id = auth.uid()) OR ((auth.uid() IS NULL) AND (trips.user_id IS NOT NULL)))
)));

-- Add updated_at trigger for travel_steps
CREATE TRIGGER update_travel_steps_updated_at
BEFORE UPDATE ON public.travel_steps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for performance
CREATE INDEX idx_travel_steps_trip_id ON public.travel_steps(trip_id);
CREATE INDEX idx_travel_step_segments_step_id ON public.travel_step_segments(step_id);
CREATE INDEX idx_travel_step_segments_segment_id ON public.travel_step_segments(segment_id);