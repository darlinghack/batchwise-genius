import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Layers, Calendar, ArrowRight, Loader2, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/dashboard/batches")({
  head: () => ({ meta: [{ title: "Batches — Datapro QuizHub" }] }),
  component: BatchesPage,
});

const statusStyles: Record<string, string> = {
  active: "bg-success/15 text-success",
  upcoming: "bg-warning/15 text-warning",
  completed: "bg-muted text-muted-foreground",
};

function BatchesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    course_name: "",
    start_date: "",
    end_date: "",
    status: "active",
  });

  const { data: batches, isLoading } = useQuery({
    queryKey: ["batches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("batches")
        .select("id, name, course_name, status, start_date, end_date, topics(count)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function createBatch(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.course_name.trim()) {
      toast.error("Batch name and course are required.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("batches").insert({
      trainer_id: user!.id,
      name: form.name.trim(),
      course_name: form.course_name.trim(),
      trainer_name: user!.user_metadata?.full_name || "",
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      status: form.status as "active" | "upcoming" | "completed",
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Batch created!");
    setOpen(false);
    setForm({ name: "", course_name: "", start_date: "", end_date: "", status: "active" });
    qc.invalidateQueries({ queryKey: ["batches"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Batches</h1>
          <p className="text-sm text-muted-foreground">Manage your internship and training batches.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary shadow-elegant hover:opacity-90"><Plus className="h-4 w-4" /> New batch</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a new batch</DialogTitle>
            </DialogHeader>
            <form onSubmit={createBatch} className="space-y-4">
              <div className="space-y-2">
                <Label>Batch name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Python Internship Batch 45" />
              </div>
              <div className="space-y-2">
                <Label>Course name</Label>
                <Input value={form.course_name} onChange={(e) => setForm({ ...form, course_name: e.target.value })} placeholder="Python Programming" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start date</Label>
                  <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>End date</Label>
                  <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving} className="bg-gradient-primary hover:opacity-90">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} Create batch
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : batches && batches.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {batches.map((b) => {
            const topicCount = (b.topics as { count: number }[] | null)?.[0]?.count ?? 0;
            return (
              <Link key={b.id} to="/dashboard/batches/$batchId" params={{ batchId: b.id }}>
                <Card className="group h-full p-5 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-elegant">
                  <div className="flex items-start justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Layers className="h-5 w-5" />
                    </span>
                    <Badge className={statusStyles[b.status] ?? ""} variant="secondary">{b.status}</Badge>
                  </div>
                  <h3 className="mt-4 font-semibold leading-tight">{b.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{b.course_name}</p>
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {topicCount} topics</span>
                    {b.start_date && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(b.start_date).toLocaleDateString()}</span>}
                  </div>
                  <div className="mt-4 flex items-center text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Open batch <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Layers className="h-7 w-7" /></span>
          <p className="font-medium">No batches yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">Create your first batch to start adding topics and generating quizzes.</p>
          <Button onClick={() => setOpen(true)} className="mt-2 bg-gradient-primary hover:opacity-90"><Plus className="h-4 w-4" /> New batch</Button>
        </Card>
      )}
    </div>
  );
}