import type { ReactNode } from "react";
import { Sparkles, Trophy, BarChart3 } from "lucide-react";
import { Logo } from "@/components/Logo";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-hero p-12 text-primary-foreground lg:flex">
        <div className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <Logo className="text-primary-foreground [&_span]:text-primary-foreground" />
        <div className="relative max-w-md">
          <h2 className="text-3xl font-bold leading-tight">
            AI-Powered Assessment Platform for Internship & Training Programs
          </h2>
          <div className="mt-8 space-y-4 text-primary-foreground/90">
            {[
              { icon: Sparkles, t: "Generate quizzes instantly with AI" },
              { icon: Trophy, t: "Live leaderboards for every classroom" },
              { icon: BarChart3, t: "Deep analytics across all batches" },
            ].map((f) => (
              <div key={f.t} className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
                  <f.icon className="h-4 w-4" />
                </span>
                <span className="text-sm">{f.t}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-sm text-primary-foreground/70">© {new Date().getFullYear()} Datapro QuizHub</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm animate-fade-in-up">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}