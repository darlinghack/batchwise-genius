-- Roles enum
create type public.app_role as enum ('super_admin', 'trainer');
create type public.batch_status as enum ('upcoming', 'active', 'completed');
create type public.quiz_type as enum ('daily', 'weekend');
create type public.quiz_difficulty as enum ('easy', 'medium', 'hard');
create type public.quiz_status as enum ('draft', 'published', 'closed');
create type public.topic_status as enum ('planned', 'completed');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Profiles readable by authenticated" on public.profiles for select to authenticated using (true);
create policy "Users update own profile" on public.profiles for update to authenticated using (id = auth.uid());
create policy "Users insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid());

-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null default 'trainer',
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Handle new user trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), coalesce(new.email, ''));
  insert into public.user_roles (user_id, role) values (new.id, 'trainer');
  return new;
end;
$$;
create trigger on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_user();

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- Batches
create table public.batches (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  course_name text not null,
  trainer_name text not null default '',
  start_date date,
  end_date date,
  status batch_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.batches to authenticated;
grant all on public.batches to service_role;
alter table public.batches enable row level security;
create policy "Trainers manage own batches" on public.batches for all to authenticated
  using (trainer_id = auth.uid() or public.has_role(auth.uid(), 'super_admin'))
  with check (trainer_id = auth.uid() or public.has_role(auth.uid(), 'super_admin'));
create trigger batches_updated before update on public.batches for each row execute function public.set_updated_at();

-- Topics
create table public.topics (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id) on delete cascade,
  day_number int not null default 1,
  title text not null,
  status topic_status not null default 'planned',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.topics to authenticated;
grant all on public.topics to service_role;
alter table public.topics enable row level security;
create policy "Trainers manage topics of own batches" on public.topics for all to authenticated
  using (exists (select 1 from public.batches b where b.id = topics.batch_id and (b.trainer_id = auth.uid() or public.has_role(auth.uid(), 'super_admin'))))
  with check (exists (select 1 from public.batches b where b.id = topics.batch_id and (b.trainer_id = auth.uid() or public.has_role(auth.uid(), 'super_admin'))));

-- Quizzes
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  batch_id uuid references public.batches(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  title text not null,
  topic_name text not null default '',
  type quiz_type not null default 'daily',
  difficulty quiz_difficulty not null default 'medium',
  num_questions int not null default 10,
  duration_minutes int not null default 15,
  status quiz_status not null default 'draft',
  share_code text not null unique default substr(replace(gen_random_uuid()::text,'-',''),1,8),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.quizzes to authenticated;
grant select on public.quizzes to anon;
grant all on public.quizzes to service_role;
alter table public.quizzes enable row level security;
create policy "Trainers manage own quizzes" on public.quizzes for all to authenticated
  using (trainer_id = auth.uid() or public.has_role(auth.uid(), 'super_admin'))
  with check (trainer_id = auth.uid() or public.has_role(auth.uid(), 'super_admin'));
create policy "Anyone can read published quizzes" on public.quizzes for select to anon, authenticated using (status = 'published');
create trigger quizzes_updated before update on public.quizzes for each row execute function public.set_updated_at();

-- Questions
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question_text text not null,
  options jsonb not null default '[]'::jsonb,
  correct_index int not null default 0,
  explanation text not null default '',
  difficulty quiz_difficulty not null default 'medium',
  position int not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.questions to authenticated;
grant all on public.questions to service_role;
alter table public.questions enable row level security;
create policy "Trainers manage questions of own quizzes" on public.questions for all to authenticated
  using (exists (select 1 from public.quizzes q where q.id = questions.quiz_id and (q.trainer_id = auth.uid() or public.has_role(auth.uid(), 'super_admin'))))
  with check (exists (select 1 from public.quizzes q where q.id = questions.quiz_id and (q.trainer_id = auth.uid() or public.has_role(auth.uid(), 'super_admin'))));

-- Submissions
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  student_name text not null,
  student_email text not null,
  roll_number text not null default '',
  college_name text not null default '',
  answers jsonb not null default '[]'::jsonb,
  score int not null default 0,
  total int not null default 0,
  percentage numeric not null default 0,
  time_taken_seconds int not null default 0,
  points int not null default 0,
  submitted_at timestamptz not null default now()
);
grant select, insert, update, delete on public.submissions to authenticated;
grant all on public.submissions to service_role;
alter table public.submissions enable row level security;
create policy "Trainers read submissions of own quizzes" on public.submissions for select to authenticated
  using (exists (select 1 from public.quizzes q where q.id = submissions.quiz_id and (q.trainer_id = auth.uid() or public.has_role(auth.uid(), 'super_admin'))));

-- Realtime
alter table public.submissions replica identity full;
alter publication supabase_realtime add table public.submissions;

create index idx_topics_batch on public.topics(batch_id);
create index idx_quizzes_batch on public.quizzes(batch_id);
create index idx_questions_quiz on public.questions(quiz_id);
create index idx_submissions_quiz on public.submissions(quiz_id);