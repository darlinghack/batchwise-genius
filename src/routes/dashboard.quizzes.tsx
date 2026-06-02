import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileQuestion, Loader2, Sparkles, Radio, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/dashboard/quizzes")({
  head: () => ({ meta: [{ title: "Quizzes — Datapro QuizHub" }] }),
  component: QuizzesPage,
});

const statusStyle: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-success/15 text-success",
  closed: "bg-destructive/10 text-destructive",
};

function QuizzesPage() {
  const { data: quizzes, isLoading } = useQuery({
    queryKey: ["quizzes-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("quizzes")
        .select("id, title, type, difficulty, status, num_questions, duration_minutes, created_at, submissions(count)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Quizzes</h1>
        <p className="text-sm text-muted-foreground">All your daily quizzes and weekend assessments.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : quizzes && quizzes.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((q) => {
            const subCount = (q.submissions as { count: number }[] | null)?.[0]?.count ?? 0;
            return (
              <Card key={q.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileQuestion className="h-5 w-5" />
                  </span>
                  <div className="flex gap-1.5">
                    {q.type === "weekend" && <Badge variant="secondary" className="bg-accent text-accent-foreground">Weekend</Badge>}
                    <Badge variant="secondary" className={statusStyle[q.status]}>{q.status}</Badge>
                  </div>
                </div>
                <h3 className="mt-3 line-clamp-2 font-semibold leading-tight">{q.title}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="capitalize">{q.difficulty}</span>
                  <span>{q.num_questions} Qs</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {q.duration_minutes}m</span>
                  <span>{subCount} submissions</span>
                </div>
                <div className="mt-4 flex gap-2 pt-2">
                  <Button size="sm" variant="outline" asChild className="flex-1">
                    <Link to="/dashboard/quiz/$quizId" params={{ quizId: q.id }}><Sparkles className="h-3.5 w-3.5" /> Edit</Link>
                  </Button>
                  {q.status !== "draft" && (
                    <Button size="sm" asChild className="flex-1 bg-gradient-primary hover:opacity-90">
                      <Link to="/dashboard/quiz/$quizId/live" params={{ quizId: q.id }}><Radio className="h-3.5 w-3.5" /> Live</Link>
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><FileQuestion className="h-7 w-7" /></span>
          <p className="font-medium">No quizzes yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">Open a batch and generate a quiz from any topic to get started.</p>
          <Button asChild className="mt-2 bg-gradient-primary hover:opacity-90"><Link to="/dashboard/batches">Go to batches</Link></Button>
        </Card>
      )}
    </div>
  );
}