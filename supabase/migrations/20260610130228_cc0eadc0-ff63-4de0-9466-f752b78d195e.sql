ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS feedback_rating integer,
  ADD COLUMN IF NOT EXISTS feedback_text text NOT NULL DEFAULT '';