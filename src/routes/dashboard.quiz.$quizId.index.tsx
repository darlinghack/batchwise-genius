import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Check,
  Send,
  Copy,
  Radio,
  Lock,
  QrCode,
  Save,
  BarChart3,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/quiz/$quizId/")({
  head: () => ({ meta: [{ title: "Edit quiz — Datapro QuizHub" }] }),
  component: QuizEditor,
});

interface EditQuestion {
  id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string;
  isNew?: boolean;
}

function QuizEditor() {
  const { quizId } = Route.useParams();
  const qc = useQueryClient();
  const [questions, setQuestions] = useState<EditQuestion[]>([]);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const { data: quiz, isLoading } = useQuery({
    queryKey: ["quiz", quizId],
    queryFn: async () => {
      const { data } = await supabase.from("quizzes").select("*").eq("id", quizId).maybeSingle();
      return data;
    },
  });

  const { data: loadedQuestions } = useQuery({
    queryKey: ["quiz-questions", quizId],
    queryFn: async () => {
      const { data } = await supabase
        .from("questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("position", { ascending: true });
      return data ?? [];
    },
  });

  useEffect(() => {
    if (loadedQuestions) {
      setQuestions(
        loadedQuestions.map((q) => ({
          id: q.id,
          question_text: q.question_text,
          options: (q.options as string[]) ?? ["", "", "", ""],
          correct_index: q.correct_index,
          explanation: q.explanation,
        })),
      );
    }
  }, [loadedQuestions]);

  useEffect(() => {
    if (quiz?.title) setTitle(quiz.title);
  }, [quiz?.title]);

  const shareUrl =
    typeof window !== "undefined" && quiz ? `${window.location.origin}/quiz/${quiz.share_code}` : "";

  function update(idx: number, patch: Partial<EditQuestion>) {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  }
  function updateOption(idx: number, oi: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, options: q.options.map((o, j) => (j === oi ? value : o)) } : q)),
    );
  }
  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, question_text: "", options: ["", "", "", ""], correct_index: 0, explanation: "", isNew: true },
    ]);
  }
  async function removeQuestion(idx: number) {
    const q = questions[idx];
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
    if (!q.isNew) await supabase.from("questions").delete().eq("id", q.id);
  }

  async function saveAll() {
    setSaving(true);
    try {
      if (title.trim() && title.trim() !== quiz?.title) {
        await supabase.from("quizzes").update({ title: title.trim() }).eq("id", quizId);
      }
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (q.isNew) {
          const { error } = await supabase.from("questions").insert({
            quiz_id: quizId,
            question_text: q.question_text,
            options: q.options,
            correct_index: q.correct_index,
            explanation: q.explanation,
            position: i,
          });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("questions")
            .update({
              question_text: q.question_text,
              options: q.options,
              correct_index: q.correct_index,
              explanation: q.explanation,
              position: i,
            })
            .eq("id", q.id);
          if (error) throw error;
        }
      }
      await supabase.from("quizzes").update({ num_questions: questions.length }).eq("id", quizId);
      toast.success("Saved!");
      qc.invalidateQueries({ queryKey: ["quiz-questions", quizId] });
      qc.invalidateQueries({ queryKey: ["quiz", quizId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(status: "published" | "closed" | "draft") {
    setPublishing(true);
    if (status === "published") await saveAll();
    const { error } = await supabase.from("quizzes").update({ status }).eq("id", quizId);
    setPublishing(false);
    if (error) return toast.error(error.message);
    toast.success(status === "published" ? "Quiz published!" : status === "closed" ? "Quiz closed." : "Reverted to draft.");
    qc.invalidateQueries({ queryKey: ["quiz", quizId] });
    qc.invalidateQueries({ queryKey: ["quizzes-list"] });
  }

  if (isLoading || !quiz) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/dashboard/quizzes"><ArrowLeft className="h-4 w-4" /> Back to quizzes</Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {quiz.status === "draft" ? (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Quiz name</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Quiz name"
                  className="max-w-md text-lg font-semibold"
                />
                <Badge variant="secondary">{quiz.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Edit the name above, then click Save or Publish.</p>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{quiz.title}</h1>
              <Badge variant="secondary" className={cn(quiz.status === "published" && "bg-success/15 text-success", quiz.status === "closed" && "bg-destructive/10 text-destructive")}>{quiz.status}</Badge>
            </div>
          )}
          <p className="mt-1 text-sm capitalize text-muted-foreground">{quiz.type} · {quiz.difficulty} · {quiz.duration_minutes} min · {questions.length} questions</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={saveAll} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </Button>
          {quiz.status !== "draft" && (
            <Button variant="outline" asChild>
              <Link to="/dashboard/quiz/$quizId/results" params={{ quizId }}><BarChart3 className="h-4 w-4" /> Results</Link>
            </Button>
          )}
          {quiz.status === "draft" && (
            <Button onClick={() => setStatus("published")} disabled={publishing} className="bg-gradient-primary hover:opacity-90">
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Publish
            </Button>
          )}
          {quiz.status === "published" && (
            <>
              <Button asChild className="bg-gradient-primary hover:opacity-90"><Link to="/dashboard/quiz/$quizId/live" params={{ quizId }}><Radio className="h-4 w-4" /> Live view</Link></Button>
              <Button variant="outline" onClick={() => setStatus("closed")} disabled={publishing}><Lock className="h-4 w-4" /> Close</Button>
            </>
          )}
          {quiz.status === "closed" && (
            <Button variant="outline" onClick={() => setStatus("published")} disabled={publishing}>Reopen</Button>
          )}
        </div>
      </div>

      {quiz.status !== "draft" && shareUrl && (
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-semibold"><QrCode className="h-4 w-4 text-primary" /> Share this quiz</h2>
          <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(shareUrl)}`}
              alt="Quiz QR code"
              width={160}
              height={160}
              className="rounded-xl border border-border"
            />
            <div className="flex-1 space-y-3">
              <div className="flex gap-2">
                <Input readOnly value={shareUrl} className="font-mono text-sm" />
                <Button variant="outline" onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Link copied!"); }}>
                  <Copy className="h-4 w-4" /> Copy
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Students open this link, enter their details, and attempt the quiz — no login needed.</p>
              <Button variant="outline" size="sm" asChild>
                <a href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(shareUrl)}&download=1`} download>
                  <QrCode className="h-4 w-4" /> Download QR
                </a>
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {questions.map((q, idx) => (
          <Card key={q.id} className="p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-muted-foreground">Question {idx + 1}</span>
              <Button variant="ghost" size="icon" onClick={() => removeQuestion(idx)} className="text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              value={q.question_text}
              onChange={(e) => update(idx, { question_text: e.target.value })}
              placeholder="Enter the question"
              className="mt-2"
            />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {q.options.map((opt, oi) => (
                <button
                  type="button"
                  key={oi}
                  onClick={() => update(idx, { correct_index: oi })}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors",
                    q.correct_index === oi ? "border-success bg-success/10" : "border-border",
                  )}
                >
                  <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs", q.correct_index === oi ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground")}>
                    {q.correct_index === oi ? <Check className="h-3 w-3" /> : String.fromCharCode(65 + oi)}
                  </span>
                  <Input
                    value={opt}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateOption(idx, oi, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                    className="h-8 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                  />
                </button>
              ))}
            </div>
            <div className="mt-3 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Explanation</Label>
              <Textarea value={q.explanation} onChange={(e) => update(idx, { explanation: e.target.value })} placeholder="Why is this the correct answer?" className="min-h-[60px]" />
            </div>
          </Card>
        ))}
      </div>

      <Button variant="outline" onClick={addQuestion} className="w-full border-dashed">
        <Plus className="h-4 w-4" /> Add custom question
      </Button>
    </div>
  );
}