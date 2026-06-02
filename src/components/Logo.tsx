import { Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, to = "/" }: { className?: string; to?: string }) {
  return (
    <Link to={to} className={cn("flex items-center gap-2.5 font-bold", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-elegant">
        <GraduationCap className="h-5 w-5" />
      </span>
      <span className="text-lg leading-none tracking-tight">
        Datapro <span className="text-gradient">QuizHub</span>
      </span>
    </Link>
  );
}