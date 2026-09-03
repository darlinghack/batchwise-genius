import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
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
      .select("id, title, topic_name, type, difficulty, duration_minutes, status, num_questions, is_assessment, hide_results, feedback_form, batch_id")
      .eq("share_code", data.code)
      .maybeSingle();


    if (!quiz) return { quiz: null, questions: [], feedbackForm: null, reason: "not_found" as const };
    if (quiz.status !== "published")
      return {
        quiz: null,
        questions: [],
        feedbackForm: null,
        reason: quiz.status === "closed" ? ("closed" as const) : ("draft" as const),
      };

    // Feedback form: quiz-level override → batch default → null (built-in default form).
    let feedbackForm: Json | null = quiz.feedback_form ?? null;
    if (!feedbackForm && quiz.batch_id) {
      const { data: batch } = await supabaseAdmin
        .from("batches")
        .select("feedback_form")
        .eq("id", quiz.batch_id)
        .maybeSingle();
      feedbackForm = batch?.feedback_form ?? null;
    }

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
      feedbackForm,
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
  phone: z.string().trim().max(40).optional().default(""),
  address: z.string().trim().max(300).optional().default(""),
  rollNumber: z.string().trim().max(60).optional().default(""),
  collegeName: z.string().trim().max(160).optional().default(""),

  answers: z.array(z.object({ questionId: z.string().uuid(), selected: z.number().int().min(-1).max(3) })).max(50),
  timeTakenSeconds: z.number().int().min(0).max(100000),
  feedbackRating: z.number().int().min(1).max(5).optional(),
  feedbackText: z.string().trim().max(1000).optional().default(""),
  internshipFeedback: z
    .object({
      section: z.string().trim().max(20).optional(),
      facultyClarity: z.number().int().min(1).max(4).optional(),
      facultyEngagement: z.number().int().min(1).max(4).optional(),
      facultyExpertise: z.number().int().min(1).max(4).optional(),
      facultyAnswering: z.number().int().min(1).max(4).optional(),
      teachingPace: z.string().trim().max(40).optional(),
      resourcesUsefulness: z.string().trim().max(40).optional(),
      taskCompletion: z.string().trim().max(60).optional(),
      quizzesUsefulness: z.string().trim().max(40).optional(),
      impactClarity: z.number().int().min(1).max(4).optional(),
      impactRelevance: z.number().int().min(1).max(4).optional(),
      impactSkill: z.number().int().min(1).max(4).optional(),
      impactKnowledge: z.number().int().min(1).max(4).optional(),
      courseRating: z.number().int().min(1).max(5).optional(),
      trainerRating: z.number().int().min(1).max(5).optional(),
      organizationRating: z.number().int().min(1).max(5).optional(),
      satisfactionRating: z.number().int().min(1).max(5).optional(),
      suggestions: z.string().trim().max(2000).optional(),
      customAnswers: z.record(z.string().max(80), z.union([z.string().max(2000), z.number()])).optional(),
    })
    .optional(),
});

