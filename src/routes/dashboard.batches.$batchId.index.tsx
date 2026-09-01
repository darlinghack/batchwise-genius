import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Sparkles,
  Loader2,
  CheckCircle2,
  Circle,
  CalendarRange,
  Layers,
  BarChart3,
  FileQuestion,
  Clock,
  Trash2,
  AlertTriangle,
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
import { Checkbox } from "@/components/ui/checkbox";
import { FeedbackFormBuilder } from "@/components/FeedbackFormBuilder";
import { normalizeFeedbackForm, type FeedbackFormConfig } from "@/lib/feedback-form";
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

export const Route = createFileRoute("/dashboard/batches/$batchId/")({
  head: () => ({ meta: [{ title: "Batch — Datapro QuizHub" }] }),
  component: BatchDetail,
});

type Difficulty = "easy" | "medium" | "hard";

function BatchDetail() {
  const { batchId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const generate = useServerFn(generateQuizQuestions);
  const delQuiz = useServerFn(deleteQuiz);

  const [quizToDelete, setQuizToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [topicTitle, setTopicTitle] = useState("");
  const [addingTopic, setAddingTopic] = useState(false);
  const [genTopic, setGenTopic] = useState<{ id: string; title: string } | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [count, setCount] = useState(10);
  const [quizName, setQuizName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [generating, setGenerating] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [weekendOpen, setWeekendOpen] = useState(false);
  const [weekendGen, setWeekendGen] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState<FeedbackFormConfig | null>(null);
  const [savingFeedback, setSavingFeedback] = useState(false);

  const { data: batch } = useQuery({
    queryKey: ["batch", batchId],
    queryFn: async () => {
      const { data } = await supabase.from("batches").select("*").eq("id", batchId).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (batch) setFeedbackForm(normalizeFeedbackForm(batch.feedback_form ?? null));
  }, [batch?.id, batch?.feedback_form]);

  async function saveBatchFeedbackForm() {
    if (!feedbackForm) return;
    setSavingFeedback(true);
    const { error } = await supabase
      .from("batches")
      .update({ feedback_form: feedbackForm as unknown as never })
      .eq("id", batchId);
    setSavingFeedback(false);
    if (error) return toast.error(error.message);
    toast.success("Batch feedback form saved!");
    qc.invalidateQueries({ queryKey: ["batch", batchId] });
  }

  const { data: topics, isLoading } = useQuery({
    queryKey: ["topics", batchId],
    queryFn: async () => {
      const { data } = await supabase
        .from("topics")
        .select("*")
        .eq("batch_id", batchId)
        .order("day_number", { ascending: true });
      return data ?? [];
    },
  });

  const { data: batchQuizzes, isLoading: quizzesLoading } = useQuery({
    queryKey: ["batch-quizzes", batchId],
    queryFn: async () => {
      const { data } = await supabase
        .from("quizzes")
        .select("id, title, type, difficulty, status, num_questions, duration_minutes, created_at")
        .eq("batch_id", batchId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function addTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!topicTitle.trim()) return;
    setAddingTopic(true);
    const nextDay = (topics?.length ?? 0) + 1;
    const { error } = await supabase.from("topics").insert({
      batch_id: batchId,
      day_number: nextDay,
      title: topicTitle.trim(),
    });
    setAddingTopic(false);
    if (error) return toast.error(error.message);
    setTopicTitle("");
    qc.invalidateQueries({ queryKey: ["topics", batchId] });
  }

  async function toggleTopicStatus(id: string, status: string) {
    const next = status === "completed" ? "planned" : "completed";
    await supabase.from("topics").update({ status: next }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["topics", batchId] });
  }

  async function createQuizFromQuestions(opts: {
    title: string;
    topicName: string;
    topicId: string | null;
    type: "daily" | "weekend";
    diff: Difficulty;
    questions: Awaited<ReturnType<typeof generate>>["questions"];
    duration: number;
  }) {
    const { data: quiz, error } = await supabase
      .from("quizzes")
      .insert({
        trainer_id: user!.id,
        batch_id: batchId,
        topic_id: opts.topicId,
        title: opts.title,
        topic_name: opts.topicName,
        type: opts.type,
        difficulty: opts.diff,
        num_questions: opts.questions.length,
        duration_minutes: opts.duration,
        status: "draft",
      })
      .select("id")
      .single();
    if (error || !quiz) throw new Error(error?.message ?? "Failed to create quiz");

    const rows = opts.questions.map((q, i) => ({
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
    qc.invalidateQueries({ queryKey: ["batch-quizzes", batchId] });
    return quiz.id;
  }

  async function handleGenerate() {
    if (!genTopic) return;
    setGenerating(true);
    try {
      const { questions } = await generate({
        data: {
          topicName: genTopic.title,
          difficulty,
          count,
          instructions: instructions.trim() || undefined,
        },
      });
      const quizId = await createQuizFromQuestions({
        title: quizName.trim() || genTopic.title,
        topicName: genTopic.title,
        topicId: genTopic.id,
        type: "daily",
        diff: difficulty,
        questions,
        duration: 15,
      });
      toast.success("Quiz generated! Review and publish.");
      setGenTopic(null);
      navigate({ to: "/dashboard/quiz/$quizId", params: { quizId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(quizId: string) {
    setDeleting(true);
    try {
      await delQuiz({ data: { quizId } });
      toast.success("Quiz deleted");
      qc.invalidateQueries({ queryKey: ["batch-quizzes", batchId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
      setQuizToDelete(null);
    }
  }

  async function handleWeekend() {
    const chosen = (topics ?? []).filter((t) => selected.includes(t.id));
    if (chosen.length < 2) return toast.error("Select at least 2 topics.");
    setWeekendGen(true);
    try {
      const { questions } = await generate({
        data: {
          topicName: chosen.map((t) => t.title).join(", "),
          difficulty: "medium",
          count: 20,
          topics: chosen.map((t) => t.title),
        },
      });
      const quizId = await createQuizFromQuestions({
        title: `Weekend Assessment — ${batch?.name ?? "Batch"}`,
        topicName: chosen.map((t) => t.title).join(", "),
        topicId: null,
        type: "weekend",
        diff: "medium",
        questions,
        duration: 30,
      });
      toast.success("Weekend test generated!");
      setWeekendOpen(false);
      setSelected([]);
      navigate({ to: "/dashboard/quiz/$quizId", params: { quizId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setWeekendGen(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/dashboard/batches"><ArrowLeft className="h-4 w-4" /> Back to batches</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/dashboard/batches/$batchId/analytics" params={{ batchId }}><BarChart3 className="h-4 w-4" /> Batch analytics</Link>
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="bg-gradient-hero p-6 text-primary-foreground">
          <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
            <Layers className="h-4 w-4" /> {batch?.course_name}
          </div>
          <h1 className="mt-2 text-2xl font-bold">{batch?.name ?? "Batch"}</h1>
          {batch && (
            <Badge variant="secondary" className="mt-3 capitalize">{batch.status}</Badge>
          )}
        </div>
      </Card>

      {feedbackForm && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Batch feedback form</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                This is the default form for quizzes in this batch. A quiz can override it from its editor.
              </p>
            </div>
            <Button variant="outline" onClick={saveBatchFeedbackForm} disabled={savingFeedback}>
              {savingFeedback ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Save form
            </Button>
          </div>
          <div className="mt-5">
            <FeedbackFormBuilder value={feedbackForm} onChange={setFeedbackForm} />
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Daily Topics</h2>
            <Button size="sm" variant="outline" onClick={() => setWeekendOpen(true)} disabled={(topics?.length ?? 0) < 2}>
              <CalendarRange className="h-4 w-4" /> Weekend test
            </Button>
          </div>

          <form onSubmit={addTopic} className="mb-5 flex gap-2">
            <Input value={topicTitle} onChange={(e) => setTopicTitle(e.target.value)} placeholder={`Day ${(topics?.length ?? 0) + 1} – e.g. Loops`} />
            <Button type="submit" disabled={addingTopic} className="bg-gradient-primary hover:opacity-90 shrink-0">
              {addingTopic ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
            </Button>
          </form>

          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : topics && topics.length > 0 ? (
            <ol className="relative space-y-3 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
              {topics.map((t) => (
                <li key={t.id} className="relative flex items-center gap-3 pl-1">
                  <button onClick={() => toggleTopicStatus(t.id, t.status)} className="z-10 shrink-0">
                    {t.status === "completed" ? (
                      <CheckCircle2 className="h-8 w-8 rounded-full bg-background text-success" />
                    ) : (
                      <Circle className="h-8 w-8 rounded-full bg-background text-muted-foreground" />
                    )}
                  </button>
                  <div className="flex flex-1 items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Day {t.day_number}</p>
                      <p className="font-medium">{t.title}</p>
                    </div>
                    <Button size="sm" onClick={() => { setGenTopic({ id: t.id, title: t.title }); setQuizName(t.title); setInstructions(""); setCount(10); setDifficulty("medium"); }} className="bg-gradient-primary hover:opacity-90">
                      <Sparkles className="h-3.5 w-3.5" /> Generate Quiz
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No topics yet. Add your first day's topic above.</p>
          )}
        </Card>

        <Card className="h-fit p-5">
          <h2 className="font-semibold">Quick tips</h2>
          <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Click <b className="text-foreground">Generate Quiz</b> on any topic to create a 10-question daily quiz with AI.</li>
            <li className="flex gap-2"><CalendarRange className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Use <b className="text-foreground">Weekend test</b> to build a 20-question assessment across multiple topics.</li>
            <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> Mark topics complete as your classes progress.</li>
          </ul>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Quizzes in this batch</h2>
          {batchQuizzes && batchQuizzes.length > 0 && (
            <Badge variant="secondary">{batchQuizzes.length}</Badge>
          )}
        </div>
        {quizzesLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : batchQuizzes && batchQuizzes.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {batchQuizzes.map((q) => (
              <div
                key={q.id}
                className="group flex items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/50"
              >
                <Link
                  to="/dashboard/quiz/$quizId"
                  params={{ quizId: q.id }}
                  className="flex-1 min-w-0"
                >
                  <div className="flex items-center gap-2">
                    <FileQuestion className="h-4 w-4 shrink-0 text-primary" />
                    <p className="truncate font-medium">{q.title}</p>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="capitalize">{q.difficulty}</span>
                    <span>{q.num_questions} Qs</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {q.duration_minutes}m</span>
                  </div>
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="capitalize">{q.status}</Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setQuizToDelete(q.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">No quizzes yet. Generate one from a topic above to get started.</p>
        )}
      </Card>

      {/* Generate daily quiz dialog */}
      <Dialog open={!!genTopic} onOpenChange={(o) => !o && setGenTopic(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate AI Quiz</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Topic</Label>
              <Input value={genTopic?.title ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Quiz name</Label>
              <Input value={quizName} onChange={(e) => setQuizName(e.target.value)} placeholder="Quiz name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
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
                <Input type="number" min={1} max={30} value={count} onChange={(e) => setCount(Math.min(30, Math.max(1, Number(e.target.value) || 1)))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Additional instructions <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Add specific subtopics, sample questions, focus areas, or any context for the AI. Leave empty to generate from the topic alone."
                className="min-h-[90px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleGenerate} disabled={generating} className="bg-gradient-primary hover:opacity-90">
              {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : <><Sparkles className="h-4 w-4" /> Generate</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Weekend test dialog */}
      <Dialog open={weekendOpen} onOpenChange={setWeekendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Weekend Test</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Select topics to cover. We'll build 20 balanced questions.</p>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {(topics ?? []).map((t) => (
              <label key={t.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                <Checkbox
                  checked={selected.includes(t.id)}
                  onCheckedChange={(c) =>
                    setSelected((prev) => (c ? [...prev, t.id] : prev.filter((id) => id !== t.id)))
                  }
                />
                <span className="text-sm">Day {t.day_number} – {t.title}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={handleWeekend} disabled={weekendGen} className="bg-gradient-primary hover:opacity-90">
              {weekendGen ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : <><Sparkles className="h-4 w-4" /> Generate test</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!quizToDelete} onOpenChange={(o) => !o && setQuizToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Delete Quiz
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the quiz and all its questions and submissions. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuizToDelete(null)} disabled={deleting}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => quizToDelete && handleDelete(quizToDelete)}
              disabled={deleting}
            >
              {deleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</> : <><Trash2 className="h-4 w-4" /> Delete</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}