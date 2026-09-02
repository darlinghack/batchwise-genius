import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  normalizeFeedbackForm,
  FACULTY_ROWS,
  IMPACT_ROWS,
  GRID4,
  IMPACT4,
} from "@/lib/feedback-form";

interface FeedbackRow {
  id: string;
  student_name: string;
  student_email: string;
  section: string | null;
  faculty_clarity: number | null;
  faculty_engagement: number | null;
  faculty_expertise: number | null;
  faculty_answering: number | null;
  teaching_pace: string | null;
  resources_usefulness: string | null;
  task_completion: string | null;
  quizzes_usefulness: string | null;
  impact_clarity: number | null;
  impact_relevance: number | null;
  impact_skill: number | null;
  impact_knowledge: number | null;
  course_rating: number | null;
  trainer_rating: number | null;
  organization_rating: number | null;
  satisfaction_rating: number | null;
  suggestions: string;
  created_at: string;
  custom_answers: Record<string, string | number> | null;
}

function gridLabel(scale: { label: string; value: number }[], v: number | null) {
  if (!v) return "—";
  return scale.find((s) => s.value === v)?.label ?? String(v);
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

function Stars({ v }: { v: number | null }) {
  if (!v) return <span>—</span>;
  return (
    <span className="inline-flex items-center gap-0.5 text-warning">
      {v} <Star className="h-3.5 w-3.5 fill-warning text-warning" />
    </span>
  );
}

export function FeedbackResponses({ quizId }: { quizId: string }) {
  const [open, setOpen] = useState<FeedbackRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["quiz-internship-feedback", quizId],
    queryFn: async () => {
      const [fb, quiz] = await Promise.all([
        supabase
          .from("internship_feedback")
          .select("*")
          .eq("quiz_id", quizId)
          .order("created_at", { ascending: false }),
        supabase
          .from("quizzes")
          .select("feedback_form, batch_id")
          .eq("id", quizId)
          .maybeSingle(),
      ]);

      let formJson: unknown = quiz.data?.feedback_form ?? null;
      if (!formJson && quiz.data?.batch_id) {
        const { data: batch } = await supabase
          .from("batches")
          .select("feedback_form")
          .eq("id", quiz.data.batch_id)
          .maybeSingle();
        formJson = batch?.feedback_form ?? null;
      }

      return {
        rows: (fb.data as unknown as FeedbackRow[]) ?? [],
        form: normalizeFeedbackForm(formJson),
      };
    },
  });

  const rows = data?.rows ?? [];
  const form = data?.form;
  const customFields = useMemo(() => form?.custom ?? [], [form]);

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <ClipboardList className="h-4 w-4 text-primary" /> Feedback Responses
        </h2>
        <Badge variant="secondary">{rows.length}</Badge>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading feedback…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No detailed feedback submitted for this quiz yet.
        </p>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {rows.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setOpen(r)}
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.student_name || "Anonymous"}</p>
                <p className="truncate text-xs text-muted-foreground">{r.student_email}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {r.section && <Badge variant="outline">{r.section}</Badge>}
                {r.satisfaction_rating ? <Stars v={r.satisfaction_rating} /> : null}
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>{open.student_name || "Anonymous"}</DialogTitle>
                <DialogDescription>
                  {open.student_email} · {new Date(open.created_at).toLocaleString()}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                <section>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    General
                  </p>
                  {open.section && <Row label="Section / branch" value={open.section} />}
                  <Row label="Pace of teaching" value={open.teaching_pace || "—"} />
                  <Row label="Study materials" value={open.resources_usefulness || "—"} />
                  <Row label="Practical tasks" value={open.task_completion || "—"} />
                  <Row label="Daily quizzes" value={open.quizzes_usefulness || "—"} />
                </section>

                <section>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Faculty
                  </p>
                  {FACULTY_ROWS.map((f) => (
                    <Row
                      key={f.key}
                      label={f.label}
                      value={gridLabel(
                        GRID4,
                        (open[`faculty_${f.key}` as keyof FeedbackRow] as number | null) ?? null,
                      )}
                    />
                  ))}
                </section>

                <section>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Knowledge &amp; skill impact
                  </p>
                  {IMPACT_ROWS.map((f) => (
                    <Row
                      key={f.key}
                      label={f.label}
                      value={gridLabel(
                        IMPACT4,
                        (open[`impact_${f.key}` as keyof FeedbackRow] as number | null) ?? null,
                      )}
                    />
                  ))}
                </section>

                <section>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Overall ratings
                  </p>
                  <Row label="Course" value={<Stars v={open.course_rating} />} />
                  <Row label="Trainer" value={<Stars v={open.trainer_rating} />} />
                  <Row label="Organization" value={<Stars v={open.organization_rating} />} />
                  <Row label="Satisfaction" value={<Stars v={open.satisfaction_rating} />} />
                </section>

                {customFields.length > 0 && (
                  <section>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Custom questions
                    </p>
                    {customFields.map((f) => {
                      const v = open.custom_answers?.[f.id];
                      return (
                        <Row
                          key={f.id}
                          label={f.label}
                          value={
                            v === undefined || v === "" ? (
                              "—"
                            ) : f.type === "stars" ? (
                              <Stars v={Number(v)} />
                            ) : (
                              String(v)
                            )
                          }
                        />
                      );
                    })}
                  </section>
                )}

                {open.suggestions?.trim() && (
                  <section>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Suggestions
                    </p>
                    <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm">
                      {open.suggestions}
                    </p>
                  </section>
                )}
              </div>

              <Button variant="outline" onClick={() => setOpen(null)}>
                Close
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
