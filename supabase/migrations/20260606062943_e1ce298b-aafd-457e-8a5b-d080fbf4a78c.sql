DROP TABLE IF EXISTS public.template_questions CASCADE;
DROP TABLE IF EXISTS public.quiz_templates CASCADE;
ALTER TABLE public.quizzes DROP COLUMN IF EXISTS source_template_id;