import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Loader2,
  Trophy,
  Users,
  Send,
  TrendingUp,
  Maximize,
  Minimize,
  Crown,
  Medal,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/quiz/$quizId/live")({
  head: () => ({ meta: [{ title: "Live leaderboard — Datapro QuizHub" }] }),
  component: LiveView,
});

interface Sub {
  id: string;
  student_name: string;
  score: number;
  total: number;
  percentage: number;
  submitted_at: string;
  time_taken_seconds: number;
}

function LiveView() {
  const { quizId } = Route.useParams();
  const [subs, setSubs] = useState<Sub[]>([]);
  const [fullscreen, setFullscreen] = useState(false);

  const { data: quiz } = useQuery({
    queryKey: ["quiz-live-meta", quizId],
    queryFn: async () => {
      const { data } = await supabase.from("quizzes").select("title, num_questions, type").eq("id", quizId).maybeSingle();
      return data;
    },
  });

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("submissions")
      .select("id, student_name, score, total, percentage, submitted_at, time_taken_seconds")
      .eq("quiz_id", quizId)
      .order("percentage", { ascending: false });
    setSubs((data as Sub[]) ?? []);
  }, [quizId]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`live-${quizId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "submissions", filter: `quiz_id=eq.${quizId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [quizId, load]);

  const ranked = [...subs].sort((a, b) =>
    b.percentage !== a.percentage ? b.percentage - a.percentage : a.time_taken_seconds - b.time_taken_seconds,
  );
  const submitted = subs.length;
  const avg = submitted ? Math.round(subs.reduce((a, s) => a + Number(s.percentage), 0) / submitted) : 0;
  const high = submitted ? Math.max(...subs.map((s) => Number(s.percentage))) : 0;
  const low = submitted ? Math.min(...subs.map((s) => Number(s.percentage))) : 0;

  const rankIcon = (i: number) =>
    i === 0 ? <Crown className="h-4 w-4 text-warning" /> : i === 1 ? <Medal className="h-4 w-4 text-muted-foreground" /> : i === 2 ? <Medal className="h-4 w-4 text-chart-5" /> : null;

  const board = (
    <Card className={cn("overflow-hidden", fullscreen && "rounded-none border-0 shadow-none")}>
      <div className="flex items-center justify-between border-b border-border bg-gradient-hero p-5 text-primary-foreground">
        <div className="flex items-center gap-2 text-lg font-semibold"><Trophy className="h-5 w-5" /> Live Leaderboard</div>
        <Badge variant="secondary" className="animate-pulse-ring bg-white/20 text-primary-foreground">{submitted} submitted</Badge>
      </div>
      <div className="divide-y divide-border">
        {ranked.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Waiting for submissions…</p>
        ) : (
          ranked.slice(0, fullscreen ? 20 : 10).map((s, i) => (
            <div
              key={s.id}
              className={cn(
                "flex items-center gap-4 px-5 py-3 transition-colors",
                i < 3 && "bg-primary/5",
                fullscreen && "py-4",
              )}
            >
              <div className="flex w-8 items-center justify-center font-bold text-muted-foreground">
                {rankIcon(i) ?? i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("truncate font-medium", fullscreen && "text-lg")}>{s.student_name}</p>
                <p className="text-xs text-muted-foreground">{Math.floor(s.time_taken_seconds / 60)}m {s.time_taken_seconds % 60}s</p>
              </div>
              <div className="text-right">
                <p className={cn("font-bold text-primary", fullscreen ? "text-2xl" : "text-lg")}>{Math.round(Number(s.percentage))}%</p>
                <p className="text-xs text-muted-foreground">{s.score}/{s.total}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-background p-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-bold">{quiz?.title}</h1>
            <Button variant="outline" onClick={() => setFullscreen(false)}><Minimize className="h-4 w-4" /> Exit</Button>
          </div>
          {board}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/dashboard/quiz/$quizId" params={{ quizId }}><ArrowLeft className="h-4 w-4" /> Back to quiz</Link>
        </Button>
        <Button variant="outline" onClick={() => setFullscreen(true)}><Maximize className="h-4 w-4" /> Full screen</Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{quiz?.title ?? "Live"}</h1>
        <p className="text-sm text-muted-foreground">Real-time submissions and rankings.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Submitted" value={submitted} icon={Send} />
        <StatCard label="Average Score" value={`${avg}%`} icon={TrendingUp} accent="success" />
        <StatCard label="Highest" value={`${Math.round(high)}%`} icon={Trophy} accent="chart-3" />
        <StatCard label="Lowest" value={`${submitted ? Math.round(low) : 0}%`} icon={Users} accent="warning" />
      </div>

      {board}
    </div>
  );
}