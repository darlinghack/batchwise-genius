import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Difficulty = "easy" | "medium" | "hard";

interface QuestionRow {
  question_text: string;
  options: unknown;
  correct_index: number;
  explanation: string;
  difficulty: Difficulty;
}

const CloneInput = z.object({
  sourceId: z.string().uuid(),
  batchId: z.string().uuid(),
  topicId: z.string().uuid().nullish(),
  title: z.string().trim().max(200).optional(),
});

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

async function assertBatchOwned(batchId: string, userId: string) {
  const { data: batch } = await supabaseAdmin
    .from("batches")
    .select("id, trainer_id")
    .eq("id", batchId)
    .maybeSingle();
  if (!batch) throw new Error("Target batch not found.");
  if (batch.trainer_id !== userId) throw new Error("You can only clone into your own batches.");
}

/** Clone a template into a batch as a brand-new, fully isolated quiz instance. */
export const cloneTemplateToBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CloneInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    await assertBatchOwned(data.batchId, userId);

    const { data: tpl } = await supabaseAdmin
      .from("quiz_templates")
      .select("*")
      .eq("id", data.sourceId)
      .maybeSingle();
    if (!tpl) throw new Error("Template not found.");

    const { data: tq } = await supabaseAdmin
      .from("template_questions")
      .select("question_text, options, correct_index, explanation, difficulty")
      .eq("template_id", data.sourceId)
      .order("position", { ascending: true });
    const questions = (tq ?? []) as QuestionRow[];

    const { data: quiz, error: ce } = await supabaseAdmin
      .from("quizzes")
      .insert({
        trainer_id: userId,
        batch_id: data.batchId,
        topic_id: data.topicId ?? null,
        title: data.title?.trim() || tpl.title,
        topic_name: tpl.topic_name,
        type: tpl.type,
        difficulty: tpl.difficulty,
        num_questions: questions.length,
        duration_minutes: tpl.duration_minutes,
        status: "draft",
        source_template_id: tpl.id,
      })
      .select("id")
      .single();
    if (ce || !quiz) throw new Error(ce?.message ?? "Failed to clone template");

    if (questions.length) {
      const { error: ie } = await supabaseAdmin.from("questions").insert(toQuizRows(questions, quiz.id));
      if (ie) throw new Error(ie.message);
    }
    return { quizId: quiz.id };
  });

/** Clone an existing quiz directly into another batch (separate submissions/results). */
export const cloneQuizToBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CloneInput.parse(d))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    await assertBatchOwned(data.batchId, userId);

    const { data: src } = await supabaseAdmin
      .from("quizzes")
      .select("*")
      .eq("id", data.sourceId)
      .maybeSingle();
    if (!src) throw new Error("Quiz not found.");

    const { data: qs } = await supabaseAdmin
      .from("questions")
      .select("question_text, options, correct_index, explanation, difficulty")
      .eq("quiz_id", data.sourceId)
      .order("position", { ascending: true });
    const questions = (qs ?? []) as QuestionRow[];

    const { data: quiz, error: ce } = await supabaseAdmin
      .from("quizzes")
      .insert({
        trainer_id: userId,
        batch_id: data.batchId,
        topic_id: data.topicId ?? null,
        title: data.title?.trim() || src.title,
        topic_name: src.topic_name,
        type: src.type,
        difficulty: src.difficulty,
        num_questions: questions.length,
        duration_minutes: src.duration_minutes,
        status: "draft",
        cloned_from_quiz_id: src.id,
      })
      .select("id")
      .single();
    if (ce || !quiz) throw new Error(ce?.message ?? "Failed to clone quiz");

    if (questions.length) {
      const { error: ie } = await supabaseAdmin.from("questions").insert(toQuizRows(questions, quiz.id));
      if (ie) throw new Error(ie.message);
    }
    return { quizId: quiz.id };
  });
