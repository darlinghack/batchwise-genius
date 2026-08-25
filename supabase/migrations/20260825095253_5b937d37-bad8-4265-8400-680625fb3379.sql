ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS is_assessment boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hide_results boolean NOT NULL DEFAULT false;

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '';