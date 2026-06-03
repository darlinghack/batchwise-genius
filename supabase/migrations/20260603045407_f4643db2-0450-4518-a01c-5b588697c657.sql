-- Quiz Template Library
create table public.quiz_templates (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  topic_name text not null default '',
  type quiz_type not null default 'daily',
  difficulty quiz_difficulty not null default 'medium',
  num_questions int not null default 0,
  duration_minutes int not null default 15,
  source_quiz_id uuid references public.quizzes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.quiz_templates to authenticated;
grant all on public.quiz_templates to service_role;
alter table public.quiz_templates enable row level security;
create policy "Trainers manage own templates" on public.quiz_templates for all to authenticated
  using (trainer_id = auth.uid() or public.has_role(auth.uid(), 'super_admin'))
  with check (trainer_id = auth.uid() or public.has_role(auth.uid(), 'super_admin'));
create trigger quiz_templates_updated before update on public.quiz_templates for each row execute function public.set_updated_at();

create table public.template_questions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.quiz_templates(id) on delete cascade,
  question_text text not null,
  options jsonb not null default '[]'::jsonb,
  correct_index int not null default 0,
  explanation text not null default '',
  difficulty quiz_difficulty not null default 'medium',
  position int not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.template_questions to authenticated;
grant all on public.template_questions to service_role;
alter table public.template_questions enable row level security;
create policy "Trainers manage template questions of own templates" on public.template_questions for all to authenticated
  using (exists (select 1 from public.quiz_templates t where t.id = template_questions.template_id and (t.trainer_id = auth.uid() or public.has_role(auth.uid(), 'super_admin'))))
  with check (exists (select 1 from public.quiz_templates t where t.id = template_questions.template_id and (t.trainer_id = auth.uid() or public.has_role(auth.uid(), 'super_admin'))));
create index idx_template_questions_template on public.template_questions(template_id);

-- Lineage on quizzes (each clone stays a fully independent quiz instance)
alter table public.quizzes add column source_template_id uuid references public.quiz_templates(id) on delete set null;
alter table public.quizzes add column cloned_from_quiz_id uuid references public.quizzes(id) on delete set null;