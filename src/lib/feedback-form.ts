// Shared (browser-safe) feedback form configuration used by the quiz editor,
// the batch settings page and the public student quiz page.

export type CustomFieldType = "stars" | "choice" | "text" | "scale";

export interface CustomFeedbackField {
  id: string;
  label: string;
  type: CustomFieldType;
  options?: string[];
  required?: boolean;
}

export interface FeedbackFormConfig {
  enabled: boolean;
  title: string;
  intro: string;
  sections: {
    quizRating: boolean;
    section: boolean;
    faculty: boolean;
    pace: boolean;
    resources: boolean;
    tasks: boolean;
    quizUseful: boolean;
    impact: boolean;
    overallRatings: boolean;
    suggestions: boolean;
  };
  sectionOptions: string[];
  custom: CustomFeedbackField[];
}

export const DEFAULT_SECTION_OPTIONS = ["CSD", "CSM", "CSE"];

export const DEFAULT_FEEDBACK_FORM: FeedbackFormConfig = {
  enabled: true,
  title: "Internship Feedback",
  intro:
    "Your feedback on the overall internship helps us improve future sessions. All fields are optional — share what you can.",
  sections: {
    quizRating: true,
    section: true,
    faculty: true,
    pace: true,
    resources: true,
    tasks: true,
    quizUseful: true,
    impact: true,
    overallRatings: true,
    suggestions: true,
  },
  sectionOptions: DEFAULT_SECTION_OPTIONS,
  custom: [],
};

export const SECTION_LABELS: { key: keyof FeedbackFormConfig["sections"]; label: string }[] = [
  { key: "quizRating", label: "Rate this quiz (stars + comments)" },
  { key: "section", label: "Student section / branch" },
  { key: "faculty", label: "Faculty teaching quality grid" },
  { key: "pace", label: "Pace of teaching" },
  { key: "resources", label: "Usefulness of study materials" },
  { key: "tasks", label: "Completion of practical tasks" },
  { key: "quizUseful", label: "Usefulness of daily quizzes" },
  { key: "impact", label: "Knowledge & skill improvement grid" },
  { key: "overallRatings", label: "Overall course / trainer / organization ratings" },
  { key: "suggestions", label: "Suggestions & improvements" },
];

// ---- Default form option sets (shared with the student page) ----
export const GRID4 = [
  { label: "Excellent", value: 4 },
  { label: "Good", value: 3 },
  { label: "Fair", value: 2 },
  { label: "Poor", value: 1 },
];
export const IMPACT4 = [
  { label: "Very Helpful", value: 4 },
  { label: "Helpful", value: 3 },
  { label: "Slightly Helpful", value: 2 },
  { label: "Not Helpful", value: 1 },
];
export const PACE = ["Too Fast", "Just Right", "Too Slow"];
export const USEFUL = ["Very Useful", "Useful", "Slightly Useful", "Not Useful"];
export const TASKS = ["Yes, all of them", "Most of them", "Some of them", "No, very few/none"];
export const FACULTY_ROWS = [
  { key: "clarity", label: "Clarity of concepts" },
  { key: "engagement", label: "Engagement / interaction" },
  { key: "expertise", label: "Expertise in topics" },
  { key: "answering", label: "Answering questions effectively" },
] as const;
export const IMPACT_ROWS = [
  { key: "clarity", label: "Clarity of concepts" },
  { key: "relevance", label: "Relevance to job / studies" },
  { key: "skill", label: "Skill application" },
  { key: "knowledge", label: "Overall knowledge improvement" },
] as const;

function str(v: unknown, fallback: string) {
  return typeof v === "string" && v.trim() ? v : fallback;
}

/** Accepts anything stored in the database and returns a safe, complete config. */
export function normalizeFeedbackForm(raw: unknown): FeedbackFormConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_FEEDBACK_FORM;
  const r = raw as Record<string, unknown>;
  const sec = (r.sections ?? {}) as Record<string, unknown>;
  const sections = { ...DEFAULT_FEEDBACK_FORM.sections };
  for (const { key } of SECTION_LABELS) {
    if (typeof sec[key] === "boolean") sections[key] = sec[key] as boolean;
  }
  const custom = Array.isArray(r.custom)
    ? (r.custom as Record<string, unknown>[])
        .filter((f) => typeof f?.label === "string" && (f.label as string).trim())
        .slice(0, 25)
        .map((f, i) => ({
          id: str(f.id, `f${i + 1}`),
          label: String(f.label).slice(0, 300),
          type: (["stars", "choice", "text", "scale"] as const).includes(f.type as CustomFieldType)
            ? (f.type as CustomFieldType)
            : "text",
          options: Array.isArray(f.options)
            ? (f.options as unknown[]).map((o) => String(o).slice(0, 120)).filter(Boolean).slice(0, 10)
            : [],
          required: !!f.required,
        }))
    : [];

  return {
    enabled: typeof r.enabled === "boolean" ? r.enabled : true,
    title: str(r.title, DEFAULT_FEEDBACK_FORM.title).slice(0, 120),
    intro: typeof r.intro === "string" ? r.intro.slice(0, 600) : DEFAULT_FEEDBACK_FORM.intro,
    sections,
    sectionOptions:
      Array.isArray(r.sectionOptions) && r.sectionOptions.length
        ? (r.sectionOptions as unknown[]).map((o) => String(o).slice(0, 60)).filter(Boolean).slice(0, 20)
        : DEFAULT_SECTION_OPTIONS,
    custom,
  };
}
