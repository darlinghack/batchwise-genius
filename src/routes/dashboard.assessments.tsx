import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  Sparkles,
  Loader2,
  Plus,
  Clock,
  BarChart3,
  EyeOff,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { generateQuizQuestions, deleteQuiz } from "@/lib/quiz.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/dashboard/assessments")({
  head: () => ({
    meta: [
      { title: "Anonymous Assessments — Datapro QuizHub" },
      {
        name: "description",
        content:
          "Create standalone screening assessments from your own outlines, keep results hidden from candidates, and monitor every submission.",
      },
      { property: "og:title", content: "Anonymous Assessments — Datapro QuizHub" },
      {
        property: "og:description",
        content: "Screening assessments with hidden results and full submission monitoring.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssessmentsPage,
});

type Difficulty = "easy" | "medium" | "hard";

const statusStyle: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-success/15 text-success",
  closed: "bg-destructive/10 text-destructive",
};

function AssessmentsPage() {
  const { user, role, loading } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const generate = useServerFn(generateQuizQuestions);
  const delQuiz = useServerFn(deleteQuiz);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [count, setCount] = useState(20);
  const [duration, setDuration] = useState(30);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = role === "super_admin";

  const { data: assessments, isLoading } = useQuery({
    queryKey: ["assessments", user?.id],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("quizzes")
        .select("id, title, topic_name, difficulty, status, num_questions, duration_minutes, created_at, submissions(count)")
        .eq("is_assessment", true)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function handleCreate() {
    if (!user) return;
    if (!title.trim()) return toast.error("Give the assessment a name.");
    if (!content.trim()) return toast.error("Paste the outline or content to generate from.");
    setCreating(true);
    try {
      const { questions } = await generate({
        data: {
          topicName: title.trim(),
          difficulty,
          count,
          instructions: content.trim(),
        },
      });

      const { data: quiz, error } = await supabase
        .from("quizzes")
        .insert({
          trainer_id: user.id,
          batch_id: null,
          topic_id: null,
          title: title.trim(),
          topic_name: title.trim(),
          type: "weekend",
          difficulty,
          num_questions: questions.length,
          duration_minutes: duration,
          status: "draft",
          is_assessment: true,
          hide_results: true,
        })
        .select("id")
        .single();
      if (error || !quiz) throw new Error(error?.message ?? "Failed to create assessment");

      const rows = questions.map((q, i) => ({
        quiz_id: quiz.id,
        question_text: q.question_text,
        options: q.options,
        correct_index: q.correct_index,
        explanation: q.explanation,
        difficulty: q.difficulty,
        position: i,
      }));
      const { error: qErr } = await supabase.from("questions").insert(rows);
      if (qErr) throw new Error(qErr.message);

      qc.invalidateQueries({ queryKey: ["assessments"] });
      toast.success("Assessment created — review, rename, then publish.");
      setOpen(false);
      setTitle("");
      setContent("");
      navigate({ to: "/dashboard/quiz/$quizId", params: { quizId: quiz.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await delQuiz({ data: { quizId: toDelete } });
      qc.invalidateQueries({ queryKey: ["assessments"] });
      toast.success("Assessment deleted.");
      setToDelete(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!isAdmin) {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldCheck className="h-7 w-7" />
        </span>
        <p className="font-medium">Admins only</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Anonymous assessments are managed by super admins. Ask your administrator for access.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Anonymous Assessments</h1>
          <p className="text-sm text-muted-foreground">
            Standalone screening tests generated from your own outlines. Candidates never see their scores.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-gradient-primary hover:opacity-90">
          <Plus className="h-4 w-4" /> New assessment
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : assessments && assessments.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assessments.map((a) => {
            const subCount = (a.submissions as { count: number }[] | null)?.[0]?.count ?? 0;
            return (
              <Card key={a.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div className="flex gap-1.5">
                    <Badge variant="secondary" className="bg-accent text-accent-foreground">
                      <EyeOff className="mr-1 h-3 w-3" /> Hidden
                    </Badge>
                    <Badge variant="secondary" className={statusStyle[a.status]}>{a.status}</Badge>
                  </div>
                </div>
                <h3 className="mt-3 line-clamp-2 font-semibold leading-tight">{a.title}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="capitalize">{a.difficulty}</span>
                  <span>{a.num_questions} Qs</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {a.duration_minutes}m</span>
                  <span>{subCount} submissions</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 pt-2">
                  <Button size="sm" variant="outline" asChild className="flex-1">
                    <Link to="/dashboard/quiz/$quizId" params={{ quizId: a.id }}><Sparkles className="h-3.5 w-3.5" /> Edit</Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild className="flex-1">
                    <Link to="/dashboard/quiz/$quizId/results" params={{ quizId: a.id }}><BarChart3 className="h-3.5 w-3.5" /> Results</Link>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setToDelete(a.id)} title="Delete assessment">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ShieldCheck className="h-7 w-7" /></span>
          <p className="font-medium">No assessments yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Create one from a pasted syllabus, job description, or question outline to screen large candidate pools.
          </p>
          <Button onClick={() => setOpen(true)} className="mt-2 bg-gradient-primary hover:opacity-90">
            <Plus className="h-4 w-4" /> New assessment
          </Button>
        </Card>
      )}

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create anonymous assessment</DialogTitle>
            <DialogDescription>
              Candidates enter their details, take the test, and see no score. You keep full monitoring.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Assessment name</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Data Analyst Screening — Aug 2026" />
            </div>
            <div className="space-y-2">
              <Label>Outline / content</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={7}
                placeholder="Paste the syllabus, subtopics, sample questions or job requirements the questions should be based on…"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Questions</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={count}
                  onChange={(e) => setCount(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (min)</Label>
                <Input
                  type="number"
                  min={1}
                  max={240}
                  value={duration}
                  onChange={(e) => setDuration(Math.max(1, Math.min(240, Number(e.target.value) || 1)))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreate} disabled={creating} className="bg-gradient-primary hover:opacity-90">
              {creating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : <><Sparkles className="h-4 w-4" /> Generate assessment</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this assessment?</DialogTitle>
            <DialogDescription>
              This permanently removes its questions and every candidate submission. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</> : <><Trash2 className="h-4 w-4" /> Delete</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
