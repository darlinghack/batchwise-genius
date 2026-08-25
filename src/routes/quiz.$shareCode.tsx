import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Trophy,
  CheckCircle2,
  XCircle,
  Sparkles,
  GraduationCap,
  Star,
} from "lucide-react";
import { getPublicQuiz, submitQuiz } from "@/lib/quiz.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/quiz/$shareCode")({
  head: () => ({ meta: [{ title: "Attempt Quiz — Datapro QuizHub" }] }),
  component: PublicQuiz,
});

type Result = Awaited<ReturnType<typeof submitQuiz>>;

// ---- Internship feedback option sets ----
const SECTIONS = ["CSD", "CSM", "CSE"] as const;
const GRID4 = [
  { label: "Excellent", value: 4 },
  { label: "Good", value: 3 },
  { label: "Fair", value: 2 },
  { label: "Poor", value: 1 },
];
const IMPACT4 = [
  { label: "Very Helpful", value: 4 },
  { label: "Helpful", value: 3 },
  { label: "Slightly Helpful", value: 2 },
  { label: "Not Helpful", value: 1 },
];
const PACE = ["Too Fast", "Just Right", "Too Slow"];
const USEFUL = ["Very Useful", "Useful", "Slightly Useful", "Not Useful"];
const TASKS = ["Yes, all of them", "Most of them", "Some of them", "No, very few/none"];
const FACULTY_ROWS = [
  { key: "clarity", label: "Clarity of concepts" },
  { key: "engagement", label: "Engagement / interaction" },
  { key: "expertise", label: "Expertise in topics" },
  { key: "answering", label: "Answering questions effectively" },
] as const;
const IMPACT_ROWS = [
  { key: "clarity", label: "Clarity of concepts" },
  { key: "relevance", label: "Relevance to job / studies" },
  { key: "skill", label: "Skill application" },
  { key: "knowledge", label: "Overall knowledge improvement" },
] as const;

function ChoiceRow({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(value === opt ? "" : opt)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm transition-colors",
              value === opt ? "border-primary bg-primary/5 font-medium text-primary" : "border-border hover:border-primary/40",
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function GridScale({
  title,
  rows,
  options,
  values,
  onChange,
}: {
  title: string;
  rows: readonly { key: string; label: string }[];
  options: { label: string; value: number }[];
  values: Record<string, number>;
  onChange: (key: string, value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{title}</Label>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.key} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm">{row.label}</span>
            <div className="flex flex-wrap gap-1.5">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange(row.key, values[row.key] === opt.value ? 0 : opt.value)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs transition-colors",
                    values[row.key] === opt.value ? "border-primary bg-primary/5 font-medium text-primary" : "border-border hover:border-primary/40",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StarRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? 0 : n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="transition-transform hover:scale-110"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            <Star className={cn("h-6 w-6", (hover || value) >= n ? "fill-warning text-warning" : "text-muted-foreground/40")} />
          </button>
        ))}
      </div>
    </div>
  );
}

