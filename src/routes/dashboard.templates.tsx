import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { BookMarked, Loader2, Copy, Trash2, Clock, Library } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cloneTemplateToBatch } from "@/lib/library";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

export const Route = createFileRoute("/dashboard/templates")({
  head: () => ({ meta: [{ title: "Template Library — Datapro QuizHub" }] }),
  component: TemplatesPage,
});

interface Template {
  id: string;
  title: string;
  topic_name: string;
  type: string;
  difficulty: string;
  num_questions: number;
  duration_minutes: number;
}

function TemplatesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [cloneTarget, setCloneTarget] = useState<Template | null>(null);
  const [batchId, setBatchId] = useState("");
  const [title, setTitle] = useState("");
  const [cloning, setCloning] = useState(false);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const { data } = await supabase
        .from("quiz_templates")
        .select("id, title, topic_name, type, difficulty, num_questions, duration_minutes")
        .order("created_at", { ascending: false });
      return (data as Template[]) ?? [];
    },
  });

  const { data: batches } = useQuery({
    queryKey: ["batches-mini"],
    queryFn: async () => {
      const { data } = await supabase.from("batches").select("id, name").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  function openClone(t: Template) {
    setCloneTarget(t);
    setTitle(t.title);
    setBatchId("");
  }

  async function handleClone() {
    if (!user || !cloneTarget) return;
    if (!batchId) return toast.error("Choose a batch to clone into.");
    setCloning(true);
    try {
      const quizId = await cloneTemplateToBatch(cloneTarget.id, {
        trainerId: user.id,
        batchId,
        title,
      });
      toast.success("Cloned! A fresh, independent quiz was created.");
      setCloneTarget(null);
      navigate({ to: "/dashboard/quiz/$quizId", params: { quizId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Clone failed");
    } finally {
      setCloning(false);
    }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("quiz_templates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Template deleted.");
    qc.invalidateQueries({ queryKey: ["templates"] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Template Library</h1>
        <p className="text-sm text-muted-foreground">Reusable quizzes you can clone into any batch. Each clone keeps its own separate submissions and results.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : templates && templates.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BookMarked className="h-5 w-5" />
                </span>
                <Button variant="ghost" size="icon" onClick={() => remove(t.id)} className="text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <h3 className="mt-3 line-clamp-2 font-semibold leading-tight">{t.title}</h3>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="capitalize">{t.difficulty}</span>
                <span>{t.num_questions} Qs</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {t.duration_minutes}m</span>
              </div>
              <Button onClick={() => openClone(t)} size="sm" className="mt-4 bg-gradient-primary hover:opacity-90">
                <Copy className="h-3.5 w-3.5" /> Clone into batch
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Library className="h-7 w-7" /></span>
          <p className="font-medium">No templates yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">Open any quiz and use <b className="text-foreground">Save as template</b> to add it here for reuse.</p>
        </Card>
      )}

      <Dialog open={!!cloneTarget} onOpenChange={(o) => !o && setCloneTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone template into a batch</DialogTitle>
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
              The clone shares this template's question set but starts with zero submissions — its leaderboard, analytics, and student results stay completely separate.
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