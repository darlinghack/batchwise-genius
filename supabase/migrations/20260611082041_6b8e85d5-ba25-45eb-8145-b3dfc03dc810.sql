CREATE TABLE public.internship_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL,
  student_name text NOT NULL DEFAULT '',
  student_email text NOT NULL DEFAULT '',
  section text,
  faculty_clarity smallint,
  faculty_engagement smallint,
  faculty_expertise smallint,
  faculty_answering smallint,
  teaching_pace text,
  resources_usefulness text,
  task_completion text,
  quizzes_usefulness text,
  impact_clarity smallint,
  impact_relevance smallint,
  impact_skill smallint,
  impact_knowledge smallint,
  course_rating smallint,
  trainer_rating smallint,
  organization_rating smallint,
  satisfaction_rating smallint,
  suggestions text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.internship_feedback TO authenticated;
GRANT ALL ON public.internship_feedback TO service_role;

ALTER TABLE public.internship_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers read feedback of own quizzes"
ON public.internship_feedback
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.id = internship_feedback.quiz_id
      AND (q.trainer_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::app_role))
  )
);

CREATE INDEX idx_internship_feedback_quiz ON public.internship_feedback(quiz_id);
CREATE INDEX idx_internship_feedback_batch ON public.internship_feedback(batch_id);