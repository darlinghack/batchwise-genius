-- Allow all authenticated trainers to view templates (shared library)
CREATE POLICY "Templates readable by authenticated"
ON public.quiz_templates
FOR SELECT
TO authenticated
USING (true);

-- Allow all authenticated trainers to view template questions (needed to clone)
CREATE POLICY "Template questions readable by authenticated"
ON public.template_questions
FOR SELECT
TO authenticated
USING (true);