import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  ArrowLeft,
  Loader2,
  Trophy,
  Sparkles,
  Download,
  Crown,
  Medal,
  TrendingUp,
  Send,
  AlertTriangle,
  CheckCircle2,
  Star,
  MessageSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getBatchInsight } from "@/lib/quiz.functions";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/quiz/$quizId/results")({
  head: () => ({ meta: [{ title: "Quiz results — Datapro QuizHub" }] }),
  component: QuizResults,
});

interface Sub {
  id: string;
  student_name: string;
  student_email: string;
  phone: string;
  address: string;
  roll_number: string;
  college_name: string;
  score: number;
  total: number;
  percentage: number;
  time_taken_seconds: number;
  submitted_at: string;
  answers: { questionId: string; selected: number }[];
  feedback_rating: number | null;
  feedback_text: string;
}


interface Q {
  id: string;
  question_text: string;
  correct_index: number;
  position: number;
}

function QuizResults() {
  const { quizId } = Route.useParams();
  const insightFn = useServerFn(getBatchInsight);
  const [insight, setInsight] = useState("");
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [search, setSearch] = useState("");
  const [college, setCollege] = useState("all");
  const [minPct, setMinPct] = useState<string>("");
  const [maxPct, setMaxPct] = useState<string>("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");


  const { data: quiz } = useQuery({
    queryKey: ["quiz-results-meta", quizId],
    queryFn: async () => {
      const { data } = await supabase
        .from("quizzes")
        .select("id, title, topic_name, type, difficulty, num_questions, batch_id")
        .eq("id", quizId)
        .maybeSingle();
      return data;
    },
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["quiz-results", quizId],
    queryFn: async () => {
      const [subs, questions] = await Promise.all([
        supabase
          .from("submissions")
          .select("id, student_name, student_email, phone, address, roll_number, college_name, score, total, percentage, time_taken_seconds, submitted_at, answers, feedback_rating, feedback_text")
          .eq("quiz_id", quizId),
        supabase
          .from("questions")
          .select("id, question_text, correct_index, position")
          .eq("quiz_id", quizId)
          .order("position", { ascending: true }),
      ]);
      return {
        subs: (subs.data as unknown as Sub[]) ?? [],
        questions: (questions.data as Q[]) ?? [],
      };
    },
  });

  // realtime — scoped strictly to this quiz instance
  useEffect(() => {
    const channel = supabase
      .channel(`results-${quizId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "submissions", filter: `quiz_id=eq.${quizId}` },
        () => refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [quizId, refetch]);

  const allSubs = data?.subs ?? [];
  const questions = data?.questions ?? [];

  // ---- filters ----
  const colleges = Array.from(
    new Set(allSubs.map((s) => (s.college_name ?? "").trim()).filter(Boolean)),
  ).sort();

  const subs = allSubs.filter((s) => {
    const q = search.trim().toLowerCase();
    if (q) {
      const hay = `${s.student_name} ${s.student_email} ${s.roll_number ?? ""} ${s.college_name ?? ""} ${s.phone ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (college !== "all" && (s.college_name ?? "").trim() !== college) return false;
    const pct = Number(s.percentage);
    if (minPct !== "" && pct < Number(minPct)) return false;
    if (maxPct !== "" && pct > Number(maxPct)) return false;
    if (fromDate && new Date(s.submitted_at) < new Date(`${fromDate}T00:00:00`)) return false;
    if (toDate && new Date(s.submitted_at) > new Date(`${toDate}T23:59:59`)) return false;
    return true;
  });

  const filtersActive =
    !!search.trim() || college !== "all" || minPct !== "" || maxPct !== "" || !!fromDate || !!toDate;

  function clearFilters() {
    setSearch("");
    setCollege("all");
    setMinPct("");
    setMaxPct("");
    setFromDate("");
    setToDate("");
  }

  const attempts = subs.length;
  const avg = attempts ? Math.round(subs.reduce((a, s) => a + Number(s.percentage), 0) / attempts) : 0;
  const high = attempts ? Math.round(Math.max(...subs.map((s) => Number(s.percentage)))) : 0;
  const passed = subs.filter((s) => Number(s.percentage) >= 60).length;
  const passPct = attempts ? Math.round((passed / attempts) * 100) : 0;

  const ranked = [...subs].sort((a, b) =>
    b.percentage !== a.percentage ? b.percentage - a.percentage : a.time_taken_seconds - b.time_taken_seconds,
  );

  // score distribution buckets
  const buckets = [
    { name: "0–20", min: 0, max: 20 },
    { name: "21–40", min: 20, max: 40 },
    { name: "41–60", min: 40, max: 60 },
    { name: "61–80", min: 60, max: 80 },
    { name: "81–100", min: 80, max: 100.01 },
  ];
  const distribution = buckets.map((b) => ({
    name: b.name,
    count: subs.filter((s) => Number(s.percentage) > b.min && Number(s.percentage) <= b.max).length,
  }));
  // include exactly-0 scores in the first bucket
  distribution[0].count += subs.filter((s) => Number(s.percentage) === 0).length;

  // question-wise analysis
  const questionStats = questions.map((q, i) => {
    let correct = 0;
    let answered = 0;
    subs.forEach((s) => {
      const a = (s.answers ?? []).find((x) => x.questionId === q.id);
      if (a && a.selected >= 0) {
        answered += 1;
        if (a.selected === q.correct_index) correct += 1;
      }
    });
    const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
    return { idx: i + 1, question_text: q.question_text, accuracy, correct, answered };
  });
  const hardest = [...questionStats].filter((q) => q.answered > 0).sort((a, b) => a.accuracy - b.accuracy);

  // feedback stats
  const rated = subs.filter((s) => typeof s.feedback_rating === "number" && s.feedback_rating! > 0);
  const avgRating = rated.length
    ? Math.round((rated.reduce((a, s) => a + (s.feedback_rating ?? 0), 0) / rated.length) * 10) / 10
    : 0;
  const comments = subs.filter((s) => (s.feedback_text ?? "").trim().length > 0);
  const ratingDist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: rated.filter((s) => s.feedback_rating === star).length,
  }));

  const barColor = (v: number) =>
    v >= 70 ? "oklch(0.62 0.16 155)" : v >= 40 ? "oklch(0.7 0.16 70)" : "oklch(0.58 0.23 27)";

  async function generateInsight() {
    setLoadingInsight(true);
    const weak = hardest.slice(0, 4).map((q) => `Q${q.idx} (${q.accuracy}%)`).join(", ");
    const ctx = `Quiz "${quiz?.title}". Attempts: ${attempts}. Average: ${avg}%. Pass rate: ${passPct}%. Hardest questions: ${weak || "none"}.`;
    try {
      const res = await insightFn({ data: { context: ctx } });
      if (res.insight) setInsight(res.insight);
      else toast.error(res.error || "Could not generate insight");
    } finally {
      setLoadingInsight(false);
    }
  }

  function exportCsv() {
    const rows = [[
      "Rank", "Student", "Email", "Phone", "Roll number", "College", "Address",
      "Score", "Total", "Percentage", "Time (s)", "Submitted at",
      "Feedback rating", "Feedback",
    ]];
    ranked.forEach((s, i) =>
      rows.push([
        String(i + 1),
        s.student_name,
        s.student_email,
        s.phone ?? "",
        s.roll_number ?? "",
        s.college_name ?? "",
        s.address ?? "",
        String(s.score),
        String(s.total),
        String(s.percentage),
        String(s.time_taken_seconds),
        s.submitted_at ? new Date(s.submitted_at).toLocaleString() : "",
        s.feedback_rating ? String(s.feedback_rating) : "",
        s.feedback_text ?? "",
      ]),
    );
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${quiz?.title ?? "quiz"}-results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }


  const rankIcon = (i: number) =>
    i === 0 ? <Crown className="h-4 w-4 text-warning" /> : i === 1 ? <Medal className="h-4 w-4 text-muted-foreground" /> : i === 2 ? <Medal className="h-4 w-4 text-chart-5" /> : null;

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/dashboard/quiz/$quizId" params={{ quizId }}><ArrowLeft className="h-4 w-4" /> Back to quiz</Link>
        </Button>
        <div className="flex gap-2">
          {quiz?.batch_id && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/batches/$batchId/analytics" params={{ batchId: quiz.batch_id }}>Batch analytics</Link>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!attempts}><Download className="h-4 w-4" /> Export</Button>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{quiz?.title ?? "Quiz results"}</h1>
          {quiz && <Badge variant="secondary" className="capitalize">{quiz.difficulty}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">Isolated results for this quiz instance only — never merged with other quizzes.</p>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-semibold"><Filter className="h-4 w-4 text-primary" /> Filters</h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{subs.length} of {allSubs.length} submissions</span>
            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-3.5 w-3.5" /> Clear</Button>
            )}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 lg:col-span-2">
            <Label className="text-xs">Search name, email, roll no, college</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search candidates…" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">College</Label>
            <Select value={college} onValueChange={setCollege}>
              <SelectTrigger><SelectValue placeholder="All colleges" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All colleges</SelectItem>
                {colleges.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Score range (%)</Label>
            <div className="flex items-center gap-2">
              <Input type="number" min={0} max={100} value={minPct} onChange={(e) => setMinPct(e.target.value)} placeholder="Min" />
              <Input type="number" min={0} max={100} value={maxPct} onChange={(e) => setMaxPct(e.target.value)} placeholder="Max" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">From date</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To date</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="font-semibold">Submission sheet</h2>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!subs.length}>
            <Download className="h-4 w-4" /> Download sheet
          </Button>
        </div>
        <div className="max-h-96 overflow-auto">
          {ranked.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No submissions match these filters.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Candidate</th>
                  <th className="px-4 py-2 text-left">Roll no</th>
                  <th className="px-4 py-2 text-left">College</th>
                  <th className="px-4 py-2 text-left">Phone</th>
                  <th className="px-4 py-2 text-right">Score</th>
                  <th className="px-4 py-2 text-right">Time</th>
                  <th className="px-4 py-2 text-left">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ranked.map((s, i) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-2">
                      <p className="font-medium">{s.student_name}</p>
                      <p className="text-xs text-muted-foreground">{s.student_email}</p>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{s.roll_number || "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground">{s.college_name || "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground">{s.phone || "—"}</td>
                    <td className="px-4 py-2 text-right font-semibold text-primary">
                      {Math.round(Number(s.percentage))}%
                      <span className="ml-1 text-xs font-normal text-muted-foreground">{s.score}/{s.total}</span>
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground">
                      {Math.floor(s.time_taken_seconds / 60)}m {s.time_taken_seconds % 60}s
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {s.submitted_at ? new Date(s.submitted_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>



      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Submissions" value={attempts} icon={Send} />
        <StatCard label="Average Score" value={`${avg}%`} icon={TrendingUp} accent="success" />
        <StatCard label="Highest" value={`${high}%`} icon={Trophy} accent="chart-3" />
        <StatCard label="Pass Rate" value={`${passPct}%`} icon={CheckCircle2} accent="warning" />
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-primary" /> AI Insights</h2>
          <Button size="sm" onClick={generateInsight} disabled={loadingInsight || !attempts} className="bg-gradient-primary hover:opacity-90">
            {loadingInsight ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate
          </Button>
        </div>
        {insight ? (
          <p className="rounded-lg bg-accent/40 p-4 text-sm leading-relaxed">{insight}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Generate an AI summary of this quiz's strengths, weak questions, and recommendations.</p>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Score Distribution</h2>
          <div className="h-64">
            {attempts ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution} margin={{ left: -20, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.012 255)" vertical={false} />
                  <XAxis dataKey="name" stroke="oklch(0.55 0.035 257)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} stroke="oklch(0.55 0.035 257)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.012 255)", fontSize: 12 }} />
                  <Bar dataKey="count" name="Students" radius={[6, 6, 0, 0]} fill="oklch(0.52 0.21 263)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No submissions yet</div>
            )}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-gradient-hero p-5 text-primary-foreground">
            <div className="flex items-center gap-2 font-semibold"><Trophy className="h-5 w-5" /> Leaderboard</div>
            <Badge variant="secondary" className="bg-white/20 text-primary-foreground">{attempts} ranked</Badge>
          </div>
          <div className="max-h-64 divide-y divide-border overflow-y-auto">
            {ranked.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No submissions yet.</p>
            ) : (
              ranked.slice(0, 25).map((s, i) => (
                <div key={s.id} className={cn("flex items-center gap-3 px-5 py-2.5", i < 3 && "bg-primary/5")}>
                  <div className="flex w-7 items-center justify-center font-bold text-muted-foreground">{rankIcon(i) ?? i + 1}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.student_name}</p>
                    <p className="text-xs text-muted-foreground">{Math.floor(s.time_taken_seconds / 60)}m {s.time_taken_seconds % 60}s</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{Math.round(Number(s.percentage))}%</p>
                    <p className="text-xs text-muted-foreground">{s.score}/{s.total}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-warning" /> Question-wise Analysis</h2>
        {questionStats.length === 0 ? (
          <p className="text-sm text-muted-foreground">This quiz has no questions.</p>
        ) : attempts === 0 ? (
          <p className="text-sm text-muted-foreground">Accuracy will appear once students submit.</p>
        ) : (
          <div className="space-y-3">
            {questionStats.map((q) => (
              <div key={q.idx} className="flex items-center gap-3">
                <span className="w-8 shrink-0 text-xs font-semibold text-muted-foreground">Q{q.idx}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{q.question_text}</p>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${q.accuracy}%`, background: barColor(q.accuracy) }} />
                  </div>
                </div>
                <span className="w-20 shrink-0 text-right text-sm font-semibold" style={{ color: barColor(q.accuracy) }}>
                  {q.accuracy}%
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-semibold"><Star className="h-4 w-4 text-warning" /> Student Feedback</h2>
          {rated.length > 0 && (
            <div className="flex items-center gap-1.5 text-sm">
              <Star className="h-4 w-4 fill-warning text-warning" />
              <span className="font-bold">{avgRating}</span>
              <span className="text-muted-foreground">/ 5 · {rated.length} rating{rated.length > 1 ? "s" : ""}</span>
            </div>
          )}
        </div>

        {rated.length === 0 && comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No feedback submitted yet.</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-2">
              {ratingDist.map((r) => {
                const pct = rated.length ? Math.round((r.count / rated.length) * 100) : 0;
                return (
                  <div key={r.star} className="flex items-center gap-3">
                    <span className="flex w-10 shrink-0 items-center gap-0.5 text-xs font-semibold text-muted-foreground">{r.star} <Star className="h-3 w-3 fill-warning text-warning" /></span>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-warning" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs text-muted-foreground">{r.count}</span>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><MessageSquare className="h-4 w-4" /> Comments ({comments.length})</p>
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No written comments yet.</p>
              ) : (
                <div className="max-h-64 space-y-3 overflow-y-auto">
                  {comments.map((s) => (
                    <div key={s.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{s.student_name}</p>
                        {typeof s.feedback_rating === "number" && s.feedback_rating > 0 && (
                          <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-warning">
                            {s.feedback_rating} <Star className="h-3 w-3 fill-warning text-warning" />
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{s.feedback_text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}