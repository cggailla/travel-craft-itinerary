-- Add columns for segment grouping optimization
ALTER TABLE travel_segments 
ADD COLUMN segment_group_id UUID DEFAULT gen_random_uuid(),
ADD COLUMN is_multi_day BOOLEAN DEFAULT FALSE,
ADD COLUMN parent_segment_id UUID REFERENCES travel_segments(id) ON DELETE SET NULL;

-- Create index for efficient querying of segment groups
CREATE INDEX idx_travel_segments_group_id ON travel_segments(segment_group_id);
CREATE INDEX idx_travel_segments_parent ON travel_segments(parent_segment_id);

-- Function to automatically group similar consecutive segments
CREATE OR REPLACE FUNCTION group_similar_segments(p_trip_id UUID)
RETURNS void AS $$
DECLARE
  segment_record RECORD;
  prev_segment RECORD := NULL;
  current_group_id UUID := NULL;
  parent_id UUID := NULL;
BEGIN
  -- Process segments in chronological order
  FOR segment_record IN 
    SELECT * FROM travel_segments 
    WHERE trip_id = p_trip_id 
    ORDER BY start_date ASC, sequence_order ASC
  LOOP
    -- Check if this segment is similar to the previous one
    IF prev_segment IS NOT NULL AND
       segment_record.segment_type = prev_segment.segment_type AND
       segment_record.provider = prev_segment.provider AND
       (segment_record.address = prev_segment.address OR 
        (segment_record.address IS NULL AND prev_segment.address IS NULL)) AND
       -- Check if dates are consecutive (within 2 days)
       segment_record.start_date::date - prev_segment.end_date::date <= 2
    THEN
      -- This is a continuation of the previous segment group
      IF current_group_id IS NULL THEN
        -- Create new group and make previous segment the parent
        current_group_id := gen_random_uuid();
        parent_id := prev_segment.id;
        
        -- Update previous segment as parent
        UPDATE travel_segments 
        SET segment_group_id = current_group_id,
            is_multi_day = TRUE
        WHERE id = prev_segment.id;
      END IF;
      
      -- Add current segment to the group as child
      UPDATE travel_segments 
      SET segment_group_id = current_group_id,
          parent_segment_id = parent_id
      WHERE id = segment_record.id;
      
    ELSE
      -- This is a new segment, reset group tracking
      current_group_id := NULL;
      parent_id := NULL;
    END IF;
    
    prev_segment := segment_record;
  END LOOP;
  
  RAISE NOTICE 'Segment grouping completed for trip %', p_trip_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get grouped segments for efficient processing
CREATE OR REPLACE FUNCTION get_grouped_segments(p_trip_id UUID)
RETURNS TABLE (
  group_id UUID,
  parent_segment jsonb,
  child_segments jsonb,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  total_days INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH segment_groups AS (
    SELECT 
      ts.segment_group_id,
      MIN(ts.start_date) as group_start_date,
      MAX(ts.end_date) as group_end_date,
      COUNT(*) as segment_count,
      (MAX(ts.end_date)::date - MIN(ts.start_date)::date + 1) as days_span
    FROM travel_segments ts
    WHERE ts.trip_id = p_trip_id 
      AND ts.validated = true
      AND ts.segment_group_id IS NOT NULL
    GROUP BY ts.segment_group_id
  ),
  parent_segments as (
    SELECT 
      ts.*,
      sg.group_start_date,
      sg.group_end_date,
      sg.days_span
    FROM travel_segments ts
    JOIN segment_groups sg ON ts.segment_group_id = sg.segment_group_id
    WHERE ts.trip_id = p_trip_id 
      AND ts.parent_segment_id IS NULL
      AND ts.is_multi_day = true
  ),
  child_segments as (
    SELECT 
      ts.parent_segment_id,
      json_agg(
        json_build_object(
          'id', ts.id,
          'start_date', ts.start_date,
          'end_date', ts.end_date,
          'title', ts.title,
          'description', ts.description,
          'reference_number', ts.reference_number
        ) ORDER BY ts.start_date
      ) as children
    FROM travel_segments ts
    WHERE ts.trip_id = p_trip_id 
      AND ts.parent_segment_id IS NOT NULL
    GROUP BY ts.parent_segment_id
  )
  SELECT 
    ps.segment_group_id,
    to_jsonb(ps.*) as parent_segment,
    COALESCE(cs.children, '[]'::jsonb) as child_segments,
    ps.group_start_date,
    ps.group_end_date,
    ps.days_span::integer
  FROM parent_segments ps
  LEFT JOIN child_segments cs ON ps.id = cs.parent_segment_id
  
  UNION ALL
  
  -- Include ungrouped segments
  SELECT 
    ts.id as group_id,
    to_jsonb(ts.*) as parent_segment,
    '[]'::jsonb as child_segments,
    ts.start_date,
    ts.end_date,
    CASE 
      WHEN ts.end_date IS NOT NULL AND ts.start_date IS NOT NULL 
      THEN (ts.end_date::date - ts.start_date::date + 1)
      ELSE 1 
    END as total_days
  FROM travel_segments ts
  WHERE ts.trip_id = p_trip_id 
    AND ts.validated = true
    AND (ts.segment_group_id IS NULL OR ts.segment_group_id NOT IN (
      SELECT segment_group_id FROM segment_groups
    ))
  ORDER BY start_date ASC;
END;
$$ LANGUAGE plpgsql;