function PublicQuiz() {
  const { shareCode } = Route.useParams();
  const fetchQuiz = useServerFn(getPublicQuiz);
  const submit = useServerFn(submitQuiz);

  const { data, isLoading } = useQuery({
    queryKey: ["public-quiz", shareCode],
    queryFn: () => fetchQuiz({ data: { code: shareCode } }),
  });

  const [phase, setPhase] = useState<"info" | "quiz" | "feedback" | "result">("info");
  const [info, setInfo] = useState({ fullName: "", email: "", phone: "", address: "", rollNumber: "", collegeName: "" });
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  // Overall internship feedback
  const [section, setSection] = useState("");
  const [faculty, setFaculty] = useState<Record<string, number>>({});
  const [pace, setPace] = useState("");
  const [resources, setResources] = useState("");
  const [tasks, setTasks] = useState("");
  const [quizUseful, setQuizUseful] = useState("");
  const [impact, setImpact] = useState<Record<string, number>>({});
  const [courseRating, setCourseRating] = useState(0);
  const [trainerRating, setTrainerRating] = useState(0);
  const [orgRating, setOrgRating] = useState(0);
  const [satisfaction, setSatisfaction] = useState(0);
  const [suggestions, setSuggestions] = useState("");
  const startRef = useRef<number>(0);

  const quiz = data?.quiz;
  const questions = data?.questions ?? [];

  // restore autosave
  useEffect(() => {
    const saved = localStorage.getItem(`quiz-${shareCode}`);
    if (saved) {
      try { setAnswers(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, [shareCode]);

  useEffect(() => {
    localStorage.setItem(`quiz-${shareCode}`, JSON.stringify(answers));
  }, [answers, shareCode]);

  const doSubmit = useRef<() => void>(() => {});
  useEffect(() => {
    if (phase !== "quiz" || !quiz) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timer);
          doSubmit.current();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, quiz]);

  function startQuiz(e: React.FormEvent) {
    e.preventDefault();
    if (!info.fullName.trim() || !info.email.trim()) return toast.error("Name and email are required.");
    setSecondsLeft((quiz?.duration_minutes ?? 15) * 60);
    startRef.current = Date.now();
    setPhase("quiz");
  }

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = questions.map((q) => ({ questionId: q.id, selected: answers[q.id] ?? -1 }));
      const isAssessment = !!quiz?.is_assessment;
      const res = await submit({
        data: {
          code: shareCode,
          fullName: info.fullName.trim(),
          email: info.email.trim(),
          phone: info.phone.trim(),
          address: info.address.trim(),
          rollNumber: info.rollNumber.trim(),
          collegeName: info.collegeName.trim(),
          answers: payload,
          timeTakenSeconds: Math.round((Date.now() - startRef.current) / 1000),
          feedbackRating: !isAssessment && rating > 0 ? rating : undefined,
          feedbackText: isAssessment ? "" : feedbackText.trim(),
          internshipFeedback: isAssessment
            ? undefined
            : {
                section: section || undefined,
                facultyClarity: faculty.clarity || undefined,
                facultyEngagement: faculty.engagement || undefined,
                facultyExpertise: faculty.expertise || undefined,
                facultyAnswering: faculty.answering || undefined,
                teachingPace: pace || undefined,
                resourcesUsefulness: resources || undefined,
                taskCompletion: tasks || undefined,
                quizzesUsefulness: quizUseful || undefined,
                impactClarity: impact.clarity || undefined,
                impactRelevance: impact.relevance || undefined,
                impactSkill: impact.skill || undefined,
                impactKnowledge: impact.knowledge || undefined,
                courseRating: courseRating || undefined,
                trainerRating: trainerRating || undefined,
                organizationRating: orgRating || undefined,
                satisfactionRating: satisfaction || undefined,
                suggestions: suggestions.trim() || undefined,
              },
        },
      });

      setResult(res);
      localStorage.removeItem(`quiz-${shareCode}`);
      setPhase("result");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }
  doSubmit.current = handleSubmit;

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!quiz) {
    const msg =
      data?.reason === "closed" ? "This quiz has been closed by the trainer."
      : data?.reason === "draft" ? "This quiz isn't published yet."
      : "Quiz not found. Please check the link.";
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-subtle p-6">
        <Card className="max-w-sm p-8 text-center">
          <GraduationCap className="mx-auto h-10 w-10 text-primary" />
          <p className="mt-4 font-medium">{msg}</p>
        </Card>
      </div>
    );
  }

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Logo />
          {phase === "quiz" && (
            <div className={cn("flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold", secondsLeft < 60 ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
              <Clock className="h-4 w-4" /> {mins}:{String(secs).padStart(2, "0")}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {phase === "info" && (
          <Card className="p-6 sm:p-8 animate-fade-in-up">
            <h1 className="text-2xl font-bold tracking-tight">{quiz.title}</h1>
            <p className="mt-1 text-sm capitalize text-muted-foreground">
              {quiz.is_assessment ? "assessment" : quiz.type} · {quiz.difficulty} · {questions.length} questions · {quiz.duration_minutes} min
            </p>
            {quiz.hide_results && (
              <p className="mt-3 rounded-lg bg-accent/40 p-3 text-sm text-muted-foreground">
                This is an evaluated assessment. Your answers are recorded, but scores and correct answers are not shown — the team will contact shortlisted candidates.
              </p>
            )}
            <form onSubmit={startQuiz} className="mt-6 space-y-4">
              <div className="space-y-2"><Label>Full name *</Label><Input value={info.fullName} onChange={(e) => setInfo({ ...info, fullName: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Email *</Label><Input type="email" value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} required /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Phone number</Label><Input value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} placeholder="10-digit mobile" /></div>
                <div className="space-y-2"><Label>Roll number</Label><Input value={info.rollNumber} onChange={(e) => setInfo({ ...info, rollNumber: e.target.value })} /></div>
                <div className="space-y-2"><Label>College name (if applicable)</Label><Input value={info.collegeName} onChange={(e) => setInfo({ ...info, collegeName: e.target.value })} /></div>
                <div className="space-y-2"><Label>Address</Label><Input value={info.address} onChange={(e) => setInfo({ ...info, address: e.target.value })} placeholder="City / area" /></div>
              </div>
              <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90">
                {quiz.is_assessment ? "Start assessment" : "Start quiz"}
              </Button>
            </form>
          </Card>
        )}


        {phase === "quiz" && questions[current] && (
          <div className="animate-fade-in-up">
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
                <span>Question {current + 1} of {questions.length}</span>
                <span>{answeredCount} answered</span>
              </div>
              <Progress value={((current + 1) / questions.length) * 100} />
            </div>
            <Card className="p-6">
              <p className="text-lg font-medium">{questions[current].question_text}</p>
              <div className="mt-5 space-y-2.5">
                {questions[current].options.map((opt, oi) => {
                  const qid = questions[current].id;
                  const selected = answers[qid] === oi;
                  return (
                    <button
                      key={oi}
                      onClick={() => setAnswers({ ...answers, [qid]: oi })}
                      className={cn("flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all", selected ? "border-primary bg-primary/5 shadow-elegant" : "border-border hover:border-primary/40")}
                    >
                      <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-medium", selected ? "bg-gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{String.fromCharCode(65 + oi)}</span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
            <div className="mt-5 flex items-center justify-between">
              <Button variant="outline" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              {current < questions.length - 1 ? (
                <Button onClick={() => setCurrent((c) => c + 1)} className="bg-gradient-primary hover:opacity-90">Next <ChevronRight className="h-4 w-4" /></Button>
              ) : quiz.is_assessment ? (
                <Button onClick={handleSubmit} disabled={submitting} className="bg-gradient-primary hover:opacity-90">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />} Submit assessment
                </Button>
              ) : (
                <Button onClick={() => setPhase("feedback")} className="bg-gradient-primary hover:opacity-90">
                  <Trophy className="h-4 w-4" /> Finish quiz
                </Button>
              )}

            </div>
          </div>
        )}

        {phase === "feedback" && (
          <Card className="p-6 sm:p-8 animate-fade-in-up">
            <h1 className="text-2xl font-bold tracking-tight">Internship Feedback</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your feedback on the overall internship helps us improve future sessions. All fields are optional — share what you can.
            </p>

            {/* Quick quiz rating */}
            <div className="mt-6 rounded-xl border border-border p-4">
              <Label>Rate this quiz</Label>
              <div className="mt-2 flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(rating === n ? 0 : n)}
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110"
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  >
                    <Star className={cn("h-7 w-7", (hoverRating || rating) >= n ? "fill-warning text-warning" : "text-muted-foreground/40")} />
                  </button>
                ))}
              </div>
              <div className="mt-3 space-y-2">
                <Label>Comments about this quiz</Label>
                <Textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="What did you like or what could be better?"
                  rows={3}
                  maxLength={1000}
                />
              </div>
            </div>

            <div className="my-6 border-t border-border" />
            <h2 className="text-lg font-semibold">About the overall internship</h2>

            <div className="mt-4 space-y-6">
              <ChoiceRow label="Your section / branch" options={[...SECTIONS]} value={section} onChange={setSection} />

              <GridScale
                title="How would you rate the faculty's teaching quality?"
                rows={FACULTY_ROWS}
                options={GRID4}
                values={faculty}
                onChange={(k, v) => setFaculty((p) => ({ ...p, [k]: v }))}
              />

              <ChoiceRow label="How was the pace of teaching?" options={PACE} value={pace} onChange={setPace} />
              <ChoiceRow label="How useful were the study materials / resources?" options={USEFUL} value={resources} onChange={setResources} />
              <ChoiceRow label="Were you able to complete the practical tasks and activities?" options={TASKS} value={tasks} onChange={setTasks} />
              <ChoiceRow label="How useful were the daily quizzes?" options={USEFUL} value={quizUseful} onChange={setQuizUseful} />

              <GridScale
                title="How helpful were the sessions in improving your knowledge and skills?"
                rows={IMPACT_ROWS}
                options={IMPACT4}
                values={impact}
                onChange={(k, v) => setImpact((p) => ({ ...p, [k]: v }))}
              />

              <div className="grid gap-6 sm:grid-cols-2">
                <StarRow label="Overall course rating" value={courseRating} onChange={setCourseRating} />
                <StarRow label="Overall trainer rating" value={trainerRating} onChange={setTrainerRating} />
                <StarRow label="Organization & coordination" value={orgRating} onChange={setOrgRating} />
                <StarRow label="Overall satisfaction" value={satisfaction} onChange={setSatisfaction} />
              </div>

              <div className="space-y-2">
                <Label>Suggestions or improvements for the sessions / faculty</Label>
                <Textarea
                  value={suggestions}
                  onChange={(e) => setSuggestions(e.target.value)}
                  placeholder="What would make the internship better?"
                  rows={4}
                  maxLength={2000}
                />
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={handleSubmit} disabled={submitting}>Skip</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="bg-gradient-primary hover:opacity-90">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />} Submit
              </Button>
            </div>
          </Card>
        )}

        {phase === "result" && result?.hidden && (
          <Card className="p-8 text-center animate-fade-in-up">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <h1 className="mt-4 text-2xl font-bold tracking-tight">Assessment submitted</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Thank you, {info.fullName.trim() || "candidate"}. Your responses have been recorded successfully.
              Scores are not shared for this assessment — the Datapro team will reach out to shortlisted candidates.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">You may now close this window.</p>
          </Card>
        )}

        {phase === "result" && result && !result.hidden && (
          <div className="space-y-6 animate-fade-in-up">

            <Card className="overflow-hidden text-center">
              <div className="bg-gradient-hero p-8 text-primary-foreground">
                <Trophy className="mx-auto h-10 w-10" />
                <p className="mt-3 text-sm text-primary-foreground/80">Your score</p>
                <p className="text-5xl font-bold">{Math.round(result.percentage)}%</p>
                <p className="mt-1 text-primary-foreground/90">{result.score} / {result.total} correct · +{result.points} points</p>
              </div>
              {result.summary && (
                <div className="flex items-start gap-2 p-5 text-left text-sm">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-muted-foreground">{result.summary}</p>
                </div>
              )}
            </Card>

            <div className="space-y-3">
              <h2 className="font-semibold">Review</h2>
              {result.review.map((r, i) => (
                <Card key={i} className="p-5">
                  <div className="flex items-start gap-2">
                    {r.correct ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />}
                    <p className="font-medium">{r.question_text}</p>
                  </div>
                  <div className="mt-3 space-y-1.5 pl-7">
                    {r.options.map((opt, oi) => (
                      <div key={oi} className={cn("rounded-lg px-3 py-1.5 text-sm", oi === r.correct_index ? "bg-success/10 text-success" : oi === r.selected ? "bg-destructive/10 text-destructive" : "text-muted-foreground")}>
                        {String.fromCharCode(65 + oi)}. {opt}
                      </div>
                    ))}
                    {r.explanation && <p className="pt-1 text-sm text-muted-foreground"><b>Explanation:</b> {r.explanation}</p>}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}