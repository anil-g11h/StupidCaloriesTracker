ALTER TABLE public.foods
  ADD COLUMN IF NOT EXISTS is_supplement boolean NOT NULL DEFAULT false;