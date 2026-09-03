import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Trophy,
  Send,
  TrendingUp,
  FileQuestion,
  ArrowRight,
  Star,
  MessageSquare,
  Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getBatchInsightReport, type BatchInsightReport } from "@/lib/quiz.functions";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { normalizeFeedbackForm } from "@/lib/feedback-form";



export const Route = createFileRoute("/dashboard/batches/$batchId/analytics")({
  head: () => ({ meta: [{ title: "Batch analytics — Datapro QuizHub" }] }),
  component: BatchAnalytics,
});

interface Feedback {
  section: string | null;
  faculty_clarity: number | null;
  faculty_engagement: number | null;
  faculty_expertise: number | null;
  faculty_answering: number | null;
  teaching_pace: string | null;
  resources_usefulness: string | null;
  task_completion: string | null;
  quizzes_usefulness: string | null;
  impact_clarity: number | null;
  impact_relevance: number | null;
  impact_skill: number | null;
  impact_knowledge: number | null;
  course_rating: number | null;
  trainer_rating: number | null;
  organization_rating: number | null;
  satisfaction_rating: number | null;
  suggestions: string | null;
  student_name: string | null;
  created_at: string;
  custom_answers: Record<string, string | number> | null;
}

function BatchAnalytics() {
  const { batchId } = Route.useParams();
  const reportFn = useServerFn(getBatchInsightReport);
  const [report, setReport] = useState<BatchInsightReport | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loadingInsight, setLoadingInsight] = useState(false);


  const { data, isLoading } = useQuery({
    queryKey: ["batch-analytics", batchId],
    queryFn: async () => {
      const { data: batch } = await supabase.from("batches").select("name, course_name, feedback_form").eq("id", batchId).maybeSingle();
      const { data: quizzes } = await supabase
        .from("quizzes")
        .select("id, title, status, type, feedback_form")
        .eq("batch_id", batchId)
        .order("created_at", { ascending: false });
      const quizIds = (quizzes ?? []).map((q) => q.id);
      let subs: { quiz_id: string; student_name: string; student_email: string; percentage: number }[] = [];
      let feedback: Feedback[] = [];
      if (quizIds.length) {
        const { data: s } = await supabase
          .from("submissions")
          .select("quiz_id, student_name, student_email, percentage")
          .in("quiz_id", quizIds);
        subs = (s as typeof subs) ?? [];
        const { data: f } = await supabase
          .from("internship_feedback")
          .select(
            "section, faculty_clarity, faculty_engagement, faculty_expertise, faculty_answering, teaching_pace, resources_usefulness, task_completion, quizzes_usefulness, impact_clarity, impact_relevance, impact_skill, impact_knowledge, course_rating, trainer_rating, organization_rating, satisfaction_rating, suggestions, student_name, created_at, custom_answers",
          )
          .in("quiz_id", quizIds)
          .order("created_at", { ascending: false });
        feedback = (f as unknown as Feedback[]) ?? [];
      }
      return { batch, quizzes: quizzes ?? [], subs, feedback };
    },
  });


  const batch = data?.batch;
  const quizzes = data?.quizzes ?? [];
  const subs = data?.subs ?? [];
  const feedback = data?.feedback ?? [];
  const attempts = subs.length;
  const avg = attempts ? Math.round(subs.reduce((a, s) => a + Number(s.percentage), 0) / attempts) : 0;
  const passed = subs.filter((s) => Number(s.percentage) >= 60).length;
  const passPct = attempts ? Math.round((passed / attempts) * 100) : 0;

  // per-quiz breakdown (each quiz stays its own distinct instance)
  const perQuiz = quizzes.map((q) => {
    const qs = subs.filter((s) => s.quiz_id === q.id);
    const a = qs.length ? Math.round(qs.reduce((x, s) => x + Number(s.percentage), 0) / qs.length) : 0;
    return { ...q, attempts: qs.length, avg: a };
  });
  const chart = perQuiz.filter((q) => q.attempts > 0).map((q) => ({ name: q.title.slice(0, 14), avg: q.avg }));

  // top students within this batch
  const byStudent = new Map<string, { name: string; total: number; count: number }>();
  subs.forEach((s) => {
    const key = s.student_email.toLowerCase();
    const cur = byStudent.get(key) ?? { name: s.student_name, total: 0, count: 0 };
    cur.total += Number(s.percentage);
    cur.count += 1;
    byStudent.set(key, cur);
  });
  const top = [...byStudent.values()]
    .map((s) => ({ name: s.name, avg: Math.round(s.total / s.count) }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);

  // ---- internship feedback aggregation ----
  const fbCount = feedback.length;
  const avgOf = (key: keyof Feedback) => {
    const vals = feedback.map((f) => f[key]).filter((v): v is number => typeof v === "number" && v > 0);
    return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0;
  };
  const overallRatings = [
    { label: "Course", value: avgOf("course_rating") },
    { label: "Trainer", value: avgOf("trainer_rating") },
    { label: "Organization", value: avgOf("organization_rating") },
    { label: "Satisfaction", value: avgOf("satisfaction_rating") },
  ];
  const facultyAvgs = [
    { label: "Clarity of concepts", value: avgOf("faculty_clarity") },
    { label: "Engagement", value: avgOf("faculty_engagement") },
    { label: "Expertise", value: avgOf("faculty_expertise") },
    { label: "Answering questions", value: avgOf("faculty_answering") },
  ];
  const impactAvgs = [
    { label: "Clarity of concepts", value: avgOf("impact_clarity") },
    { label: "Relevance", value: avgOf("impact_relevance") },
    { label: "Skill application", value: avgOf("impact_skill") },
    { label: "Knowledge improvement", value: avgOf("impact_knowledge") },
  ];
  const distOf = (key: keyof Feedback, opts: string[]) =>
    opts.map((opt) => ({ label: opt, count: feedback.filter((f) => f[key] === opt).length }));
  const paceDist = distOf("teaching_pace", ["Too Fast", "Just Right", "Too Slow"]);
  const resourcesDist = distOf("resources_usefulness", ["Very Useful", "Useful", "Slightly Useful", "Not Useful"]);
  const tasksDist = distOf("task_completion", ["Yes, all of them", "Most of them", "Some of them", "No, very few/none"]);
  const quizzesDist = distOf("quizzes_usefulness", ["Very Useful", "Useful", "Slightly Useful", "Not Useful"]);
  const comments = feedback.filter((f) => (f.suggestions ?? "").trim().length > 0);

  // ---- custom feedback questions (from quiz overrides + batch default) ----
  const customFields = (() => {
    const map = new Map<string, { id: string; label: string; type: string }>();
    const forms = [
      normalizeFeedbackForm(batch?.feedback_form ?? null),
      ...quizzes.map((q) => normalizeFeedbackForm((q as { feedback_form?: unknown }).feedback_form ?? null)),
    ];
    forms.forEach((f) => f.custom.forEach((c) => map.set(c.id, { id: c.id, label: c.label, type: c.type })));
    return [...map.values()];
  })();

  const customStats = customFields
    .map((f) => {
      const answers = feedback
        .map((fb) => fb.custom_answers?.[f.id])
        .filter((v): v is string | number => v !== undefined && v !== null && v !== "");
      if (!answers.length) return null;
      const nums = answers.filter((v): v is number => typeof v === "number");
      const texts = answers.filter((v): v is string => typeof v === "string");
      const counts = new Map<string, number>();
      texts.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1));
      return {
        ...f,
        responses: answers.length,
        avg: nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : 0,
        texts,
        dist: [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);


  async function generateInsight() {
    setPromptOpen(false);
    setLoadingInsight(true);
    try {
      const res = await reportFn({ data: { batchId, prompt } });
      setReport(res);
      setPrompt("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate insight");
    } finally {
      setLoadingInsight(false);
    }
  }

  function downloadInsight() {
    if (!report) return;
    const sections = [
      `${report.headline}\nBatch: ${report.batchName}\nGenerated: ${new Date(report.generatedAt).toLocaleString()}`,
      `Trainer question\n${prompt || "Complete batch performance overview"}`,
      `Answer\n${report.answer}`,
      `Key findings\n${report.keyFindings.map((x) => `• ${x}`).join("\n")}`,
      `Strengths\n${report.strengths.map((x) => `• ${x}`).join("\n")}`,
      `Areas to improve\n${report.weaknesses.map((x) => `• ${x}`).join("\n")}`,
      `Recommendations\n${report.recommendations.map((x) => `• ${x}`).join("\n")}`,
      `Top performers\n${report.topPerformers.map((x, i) => `${i + 1}. ${x.name} — ${x.avg}% average (${x.attempts} quizzes)`).join("\n")}`,
      `Weakest topics\n${report.weakTopics.map((x) => `• ${x.topic} — ${x.accuracy}% accuracy (${x.questions} questions)`).join("\n")}`,
      `Hardest questions\n${report.weakQuestions.map((x) => `• ${x.accuracy}% — ${x.question} (${x.quiz})`).join("\n")}`,
    ];
    const blob = new Blob([sections.join("\n\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${report.batchName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "batch"}-insights.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/dashboard/batches/$batchId" params={{ batchId }}><ArrowLeft className="h-4 w-4" /> Back to batch</Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{batch?.name ?? "Batch"} · Analytics</h1>
        <p className="text-sm text-muted-foreground">Performance across all quizzes in this batch. Open any quiz for its isolated results.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Quizzes" value={quizzes.length} icon={FileQuestion} />
        <StatCard label="Submissions" value={attempts} icon={Send} accent="chart-3" />
        <StatCard label="Average Score" value={`${avg}%`} icon={TrendingUp} accent="success" />
        <StatCard label="Pass Rate" value={`${passPct}%`} icon={Trophy} accent="warning" />
      </div>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-primary" /> AI Insights</h2>
            <p className="mt-1 text-sm text-muted-foreground">Ask a specific question about performance, topics, or students.</p>
          </div>
          <div className="flex items-center gap-2">
            {report && <Button size="sm" variant="outline" onClick={downloadInsight}><Download className="h-4 w-4" /> Download</Button>}
            <Button size="sm" onClick={() => setPromptOpen(true)} disabled={loadingInsight || !attempts} className="bg-gradient-primary hover:opacity-90">
              {loadingInsight ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate
            </Button>
          </div>
        </div>
        {report ? (
          <div className="space-y-5">
            <div className="rounded-lg bg-accent/40 p-4">
              <h3 className="font-semibold">{report.headline}</h3>
              <p className="mt-2 text-sm leading-relaxed">{report.answer}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                ["Quizzes", report.stats.quizzes], ["Submissions", report.stats.attempts],
                ["Students", report.stats.students], ["Average", `${report.stats.avg}%`],
              ].map(([label, value]) => <div key={String(label)} className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>)}
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {[
                ["Key findings", report.keyFindings], ["Strengths", report.strengths],
                ["Areas to improve", report.weaknesses], ["Recommendations", report.recommendations],
              ].map(([title, items]) => <div key={String(title)}><h3 className="mb-2 text-sm font-semibold">{title}</h3><ul className="space-y-1.5 text-sm text-muted-foreground">{(items as string[]).map((item) => <li key={item} className="flex gap-2"><span className="text-primary">•</span><span>{item}</span></li>)}</ul></div>)}
            </div>
            {report.topPerformers.length > 0 && <div><h3 className="mb-2 text-sm font-semibold">Top performers</h3><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{report.topPerformers.slice(0, 5).map((student, index) => <div key={`${student.name}-${index}`} className="rounded-lg border border-border p-3"><p className="truncate text-sm font-medium">{index + 1}. {student.name}</p><p className="mt-1 text-xs text-muted-foreground">{student.avg}% average · {student.attempts} quizzes</p></div>)}</div></div>}
            {report.weakTopics.length > 0 && <div><h3 className="mb-2 text-sm font-semibold">Weakest topics</h3><div className="space-y-2">{report.weakTopics.map((topic) => <div key={topic.topic} className="flex items-center gap-3 text-sm"><span className="w-40 truncate">{topic.topic}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-warning" style={{ width: `${topic.accuracy}%` }} /></div><span className="w-12 text-right text-muted-foreground">{topic.accuracy}%</span></div>)}</div></div>}
          </div>
        ) : <p className="text-sm text-muted-foreground">Generate an AI report across this batch's quizzes.</p>}
      </Card>

      <Dialog open={promptOpen} onOpenChange={setPromptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ask about this batch</DialogTitle>
            <DialogDescription>Ask a question or leave this blank for a complete performance report.</DialogDescription>
          </DialogHeader>
          <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Who scored top in all quizzes? Which topics are students weaker in?" rows={5} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromptOpen(false)}>Cancel</Button>
            <Button onClick={generateInsight} disabled={loadingInsight} className="bg-gradient-primary hover:opacity-90"><Sparkles className="h-4 w-4" /> Generate report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold">Average Score per Quiz</h2>
          <div className="h-64">
            {chart.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ left: -20, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.012 255)" vertical={false} />
                  <XAxis dataKey="name" stroke="oklch(0.55 0.035 257)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.55 0.035 257)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.012 255)", fontSize: 12 }} />
                  <Bar dataKey="avg" name="Avg %" radius={[6, 6, 0, 0]} fill="oklch(0.52 0.21 263)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No submissions yet</div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold"><Trophy className="h-4 w-4 text-success" /> Top Students</h2>
          {top.length ? (
            <ul className="space-y-2">
              {top.map((s, i) => (
                <li key={s.name + i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <span className="flex items-center gap-2"><span className="font-bold text-muted-foreground">{i + 1}</span> {s.name}</span>
                  <Badge className="bg-success/15 text-success" variant="secondary">{s.avg}%</Badge>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No data yet</p>}
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 font-semibold">Quizzes in this batch</h2>
        {perQuiz.length === 0 ? (
          <p className="text-sm text-muted-foreground">No quizzes yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {perQuiz.map((q) => (
              <Link
                key={q.id}
                to="/dashboard/quiz/$quizId/results"
                params={{ quizId: q.id }}
                className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-accent/30"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{q.title}</p>
                  <p className="text-xs capitalize text-muted-foreground">{q.type} · {q.attempts} submissions</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{q.avg}% avg</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-semibold"><Star className="h-4 w-4 text-warning" /> Internship Feedback</h2>
          <Badge variant="secondary">{fbCount} response{fbCount === 1 ? "" : "s"}</Badge>
        </div>

        {fbCount === 0 ? (
          <p className="text-sm text-muted-foreground">No internship feedback submitted yet. Students can fill it after completing any quiz.</p>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {overallRatings.map((r) => (
                <div key={r.label} className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">{r.label}</p>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{r.value || "—"}</span>
                    {r.value > 0 && <span className="text-xs text-muted-foreground">/ 5</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-3 text-sm font-semibold">Faculty teaching quality <span className="font-normal text-muted-foreground">(of 4)</span></p>
                <div className="space-y-2">
                  {facultyAvgs.map((r) => (
                    <div key={r.label} className="flex items-center gap-3">
                      <span className="w-44 shrink-0 truncate text-sm">{r.label}</span>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(r.value / 4) * 100}%` }} />
                      </div>
                      <span className="w-8 shrink-0 text-right text-sm font-semibold">{r.value || "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-sm font-semibold">Learning impact <span className="font-normal text-muted-foreground">(of 4)</span></p>
                <div className="space-y-2">
                  {impactAvgs.map((r) => (
                    <div key={r.label} className="flex items-center gap-3">
                      <span className="w-44 shrink-0 truncate text-sm">{r.label}</span>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-success" style={{ width: `${(r.value / 4) * 100}%` }} />
                      </div>
                      <span className="w-8 shrink-0 text-right text-sm font-semibold">{r.value || "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { title: "Teaching pace", dist: paceDist },
                { title: "Resources usefulness", dist: resourcesDist },
                { title: "Task completion", dist: tasksDist },
                { title: "Daily quizzes usefulness", dist: quizzesDist },
              ].map((group) => (
                <div key={group.title}>
                  <p className="mb-2 text-sm font-semibold">{group.title}</p>
                  <div className="space-y-1.5">
                    {group.dist.map((d) => {
                      const pct = fbCount ? Math.round((d.count / fbCount) * 100) : 0;
                      return (
                        <div key={d.label} className="text-xs">
                          <div className="flex justify-between text-muted-foreground"><span className="truncate">{d.label}</span><span>{d.count}</span></div>
                          <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-chart-3" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><MessageSquare className="h-4 w-4" /> Suggestions ({comments.length})</p>
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No written suggestions yet.</p>
              ) : (
                <div className="max-h-72 space-y-3 overflow-y-auto">
                  {comments.map((c, i) => (
                    <div key={i} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{c.student_name || "Anonymous"}{c.section ? ` · ${c.section}` : ""}</p>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{c.suggestions}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {customStats.length > 0 && (
              <div>
                <p className="mb-3 text-sm font-semibold">Custom questions</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {customStats.map((f) => (
                    <div key={f.id} className="rounded-xl border border-border p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{f.label}</p>
                        <Badge variant="secondary">{f.responses}</Badge>
                      </div>
                      {f.avg > 0 && (
                        <p className="mt-2 text-sm text-muted-foreground">Average: <span className="font-semibold text-foreground">{f.avg}</span></p>
                      )}
                      {f.dist.length > 0 && f.type !== "text" && (
                        <div className="mt-2 space-y-1.5">
                          {f.dist.map((d) => {
                            const pct = f.responses ? Math.round((d.count / f.responses) * 100) : 0;
                            return (
                              <div key={d.label} className="text-xs">
                                <div className="flex justify-between text-muted-foreground"><span className="truncate">{d.label}</span><span>{d.count}</span></div>
                                <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {f.type === "text" && f.texts.length > 0 && (
                        <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto">
                          {f.texts.map((t, i) => (
                            <li key={i} className="rounded-md bg-accent/40 p-2 text-xs text-muted-foreground">{t}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </Card>
    </div>
  );
}