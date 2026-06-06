import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  Layers,
  FileQuestion,
  Users,
  Send,
  Activity,
  TrendingUp,
  Trophy,
  ArrowRight,
  Plus,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({ meta: [{ title: "Dashboard — Datapro QuizHub" }] }),
  component: DashboardHome,
});

function isToday(d: string) {
  const date = new Date(d);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

function DashboardHome() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["dashboard-overview", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [batches, quizzes, submissions] = await Promise.all([
        supabase.from("batches").select("id, name, course_name, status, created_at"),
        supabase.from("quizzes").select("id, title, status, type, created_at").eq("trainer_id", user!.id),
        supabase.from("submissions").select("id, student_email, score, total, percentage, submitted_at, quiz_id"),
      ]);
      return {
        batches: batches.data ?? [],
        quizzes: quizzes.data ?? [],
        submissions: submissions.data ?? [],
      };
    },
  });

  // realtime refresh on new submissions
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-submissions")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "submissions" }, () => refetch())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const batches = data?.batches ?? [];
  const quizzes = data?.quizzes ?? [];
  const subs = data?.submissions ?? [];

  const activeQuizzes = quizzes.filter((q) => q.status === "published").length;
  const totalStudents = new Set(subs.map((s) => s.student_email.toLowerCase())).size;
  const todaySubs = subs.filter((s) => isToday(s.submitted_at)).length;
  const avgScore = subs.length
    ? Math.round(subs.reduce((a, s) => a + Number(s.percentage), 0) / subs.length)
    : 0;
  const participation = quizzes.length ? Math.min(100, Math.round((subs.length / (quizzes.length * 10)) * 100)) : 0;

  // weekly chart
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString("en", { weekday: "short" });
    const daySubs = subs.filter((s) => new Date(s.submitted_at).toDateString() === d.toDateString());
    const avg = daySubs.length ? Math.round(daySubs.reduce((a, s) => a + Number(s.percentage), 0) / daySubs.length) : 0;
    return { day: label, submissions: daySubs.length, avg };
  });

  const recent = [...subs]
    .sort((a, b) => +new Date(b.submitted_at) - +new Date(a.submitted_at))
    .slice(0, 6);

  const quizMap = new Map(quizzes.map((q) => [q.id, q.title]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Live overview of your batches and assessments.</p>
        </div>
        <Button asChild className="bg-gradient-primary shadow-elegant hover:opacity-90">
          <Link to="/dashboard/batches"><Plus className="h-4 w-4" /> New batch</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Batches" value={isLoading ? "—" : batches.length} icon={Layers} />
        <StatCard label="Active Quizzes" value={isLoading ? "—" : activeQuizzes} icon={FileQuestion} accent="chart-3" />
        <StatCard label="Total Students" value={isLoading ? "—" : totalStudents} icon={Users} accent="success" />
        <StatCard label="Today's Submissions" value={isLoading ? "—" : todaySubs} icon={Send} accent="warning" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Participation Rate" value={`${participation}%`} icon={Activity} />
        <StatCard label="Average Score" value={`${avgScore}%`} icon={TrendingUp} accent="success" />
        <StatCard label="Total Submissions" value={subs.length} icon={Trophy} accent="chart-3" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Weekly Performance</h2>
            <Badge variant="secondary">Last 7 days</Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={days} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.012 255)" vertical={false} />
                <XAxis dataKey="day" stroke="oklch(0.55 0.035 257)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.55 0.035 257)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.012 255)", fontSize: 12 }}
                />
                <Area type="monotone" dataKey="avg" name="Avg %" stroke="oklch(0.52 0.21 263)" strokeWidth={2.5} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Recent Activity</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No submissions yet. Publish a quiz to get started.</p>
          ) : (
            <ul className="space-y-3">
              {recent.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.student_email.split("@")[0]}</p>
                    <p className="truncate text-xs text-muted-foreground">{quizMap.get(s.quiz_id) ?? "Quiz"}</p>
                  </div>
                  <Badge variant={Number(s.percentage) >= 60 ? "default" : "destructive"} className={Number(s.percentage) >= 60 ? "bg-success" : ""}>
                    {Math.round(Number(s.percentage))}%
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          <Button variant="ghost" size="sm" asChild className="mt-4 w-full">
            <Link to="/dashboard/quizzes">View all quizzes <ArrowRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}