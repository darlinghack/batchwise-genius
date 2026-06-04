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
