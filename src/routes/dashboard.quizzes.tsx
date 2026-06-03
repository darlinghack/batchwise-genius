import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { FileQuestion, Loader2, Sparkles, Radio, Clock, BarChart3, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cloneQuizToBatch } from "@/lib/library";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cloneQuiz, setCloneQuiz] = useState<{ id: string; title: string } | null>(null);
  const [batchId, setBatchId] = useState("");
  const [title, setTitle] = useState("");
  const [cloning, setCloning] = useState(false);

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

  const { data: batches } = useQuery({
    queryKey: ["batches-mini"],
    queryFn: async () => {
      const { data } = await supabase.from("batches").select("id, name").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  function openClone(q: { id: string; title: string }) {
    setCloneQuiz(q);
    setTitle(q.title);
    setBatchId("");
  }

  async function handleClone() {
    if (!user || !cloneQuiz) return;
    if (!batchId) return toast.error("Choose a batch to clone into.");
    setCloning(true);
    try {
      const quizId = await cloneQuizToBatch(cloneQuiz.id, { trainerId: user.id, batchId, title });
      toast.success("Cloned into a fresh, independent quiz.");
      setCloneQuiz(null);
      navigate({ to: "/dashboard/quiz/$quizId", params: { quizId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Clone failed");
    } finally {
      setCloning(false);
    }
  }

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
                <div className="mt-4 flex flex-wrap gap-2 pt-2">
                  <Button size="sm" variant="outline" asChild className="flex-1">
                    <Link to="/dashboard/quiz/$quizId" params={{ quizId: q.id }}><Sparkles className="h-3.5 w-3.5" /> Edit</Link>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openClone({ id: q.id, title: q.title })} title="Clone into another batch">
                    <Copy className="h-3.5 w-3.5" /> Clone
                  </Button>
                  {q.status !== "draft" && (
                    <>
                      <Button size="sm" variant="outline" asChild className="flex-1">
                        <Link to="/dashboard/quiz/$quizId/results" params={{ quizId: q.id }}><BarChart3 className="h-3.5 w-3.5" /> Results</Link>
                      </Button>
                      <Button size="sm" asChild className="flex-1 bg-gradient-primary hover:opacity-90">
                        <Link to="/dashboard/quiz/$quizId/live" params={{ quizId: q.id }}><Radio className="h-3.5 w-3.5" /> Live</Link>
                      </Button>
                    </>
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

      <Dialog open={!!cloneQuiz} onOpenChange={(o) => !o && setCloneQuiz(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone quiz into another batch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Quiz title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quiz title" />
            </div>
            <div className="space-y-2">
              <Label>Target batch</Label>
              <Select value={batchId} onValueChange={setBatchId}>
                <SelectTrigger><SelectValue placeholder="Select a batch" /></SelectTrigger>
                <SelectContent>
                  {(batches ?? []).map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="rounded-lg bg-accent/40 p-3 text-xs text-muted-foreground">
              The clone copies the same questions but starts fresh — separate submissions, leaderboard, and analytics from the original.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleClone} disabled={cloning} className="bg-gradient-primary hover:opacity-90">
              {cloning ? <><Loader2 className="h-4 w-4 animate-spin" /> Cloning…</> : <><Copy className="h-4 w-4" /> Create clone</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}