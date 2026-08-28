import { useState } from "react";
import { Plus, Trash2, GripVertical, Star, ListChecks, Type, Gauge } from "lucide-react";
import {
  DEFAULT_FEEDBACK_FORM,
  SECTION_LABELS,
  type CustomFeedbackField,
  type CustomFieldType,
  type FeedbackFormConfig,
} from "@/lib/feedback-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TYPE_META: Record<CustomFieldType, { label: string; icon: typeof Star }> = {
  stars: { label: "Star rating (1-5)", icon: Star },
  choice: { label: "Single choice", icon: ListChecks },
  scale: { label: "Scale (Excellent → Poor)", icon: Gauge },
  text: { label: "Long text", icon: Type },
};

export function FeedbackFormBuilder({
  value,
  onChange,
}: {
  value: FeedbackFormConfig;
  onChange: (next: FeedbackFormConfig) => void;
}) {
  const [newOption, setNewOption] = useState<Record<string, string>>({});

  function patch(p: Partial<FeedbackFormConfig>) {
    onChange({ ...value, ...p });
  }
  function patchField(id: string, p: Partial<CustomFeedbackField>) {
    patch({ custom: value.custom.map((f) => (f.id === id ? { ...f, ...p } : f)) });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
        <div>
          <Label>Collect feedback after this quiz</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Turn off to send students straight to their result.
          </p>
        </div>
        <Switch checked={value.enabled} onCheckedChange={(v) => patch({ enabled: v })} />
      </div>

      {value.enabled && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Form title</Label>
              <Input value={value.title} onChange={(e) => patch({ title: e.target.value })} maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label>Section / branch options (comma separated)</Label>
              <Input
                value={value.sectionOptions.join(", ")}
                onChange={(e) =>
                  patch({ sectionOptions: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
                }
                placeholder="CSD, CSM, CSE"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Intro text shown to students</Label>
            <Textarea value={value.intro} onChange={(e) => patch({ intro: e.target.value })} rows={2} maxLength={600} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Standard questions</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => patch({ sections: { ...DEFAULT_FEEDBACK_FORM.sections } })}
              >
                Reset to default
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {SECTION_LABELS.map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span>{label}</span>
                  <Switch
                    checked={value.sections[key]}
                    onCheckedChange={(v) => patch({ sections: { ...value.sections, [key]: v } })}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Custom questions for this batch</Label>
            {value.custom.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No custom questions yet — add batch-specific questions below.
              </p>
            )}
            {value.custom.map((f, idx) => {
              const Icon = TYPE_META[f.type].icon;
              return (
                <Card key={f.id} className="p-4">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground">Q{idx + 1}</span>
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    <div className="ml-auto flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        Required
                        <Switch checked={!!f.required} onCheckedChange={(v) => patchField(f.id, { required: v })} />
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => patch({ custom: value.custom.filter((c) => c.id !== f.id) })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_200px]">
                    <Input
                      value={f.label}
                      onChange={(e) => patchField(f.id, { label: e.target.value })}
                      placeholder="Question text"
                    />
                    <Select value={f.type} onValueChange={(v) => patchField(f.id, { type: v as CustomFieldType })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TYPE_META).map(([k, m]) => (
                          <SelectItem key={k} value={k}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {f.type === "choice" && (
                    <div className="mt-3 space-y-2">
                      <Label className="text-xs text-muted-foreground">Options</Label>
                      <div className="flex flex-wrap gap-2">
                        {(f.options ?? []).map((o, oi) => (
                          <span key={oi} className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-sm">
                            {o}
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() =>
                                patchField(f.id, { options: (f.options ?? []).filter((_, j) => j !== oi) })
                              }
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={newOption[f.id] ?? ""}
                          onChange={(e) => setNewOption((p) => ({ ...p, [f.id]: e.target.value }))}
                          placeholder="Add an option"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const v = (newOption[f.id] ?? "").trim();
                              if (!v) return;
                              patchField(f.id, { options: [...(f.options ?? []), v] });
                              setNewOption((p) => ({ ...p, [f.id]: "" }));
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const v = (newOption[f.id] ?? "").trim();
                            if (!v) return;
                            patchField(f.id, { options: [...(f.options ?? []), v] });
                            setNewOption((p) => ({ ...p, [f.id]: "" }));
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed"
              onClick={() =>
                patch({
                  custom: [
                    ...value.custom,
                    { id: `f${Date.now().toString(36)}`, label: "", type: "text", options: [], required: false },
                  ],
                })
              }
            >
              <Plus className="h-4 w-4" /> Add custom question
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
