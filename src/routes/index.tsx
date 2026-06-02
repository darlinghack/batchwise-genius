import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  Zap,
  Trophy,
  BarChart3,
  QrCode,
  Layers,
  Brain,
  ShieldCheck,
  ArrowRight,
  GraduationCap,
  Users,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import heroImg from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Datapro QuizHub — AI-Powered Assessment Platform" },
      {
        name: "description",
        content:
          "Automate quiz creation, run live assessments, and analyze batch performance for internship and training programs with Datapro QuizHub.",
      },
      { property: "og:title", content: "Datapro QuizHub" },
      {
        property: "og:description",
        content: "AI-Powered Assessment Platform for Internship & Training Programs.",
      },
    ],
  }),
  component: Index,
});

const features = [
  { icon: Brain, title: "AI Quiz Generator", desc: "Generate accurate MCQs with explanations in seconds for any topic and difficulty." },
  { icon: Layers, title: "Batch & Topic Management", desc: "Run 100+ batches with daily topics organised in a clean timeline view." },
  { icon: QrCode, title: "Shareable Links & QR", desc: "Publish a quiz and share a link or QR code — students join without logging in." },
  { icon: Trophy, title: "Live Leaderboards", desc: "Real-time rankings with full-screen mode built for classroom projection." },
  { icon: BarChart3, title: "Deep Analytics", desc: "Spot weak concepts, missed questions, and top performers automatically." },
  { icon: ShieldCheck, title: "Secure & Scalable", desc: "Role-based access for admins and trainers, ready for 10,000+ students." },
];

const steps = [
  { n: "01", title: "Create a batch", desc: "Add your internship or training batch with course and schedule." },
  { n: "02", title: "Add daily topics", desc: "Log each day's topic in a timeline as your classes progress." },
  { n: "03", title: "Generate & publish", desc: "Let AI build the quiz, edit if needed, then publish a shareable link." },
  { n: "04", title: "Track live", desc: "Watch submissions, scores and leaderboards update in real time." },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
            <a href="#roles" className="transition-colors hover:text-foreground">Roles</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/login">Log in</Link>
            </Button>
            <Button asChild className="bg-gradient-primary shadow-elegant hover:opacity-90">
              <Link to="/register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-subtle" />
        <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-40 top-40 h-96 w-96 rounded-full bg-primary-glow/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
          <div className="animate-fade-in-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" /> AI-Powered Assessment Platform
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Create quizzes in seconds.{" "}
              <span className="text-gradient">Assess at scale.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Datapro QuizHub automates quiz creation, student assessments, live leaderboards and
              performance analytics across all your internship and training batches.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild className="bg-gradient-primary shadow-elegant hover:opacity-90">
                <Link to="/register">
                  Start free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/login">Trainer login</Link>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Instant AI quizzes</span>
              <span className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> No student login</span>
              <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Real-time results</span>
            </div>
          </div>
          <div className="relative animate-fade-in-up">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-primary opacity-20 blur-2xl" />
            <img
              src={heroImg}
              alt="Datapro QuizHub dashboards, analytics charts and live leaderboard"
              width={1280}
              height={960}
              className="w-full rounded-2xl border border-border/60 shadow-card"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything trainers need</h2>
          <p className="mt-4 text-muted-foreground">
            One centralised platform for daily quizzes, weekend tests, and company-wide analytics.
          </p>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border/60 bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-elegant"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-gradient-primary group-hover:text-primary-foreground">
                <f.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-gradient-subtle py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">From class to insights in 4 steps</h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-4">
            {steps.map((s) => (
              <div key={s.n} className="rounded-2xl border border-border/60 bg-card p-6">
                <span className="text-3xl font-bold text-gradient">{s.n}</span>
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: ShieldCheck, t: "Super Admin", d: "Manage trainers and batches, monitor all activity, and export company-wide reports." },
            { icon: GraduationCap, t: "Trainer", d: "Create batches, generate AI quizzes, publish links, and track live performance." },
            { icon: Users, t: "Student", d: "Open a shared link, enter details, attempt the quiz, and get instant results — no login." },
          ].map((r) => (
            <div key={r.t} className="rounded-2xl border border-border/60 bg-card p-7">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-elegant">
                <r.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-xl font-semibold">{r.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{r.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-hero px-8 py-16 text-center shadow-card">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
          <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
            Ready to automate your assessments?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
            Join Datapro QuizHub and turn every training session into instant, insightful assessments.
          </p>
          <Button size="lg" asChild className="mt-8 bg-background text-foreground hover:bg-background/90">
            <Link to="/register">
              Create your account <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <Logo />
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Datapro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
