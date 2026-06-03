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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Sparkles, Loader2, Download, Trophy, AlertTriangle, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getBatchInsight } from "@/lib/quiz.functions";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/dashboard/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Datapro QuizHub" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const insightFn = useServerFn(getBatchInsight);
  const [insight, setInsight] = useState("");
  const [loadingInsight, setLoadingInsight] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const [quizzes, submissions] = await Promise.all([
        supabase.from("quizzes").select("id, title, topic_name"),
        supabase.from("submissions").select("student_name, student_email, score, total, percentage, quiz_id, points"),
      ]);
      return { quizzes: quizzes.data ?? [], submissions: submissions.data ?? [] };
    },
  });

  const quizzes = data?.quizzes ?? [];
  const subs = data?.submissions ?? [];
  const attempts = subs.length;
  const avg = attempts ? Math.round(subs.reduce((a, s) => a + Number(s.percentage), 0) / attempts) : 0;
  const passed = subs.filter((s) => Number(s.percentage) >= 60).length;
  const passPct = attempts ? Math.round((passed / attempts) * 100) : 0;

  const quizTitle = new Map(quizzes.map((q) => [q.id, q.title]));
  const perQuiz = quizzes
    .map((q) => {
      const qs = subs.filter((s) => s.quiz_id === q.id);
      const a = qs.length ? Math.round(qs.reduce((x, s) => x + Number(s.percentage), 0) / qs.length) : 0;
      return { name: q.title.slice(0, 16), avg: a, attempts: qs.length };
    })
    .filter((x) => x.attempts > 0)
    .slice(0, 8);

  const quizLinks = quizzes
    .map((q) => {
      const qs = subs.filter((s) => s.quiz_id === q.id);
      const a = qs.length ? Math.round(qs.reduce((x, s) => x + Number(s.percentage), 0) / qs.length) : 0;
      return { id: q.id, title: q.title, attempts: qs.length, avg: a };
    })
    .sort((a, b) => b.attempts - a.attempts);

  // top & weak students (by avg %)
  const byStudent = new Map<string, { name: string; total: number; count: number }>();
  subs.forEach((s) => {
    const key = s.student_email.toLowerCase();
    const cur = byStudent.get(key) ?? { name: s.student_name, total: 0, count: 0 };
    cur.total += Number(s.percentage);
    cur.count += 1;
    byStudent.set(key, cur);
  });
  const students = [...byStudent.values()].map((s) => ({ name: s.name, avg: Math.round(s.total / s.count) }));
  const top = [...students].sort((a, b) => b.avg - a.avg).slice(0, 5);
  const weak = [...students].sort((a, b) => a.avg - b.avg).slice(0, 5);

  const pieData = [
    { name: "Passed", value: passed },
    { name: "Failed", value: attempts - passed },
  ];
  const pieColors = ["oklch(0.62 0.16 155)", "oklch(0.58 0.23 27)"];

  async function generateInsight() {
    setLoadingInsight(true);
    const ctx = `Total attempts: ${attempts}. Overall average: ${avg}%. Pass rate: ${passPct}%. Per-quiz averages: ${perQuiz
      .map((p) => `${p.name}=${p.avg}%`)
      .join(", ")}. Top students: ${top.map((t) => `${t.name}(${t.avg}%)`).join(", ")}.`;
    const res = await insightFn({ data: { context: ctx } });
    setLoadingInsight(false);
    if (res.insight) setInsight(res.insight);
    else toast.error(res.error || "Could not generate insight");
  }

  function exportCsv() {
    const rows = [["Student", "Email", "Quiz", "Score", "Total", "Percentage"]];
    subs.forEach((s) => rows.push([s.student_name, s.student_email, quizTitle.get(s.quiz_id) ?? "", String(s.score), String(s.total), String(s.percentage)]));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "quizhub-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organization Analytics</h1>
          <p className="text-sm text-muted-foreground">Company-wide view across every batch and quiz. Drill into a batch or quiz for isolated results.</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!attempts}><Download className="h-4 w-4" /> Export CSV</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Attempts" value={attempts} icon={Trophy} />
        <StatCard label="Average Score" value={`${avg}%`} icon={Sparkles} accent="success" />
        <StatCard label="Pass Rate" value={`${passPct}%`} icon={Trophy} accent="chart-3" />
        <StatCard label="Fail Rate" value={`${attempts ? 100 - passPct : 0}%`} icon={AlertTriangle} accent="warning" />
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
          <p className="text-sm text-muted-foreground">Generate an AI summary of strengths, weak concepts, and recommendations.</p>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold">Average Score per Quiz</h2>
          <div className="h-64">
            {perQuiz.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perQuiz} margin={{ left: -20, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.012 255)" vertical={false} />
                  <XAxis dataKey="name" stroke="oklch(0.55 0.035 257)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.55 0.035 257)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.012 255)", fontSize: 12 }} />
                  <Bar dataKey="avg" name="Avg %" radius={[6, 6, 0, 0]} fill="oklch(0.52 0.21 263)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data yet</div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Pass / Fail</h2>
          <div className="h-64">
            {attempts ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {pieData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data yet</div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
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
        <Card className="p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-warning" /> Needs Attention</h2>
          {weak.length ? (
            <ul className="space-y-2">
              {weak.map((s, i) => (
                <li key={s.name + i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <span>{s.name}</span>
                  <Badge variant="secondary" className="bg-warning/15 text-warning">{s.avg}%</Badge>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No data yet</p>}
        </Card>
      </div>
    </div>
  );
}