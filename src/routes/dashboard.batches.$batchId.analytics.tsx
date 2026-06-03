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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getBatchInsight } from "@/lib/quiz.functions";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/dashboard/batches/$batchId/analytics")({
  head: () => ({ meta: [{ title: "Batch analytics — Datapro QuizHub" }] }),
  component: BatchAnalytics,
});

function BatchAnalytics() {
  const { batchId } = Route.useParams();
  const insightFn = useServerFn(getBatchInsight);
  const [insight, setInsight] = useState("");
  const [loadingInsight, setLoadingInsight] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["batch-analytics", batchId],
    queryFn: async () => {
      const { data: batch } = await supabase.from("batches").select("name, course_name").eq("id", batchId).maybeSingle();
      const { data: quizzes } = await supabase
        .from("quizzes")
        .select("id, title, status, type")
        .eq("batch_id", batchId)
        .order("created_at", { ascending: false });
      const quizIds = (quizzes ?? []).map((q) => q.id);
      let subs: { quiz_id: string; student_name: string; student_email: string; percentage: number }[] = [];
      if (quizIds.length) {
        const { data: s } = await supabase
          .from("submissions")
          .select("quiz_id, student_name, student_email, percentage")
          .in("quiz_id", quizIds);
        subs = (s as typeof subs) ?? [];
      }
      return { batch, quizzes: quizzes ?? [], subs };
    },
  });

  const batch = data?.batch;
  const quizzes = data?.quizzes ?? [];
  const subs = data?.subs ?? [];
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

  async function generateInsight() {
    setLoadingInsight(true);
    const ctx = `Batch "${batch?.name}" (${batch?.course_name}). Quizzes: ${quizzes.length}. Attempts: ${attempts}. Average: ${avg}%. Pass rate: ${passPct}%. Per-quiz averages: ${perQuiz.map((p) => `${p.title}=${p.avg}%`).join(", ")}.`;
    try {
      const res = await insightFn({ data: { context: ctx } });
      if (res.insight) setInsight(res.insight);
      else toast.error(res.error || "Could not generate insight");
    } finally {
      setLoadingInsight(false);
    }
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
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-primary" /> AI Insights</h2>
          <Button size="sm" onClick={generateInsight} disabled={loadingInsight || !attempts} className="bg-gradient-primary hover:opacity-90">
            {loadingInsight ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate
          </Button>
        </div>
        {insight ? (
          <p className="rounded-lg bg-accent/40 p-4 text-sm leading-relaxed">{insight}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Generate an AI summary across this batch's quizzes.</p>
        )}
      </Card>

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
    </div>
  );
}