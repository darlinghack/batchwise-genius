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

  const stats = useMemo(() => {
    if (rows.length === 0) return null;
    const avg = (key: keyof FeedbackRow) => {
      const vals = rows
        .map((r) => r[key] as number | null)
        .filter((v): v is number => typeof v === "number" && v > 0);
      if (vals.length === 0) return null;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };
    const dist = (key: keyof FeedbackRow) => {
      const counts = new Map<string, number>();
      rows.forEach((r) => {
        const v = r[key] as string | null;
        if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
      });
      return [...counts.entries()].sort((a, b) => b[1] - a[1]);
    };
    return {
      overall: [
        { label: "Course", value: avg("course_rating") },
        { label: "Trainer", value: avg("trainer_rating") },
        { label: "Organization", value: avg("organization_rating") },
        { label: "Satisfaction", value: avg("satisfaction_rating") },
      ],
      faculty: FACULTY_ROWS.map((f) => ({
        label: f.label,
        value: avg(`faculty_${f.key}` as keyof FeedbackRow),
        max: 4,
      })),
      impact: IMPACT_ROWS.map((f) => ({
        label: f.label,
        value: avg(`impact_${f.key}` as keyof FeedbackRow),
        max: 4,
      })),
      choices: [
        { label: "Pace of teaching", items: dist("teaching_pace") },
        { label: "Study materials", items: dist("resources_usefulness") },
        { label: "Practical tasks", items: dist("task_completion") },
        { label: "Daily quizzes", items: dist("quizzes_usefulness") },
      ].filter((c) => c.items.length > 0),
      custom: customFields.map((f) => {
        const vals = rows
          .map((r) => r.custom_answers?.[f.id])
          .filter((v) => v !== undefined && v !== "");
        if (f.type === "stars" || f.type === "scale") {
          const nums = vals.map(Number).filter((n) => !Number.isNaN(n));
          return {
            id: f.id,
            label: f.label,
            type: "numeric" as const,
            value: nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null,
            count: nums.length,
            items: [] as [string, number][],
          };
        }
        const counts = new Map<string, number>();
        vals.forEach((v) => {
          const s = String(v);
          counts.set(s, (counts.get(s) ?? 0) + 1);
        });
        return {
          id: f.id,
          label: f.label,
          type: (f.type === "text" ? "text" : "choice") as "text" | "choice",
          value: null,
          count: vals.length,
          items: [...counts.entries()].sort((a, b) => b[1] - a[1]),
        };
      }),
      suggestionCount: rows.filter((r) => r.suggestions?.trim()).length,
    };
  }, [rows, customFields]);


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
        <>
          {stats && (
            <div className="mb-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {stats.overall.map((s) => (
                  <div key={s.label} className="rounded-lg border border-border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-lg font-semibold">
                      {s.value === null ? "—" : s.value.toFixed(1)}
                      {s.value !== null && (
                        <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                      )}
                      {s.value !== null && (
                        <span className="text-xs font-normal text-muted-foreground">/5</span>
                      )}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <StatGroup title="Faculty averages" items={stats.faculty} />
                <StatGroup title="Knowledge &amp; skill impact averages" items={stats.impact} />
              </div>

              {stats.choices.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {stats.choices.map((c) => (
                    <div key={c.label} className="rounded-lg border border-border p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {c.label}
                      </p>
                      {c.items.map(([label, count]) => (
                        <DistBar
                          key={label}
                          label={label}
                          count={count}
                          total={rows.length}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {stats.custom.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {stats.custom.map((c) => (
                    <div key={c.id} className="rounded-lg border border-border p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {c.label}
                      </p>
                      {c.type === "numeric" ? (
                        <p className="text-lg font-semibold">
                          {c.value === null ? "—" : c.value.toFixed(1)}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            avg · {c.count} responses
                          </span>
                        </p>
                      ) : c.type === "text" ? (
                        <p className="text-sm text-muted-foreground">
                          {c.count} text {c.count === 1 ? "response" : "responses"} — open a
                          respondent to read
                        </p>
                      ) : (
                        c.items.map(([label, count]) => (
                          <DistBar
                            key={label}
                            label={label}
                            count={count}
                            total={rows.length}
                          />
                        ))
                      )}
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {stats.suggestionCount} of {rows.length} respondents left written suggestions.
              </p>
            </div>
          )}

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
        </>
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
