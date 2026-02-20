-- Add categorization and goal tracking to activities
ALTER TABLE public.activities 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'Uncategorized',
ADD COLUMN IF NOT EXISTS target_duration_minutes integer,
ADD COLUMN IF NOT EXISTS target_type text CHECK (target_type IN ('min', 'max'));
