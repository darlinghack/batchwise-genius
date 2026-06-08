import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { chatJSON } from "./ai.server";

export interface GeneratedQuestion {
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
}

const GenerateInput = z.object({
  topicName: z.string().min(1).max(200),
  difficulty: z.enum(["easy", "medium", "hard"]),
  count: z.number().int().min(1).max(30),
  topics: z.array(z.string().min(1).max(200)).max(20).optional(),
  instructions: z.string().max(2000).optional(),
});

export const generateQuizQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GenerateInput.parse(d))
  .handler(async ({ data }): Promise<{ questions: GeneratedQuestion[] }> => {
    const scope = data.topics?.length
      ? `covering these topics in a balanced way: ${data.topics.join(", ")}`
      : `on the topic "${data.topicName}"`;

    const extra = data.instructions?.trim()
      ? `\nIMPORTANT — follow these additional instructions from the trainer closely (they may specify exact subtopics, sample questions, focus areas, or style). If they include specific questions, base the quiz on them: """${data.instructions.trim()}"""`
      : "";

    const system =
      "You are an expert technical trainer creating multiple-choice quiz questions for internship and training programs. " +
      "Always respond with strict JSON only.";
    const user = `Create exactly ${data.count} ${data.difficulty} multiple-choice questions ${scope}.
Return JSON shaped exactly as:
{"questions":[{"question_text":"...","options":["A","B","C","D"],"correct_index":0,"explanation":"why this is correct","difficulty":"${data.difficulty}"}]}
Rules: exactly 4 options each; correct_index is 0-3; explanation is 1-2 sentences; questions must be accurate and unambiguous; avoid duplicates.${extra}`;

    const raw = (await chatJSON({ system, user })) as { questions?: GeneratedQuestion[] };
    const questions = (raw.questions ?? [])
      .filter((q) => Array.isArray(q.options) && q.options.length === 4)
      .map((q) => ({
        question_text: String(q.question_text ?? "").slice(0, 1000),
        options: q.options.map((o) => String(o).slice(0, 400)),
        correct_index: Math.min(3, Math.max(0, Number(q.correct_index) || 0)),
        explanation: String(q.explanation ?? "").slice(0, 1000),
        difficulty: data.difficulty,
      }));
    if (!questions.length) throw new Error("AI did not return any questions. Please retry.");
    return { questions };
  });

// ---- Public student-facing functions (no auth) ----

export const getPublicQuiz = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ code: z.string().min(1).max(40) }).parse(d))
  .handler(async ({ data }) => {
    const { data: quiz } = await supabaseAdmin
      .from("quizzes")
      .select("id, title, topic_name, type, difficulty, duration_minutes, status, num_questions")
      .eq("share_code", data.code)
      .maybeSingle();

    if (!quiz) return { quiz: null, questions: [], reason: "not_found" as const };
    if (quiz.status !== "published")
      return { quiz: null, questions: [], reason: quiz.status === "closed" ? ("closed" as const) : ("draft" as const) };

    const { data: questions } = await supabaseAdmin
      .from("questions")
      .select("id, question_text, options, position")
      .eq("quiz_id", quiz.id)
      .order("position", { ascending: true });

    // Jumble question order so each student sees a different sequence.
    const shuffled = [...(questions ?? [])];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return {
      quiz,
      questions: shuffled.map((q) => ({
        id: q.id,
        question_text: q.question_text,
        options: q.options as string[],
      })),
      reason: "ok" as const,
    };
  });

const SubmitInput = z.object({
  code: z.string().min(1).max(40),
  fullName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(160),
  rollNumber: z.string().trim().max(60).optional().default(""),
  collegeName: z.string().trim().max(160).optional().default(""),
  answers: z.array(z.object({ questionId: z.string().uuid(), selected: z.number().int().min(-1).max(3) })).max(50),
  timeTakenSeconds: z.number().int().min(0).max(100000),
});

export const submitQuiz = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SubmitInput.parse(d))
  .handler(async ({ data }) => {
    const { data: quiz } = await supabaseAdmin
      .from("quizzes")
      .select("id, title, status")
      .eq("share_code", data.code)
      .maybeSingle();
    if (!quiz || quiz.status !== "published") throw new Error("This quiz is not available.");

    const { data: questions } = await supabaseAdmin
      .from("questions")
      .select("id, question_text, options, correct_index, explanation")
      .eq("quiz_id", quiz.id)
      .order("position", { ascending: true });
    const qList = questions ?? [];

    const answerMap = new Map(data.answers.map((a) => [a.questionId, a.selected]));
    let score = 0;
    const review = qList.map((q) => {
      const selected = answerMap.get(q.id) ?? -1;
      const correct = selected === q.correct_index;
      if (correct) score += 1;
      return {
        question_text: q.question_text,
        options: q.options as string[],
        selected,
        correct_index: q.correct_index,
        correct,
        explanation: q.explanation,
      };
    });

    const total = qList.length;
    const percentage = total ? Math.round((score / total) * 1000) / 10 : 0;
    const points = 10 + (percentage >= 80 ? 20 : 0);

    const { data: inserted } = await supabaseAdmin
      .from("submissions")
      .insert({
        quiz_id: quiz.id,
        student_name: data.fullName,
        student_email: data.email,
        roll_number: data.rollNumber,
        college_name: data.collegeName,
        answers: data.answers,
        score,
        total,
        percentage,
        time_taken_seconds: data.timeTakenSeconds,
        points,
      })
      .select("id")
      .single();

    // AI performance summary (best-effort)
    let summary = "";
    try {
      const wrong = review.filter((r) => !r.correct).map((r) => r.question_text);
      const raw = (await chatJSON({
        system: "You are an encouraging tutor. Respond in strict JSON: {\"summary\":\"...\"}",
        user: `A student scored ${score}/${total} (${percentage}%) on a quiz titled "${quiz.title}". They missed: ${wrong.slice(0, 6).join("; ") || "none"}. Write a concise 2-sentence performance summary with one improvement tip.`,
      })) as { summary?: string };
      summary = String(raw.summary ?? "").slice(0, 600);
    } catch {
      summary = `You scored ${percentage}%. Keep practicing the topics you missed to improve next time.`;
    }

    return {
      submissionId: inserted?.id ?? null,
      score,
      total,
      percentage,
      points,
      timeTakenSeconds: data.timeTakenSeconds,
      review,
      summary,
    };
  });

export const deleteQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ quizId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: quiz } = await supabaseAdmin
      .from("quizzes")
      .select("id, trainer_id")
      .eq("id", data.quizId)
      .maybeSingle();
    if (!quiz) throw new Error("Quiz not found.");

    await supabaseAdmin.from("submissions").delete().eq("quiz_id", data.quizId);
    await supabaseAdmin.from("questions").delete().eq("quiz_id", data.quizId);
    await supabaseAdmin.from("quizzes").delete().eq("id", data.quizId);
    return { success: true };
  });

// ---- Trainer AI insight ----
export const getBatchInsight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ context: z.string().min(1).max(4000) }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const raw = (await chatJSON({
        system: "You are an analytics assistant for a training company. Respond in strict JSON: {\"insight\":\"...\"}",
        user: `Based on this quiz performance data, write a 2-3 sentence actionable insight for the trainer (mention strong and weak topics, and a recommendation):\n${data.context}`,
      })) as { insight?: string };
      return { insight: String(raw.insight ?? "").slice(0, 800) };
    } catch (e) {
      return { insight: "", error: e instanceof Error ? e.message : "AI unavailable" };
    }
  });