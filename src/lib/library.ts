import { supabase } from "@/integrations/supabase/client";

type Difficulty = "easy" | "medium" | "hard";

interface QuestionRow {
  question_text: string;
  options: unknown;
  correct_index: number;
  explanation: string;
  difficulty: Difficulty;
}

function toTemplateRows(rows: QuestionRow[], templateId: string) {
  return rows.map((q, i) => ({
    template_id: templateId,
    question_text: q.question_text,
    options: q.options as never,
    correct_index: q.correct_index,
    explanation: q.explanation,
    difficulty: q.difficulty,
    position: i,
  }));
}

function toQuizRows(rows: QuestionRow[], quizId: string) {
  return rows.map((q, i) => ({
    quiz_id: quizId,
    question_text: q.question_text,
    options: q.options as never,
    correct_index: q.correct_index,
    explanation: q.explanation,
    difficulty: q.difficulty,
    position: i,
  }));
}

/** Save an existing quiz (and its question set) as a reusable template. */
export async function saveQuizAsTemplate(quizId: string, trainerId: string): Promise<string> {
  const { data: quiz, error: qe } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .single();
  if (qe || !quiz) throw new Error(qe?.message ?? "Quiz not found");

  const { data: questions, error: qqe } = await supabase
    .from("questions")
    .select("question_text, options, correct_index, explanation, difficulty")
    .eq("quiz_id", quizId)
    .order("position", { ascending: true });
  if (qqe) throw new Error(qqe.message);

  const { data: tpl, error: te } = await supabase
    .from("quiz_templates")
    .insert({
      trainer_id: trainerId,
      title: quiz.title,
      topic_name: quiz.topic_name,
      type: quiz.type,
      difficulty: quiz.difficulty,
      num_questions: questions?.length ?? 0,
      duration_minutes: quiz.duration_minutes,
      source_quiz_id: quiz.id,
    })
    .select("id")
    .single();
  if (te || !tpl) throw new Error(te?.message ?? "Failed to create template");

  if (questions?.length) {
    const rows = toTemplateRows(questions as QuestionRow[], tpl.id);
    const { error: ie } = await supabase.from("template_questions").insert(rows);
    if (ie) throw new Error(ie.message);
  }
  return tpl.id;
}

interface CloneTarget {
  trainerId: string;
  batchId: string;
  topicId?: string | null;
  title?: string;
}

/** Clone a template into a batch as a brand-new, fully isolated quiz instance. */
export async function cloneTemplateToBatch(templateId: string, target: CloneTarget): Promise<string> {
  const { data: tpl, error: te } = await supabase
    .from("quiz_templates")
    .select("*")
    .eq("id", templateId)
    .single();
  if (te || !tpl) throw new Error(te?.message ?? "Template not found");

  const { data: tq, error: tqe } = await supabase
    .from("template_questions")
    .select("question_text, options, correct_index, explanation, difficulty")
    .eq("template_id", templateId)
    .order("position", { ascending: true });
  if (tqe) throw new Error(tqe.message);

  const { data: quiz, error: ce } = await supabase
    .from("quizzes")
    .insert({
      trainer_id: target.trainerId,
      batch_id: target.batchId,
      topic_id: target.topicId ?? null,
      title: target.title?.trim() || tpl.title,
      topic_name: tpl.topic_name,
      type: tpl.type,
      difficulty: tpl.difficulty,
      num_questions: tq?.length ?? 0,
      duration_minutes: tpl.duration_minutes,
      status: "draft",
      source_template_id: tpl.id,
    })
    .select("id")
    .single();
  if (ce || !quiz) throw new Error(ce?.message ?? "Failed to clone template");

  if (tq?.length) {
    const rows = toQuizRows(tq as QuestionRow[], quiz.id);
    const { error: ie } = await supabase.from("questions").insert(rows);
    if (ie) throw new Error(ie.message);
  }
  return quiz.id;
}

/** Clone an existing quiz directly into another batch (separate submissions/results). */
export async function cloneQuizToBatch(quizId: string, target: CloneTarget): Promise<string> {
  const { data: src, error: se } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .single();
  if (se || !src) throw new Error(se?.message ?? "Quiz not found");

  const { data: questions, error: qe } = await supabase
    .from("questions")
    .select("question_text, options, correct_index, explanation, difficulty")
    .eq("quiz_id", quizId)
    .order("position", { ascending: true });
  if (qe) throw new Error(qe.message);

  const { data: quiz, error: ce } = await supabase
    .from("quizzes")
    .insert({
      trainer_id: target.trainerId,
      batch_id: target.batchId,
      topic_id: target.topicId ?? null,
      title: target.title?.trim() || src.title,
      topic_name: src.topic_name,
      type: src.type,
      difficulty: src.difficulty,
      num_questions: questions?.length ?? 0,
      duration_minutes: src.duration_minutes,
      status: "draft",
      cloned_from_quiz_id: src.id,
    })
    .select("id")
    .single();
  if (ce || !quiz) throw new Error(ce?.message ?? "Failed to clone quiz");

  if (questions?.length) {
    const rows = toQuizRows(questions as QuestionRow[], quiz.id);
    const { error: ie } = await supabase.from("questions").insert(rows);
    if (ie) throw new Error(ie.message);
  }
  return quiz.id;
}