export const submitQuiz = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SubmitInput.parse(d))
  .handler(async ({ data }) => {
    const { data: quiz } = await supabaseAdmin
      .from("quizzes")
      .select("id, title, status, batch_id, hide_results")
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
        phone: data.phone,
        address: data.address,
        roll_number: data.rollNumber,
        college_name: data.collegeName,

        answers: data.answers,
        score,
        total,
        percentage,
        time_taken_seconds: data.timeTakenSeconds,
        points,
        feedback_rating: data.feedbackRating ?? null,
        feedback_text: data.feedbackText ?? "",
      })
      .select("id")
      .single();

    // Overall internship feedback (best-effort; only if any field was filled).
    const fb = data.internshipFeedback;
    if (fb) {
      const hasAny = Object.values(fb).some(
        (v) =>
          (typeof v === "number" && v > 0) ||
          (typeof v === "string" && v.trim().length > 0) ||
          (v && typeof v === "object" && Object.keys(v).length > 0),
      );
      if (hasAny) {
        await supabaseAdmin.from("internship_feedback").insert({
          quiz_id: quiz.id,
          batch_id: quiz.batch_id ?? null,
          student_name: data.fullName,
          student_email: data.email,
          section: fb.section ?? null,
          faculty_clarity: fb.facultyClarity ?? null,
          faculty_engagement: fb.facultyEngagement ?? null,
          faculty_expertise: fb.facultyExpertise ?? null,
          faculty_answering: fb.facultyAnswering ?? null,
          teaching_pace: fb.teachingPace ?? null,
          resources_usefulness: fb.resourcesUsefulness ?? null,
          task_completion: fb.taskCompletion ?? null,
          quizzes_usefulness: fb.quizzesUsefulness ?? null,
          impact_clarity: fb.impactClarity ?? null,
          impact_relevance: fb.impactRelevance ?? null,
          impact_skill: fb.impactSkill ?? null,
          impact_knowledge: fb.impactKnowledge ?? null,
          course_rating: fb.courseRating ?? null,
          trainer_rating: fb.trainerRating ?? null,
          organization_rating: fb.organizationRating ?? null,
          satisfaction_rating: fb.satisfactionRating ?? null,
          suggestions: fb.suggestions ?? "",
          custom_answers: fb.customAnswers ?? {},
        });
      }
    }

    // Assessments hide every scoring detail from the candidate.
    if (quiz.hide_results) {
      return {
        submissionId: inserted?.id ?? null,
        hidden: true as const,
        score: 0,
        total,
        percentage: 0,
        points: 0,
        timeTakenSeconds: data.timeTakenSeconds,
        review: [] as typeof review,
        summary: "",
      };
    }

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
      hidden: false as const,
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
  .handler(async ({ data, context }) => {
    const { data: quiz } = await supabaseAdmin
      .from("quizzes")
      .select("id, trainer_id")
      .eq("id", data.quizId)
      .maybeSingle();
    if (!quiz) throw new Error("Quiz not found.");

    // Authorization: only the owning trainer (or a super_admin) may delete.
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isSuperAdmin = (roles ?? []).some((r) => r.role === "super_admin");
    if (quiz.trainer_id !== context.userId && !isSuperAdmin) {
      throw new Error("You do not have permission to delete this quiz.");
    }

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
// ---- Batch insight report (prompt-driven) ----
const BatchReportInput = z.object({
  batchId: z.string().uuid(),
  prompt: z.string().trim().max(1000).optional().default(""),
});

export interface BatchInsightReport {
  headline: string;
  answer: string;
  keyFindings: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  topPerformers: { name: string; avg: number; attempts: number }[];
  weakTopics: { topic: string; accuracy: number; questions: number }[];
  weakQuestions: { question: string; accuracy: number; quiz: string }[];
  stats: { quizzes: number; attempts: number; students: number; avg: number; passRate: number };
  generatedAt: string;
  batchName: string;
}

export const getBatchInsightReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => BatchReportInput.parse(d))
  .handler(async ({ data, context }): Promise<BatchInsightReport> => {
    const { data: batch } = await supabaseAdmin
      .from("batches")
      .select("id, name, course_name, trainer_id")
      .eq("id", data.batchId)
      .maybeSingle();
    if (!batch) throw new Error("Batch not found.");

    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId);
    const isSuperAdmin = (roles ?? []).some((r) => r.role === "super_admin");
    if (batch.trainer_id !== context.userId && !isSuperAdmin) {
      throw new Error("You do not have permission to view this batch.");
    }

    const { data: quizzes } = await supabaseAdmin
      .from("quizzes")
      .select("id, title, topic_name, difficulty, status")
      .eq("batch_id", data.batchId);
    const quizList = quizzes ?? [];
    const quizIds = quizList.map((q) => q.id);

    let subs: { quiz_id: string; student_name: string; student_email: string; percentage: number; answers: unknown }[] = [];
    let questions: { id: string; quiz_id: string; question_text: string; correct_index: number }[] = [];
    if (quizIds.length) {
      const { data: s } = await supabaseAdmin
        .from("submissions")
        .select("quiz_id, student_name, student_email, percentage, answers")
        .in("quiz_id", quizIds);
      subs = (s as typeof subs) ?? [];
      const { data: q } = await supabaseAdmin
        .from("questions")
        .select("id, quiz_id, question_text, correct_index")
        .in("quiz_id", quizIds);
      questions = (q as typeof questions) ?? [];
    }

    const attempts = subs.length;
    const avg = attempts ? Math.round(subs.reduce((a, s) => a + Number(s.percentage), 0) / attempts) : 0;
    const passRate = attempts
      ? Math.round((subs.filter((s) => Number(s.percentage) >= 60).length / attempts) * 100)
      : 0;

    // students
    const byStudent = new Map<string, { name: string; total: number; count: number }>();
    subs.forEach((s) => {
      const key = (s.student_email || s.student_name || "").toLowerCase();
      const cur = byStudent.get(key) ?? { name: s.student_name, total: 0, count: 0 };
      cur.total += Number(s.percentage);
      cur.count += 1;
      byStudent.set(key, cur);
    });
    const ranked = [...byStudent.values()]
      .map((s) => ({ name: s.name, avg: Math.round(s.total / s.count), attempts: s.count }))
      .sort((a, b) => b.avg - a.avg);
    const topPerformers = ranked.slice(0, 10);
    const strugglers = [...ranked].reverse().slice(0, 5);

    // question-level accuracy
    const qMap = new Map(questions.map((q) => [q.id, q]));
    const qStats = new Map<string, { correct: number; total: number }>();
    subs.forEach((s) => {
      const ans = Array.isArray(s.answers) ? (s.answers as { questionId?: string; selected?: number }[]) : [];
      ans.forEach((a) => {
        if (!a?.questionId) return;
        const q = qMap.get(a.questionId);
        if (!q) return;
        const cur = qStats.get(a.questionId) ?? { correct: 0, total: 0 };
        cur.total += 1;
        if (Number(a.selected) === q.correct_index) cur.correct += 1;
        qStats.set(a.questionId, cur);
      });
    });

    const quizTitle = new Map(quizList.map((q) => [q.id, q.title]));
    const quizTopic = new Map(quizList.map((q) => [q.id, q.topic_name || q.title]));

    const weakQuestions = [...qStats.entries()]
      .map(([id, v]) => {
        const q = qMap.get(id)!;
        return {
          question: q.question_text.slice(0, 180),
          accuracy: Math.round((v.correct / Math.max(1, v.total)) * 100),
          quiz: quizTitle.get(q.quiz_id) ?? "",
        };
      })
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 10);

    const topicAgg = new Map<string, { correct: number; total: number; questions: Set<string> }>();
    [...qStats.entries()].forEach(([id, v]) => {
      const q = qMap.get(id)!;
      const topic = quizTopic.get(q.quiz_id) ?? "General";
      const cur = topicAgg.get(topic) ?? { correct: 0, total: 0, questions: new Set<string>() };
      cur.correct += v.correct;
      cur.total += v.total;
      cur.questions.add(id);
      topicAgg.set(topic, cur);
    });
    const topicStats = [...topicAgg.entries()]
      .map(([topic, v]) => ({
        topic,
        accuracy: Math.round((v.correct / Math.max(1, v.total)) * 100),
        questions: v.questions.size,
      }))
      .sort((a, b) => a.accuracy - b.accuracy);
    const weakTopics = topicStats.slice(0, 8);

    const perQuiz = quizList.map((q) => {
      const qs = subs.filter((s) => s.quiz_id === q.id);
      return {
        title: q.title,
        topic: q.topic_name,
        attempts: qs.length,
        avg: qs.length ? Math.round(qs.reduce((x, s) => x + Number(s.percentage), 0) / qs.length) : 0,
      };
    });

    const factSheet = `Batch: "${batch.name}" (course: ${batch.course_name})
Quizzes: ${quizList.length}; Submissions: ${attempts}; Unique students: ${ranked.length}; Average score: ${avg}%; Pass rate (>=60%): ${passRate}%
Per-quiz: ${perQuiz.map((p) => `${p.title} [topic: ${p.topic}] attempts=${p.attempts} avg=${p.avg}%`).join(" | ") || "none"}
Top students (avg%): ${topPerformers.map((t) => `${t.name}=${t.avg}% over ${t.attempts} quizzes`).join(", ") || "none"}
Lowest students (avg%): ${strugglers.map((t) => `${t.name}=${t.avg}%`).join(", ") || "none"}
Topic accuracy (weakest first): ${topicStats.map((t) => `${t.topic}=${t.accuracy}%`).join(", ") || "none"}
Hardest questions: ${weakQuestions.map((q) => `"${q.question}" (${q.accuracy}% correct, quiz: ${q.quiz})`).join(" | ") || "none"}`;

    const ask = data.prompt?.trim()
      ? `The trainer asks: """${data.prompt.trim()}""" — answer it directly and specifically using the data (name students and topics where relevant).`
      : `No specific question was asked — give a complete performance overview of the batch.`;

    let parsed: Partial<BatchInsightReport> = {};
    try {
      parsed = (await chatJSON({
        system:
          "You are a senior learning analytics consultant for an EdTech training company. Use ONLY the provided data; never invent names or numbers. Respond in strict JSON.",
        user: `${ask}

DATA:
${factSheet}

Respond with JSON exactly shaped as:
{"headline":"one short title","answer":"3-6 sentence direct answer to the trainer's question, citing names/topics/percentages","keyFindings":["..."],"strengths":["..."],"weaknesses":["..."],"recommendations":["actionable step",...]}
Each array should have 2-5 concise items.`,
      })) as Partial<BatchInsightReport>;
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : "AI unavailable");
    }

    const arr = (v: unknown) =>
      Array.isArray(v) ? v.map((x) => String(x).slice(0, 400)).filter(Boolean).slice(0, 6) : [];

    return {
      headline: String(parsed.headline ?? "Batch performance insights").slice(0, 160),
      answer: String(parsed.answer ?? "").slice(0, 2000),
      keyFindings: arr(parsed.keyFindings),
      strengths: arr(parsed.strengths),
      weaknesses: arr(parsed.weaknesses),
      recommendations: arr(parsed.recommendations),
      topPerformers,
      weakTopics,
      weakQuestions: weakQuestions.slice(0, 6),
      stats: { quizzes: quizList.length, attempts, students: ranked.length, avg, passRate },
      generatedAt: new Date().toISOString(),
      batchName: batch.name,
    };
  });
