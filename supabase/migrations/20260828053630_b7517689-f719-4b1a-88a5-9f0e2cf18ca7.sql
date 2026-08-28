ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS feedback_form jsonb;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS feedback_form jsonb;
ALTER TABLE public.internship_feedback ADD COLUMN IF NOT EXISTS custom_answers jsonb NOT NULL DEFAULT '{}'::jsonb;