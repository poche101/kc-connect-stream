import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Radio,
  Square,
  Loader2,
  Download,
  Pencil,
  Trash2,
  Users,
  CalendarDays,
  ArrowUpDown,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession, type AppRole } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/lib/app-error";
import { formatDuration, secondsBetween } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];
type Attendance = Database["public"]["Tables"]["attendance_sessions"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const ROLES: AppRole[] = [
  "super_admin",
  "admin",
  "meeting_manager",
  "host",
  "moderator",
  "participant",
];

const emptyForm = {
  title: "",
  description: "",
  hostName: "",
  scheduledAt: "",
  streamUrl: "",
  embedUrl: "",
  chat: true,
  questions: true,
};

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin console — Pantheon" },
      {
        name: "description",
        content:
          "Create, edit and control meetings, review attendance reports and manage participant roles in Pantheon.",
      },
      { property: "og:title", content: "Admin console — Pantheon" },
      {
        property: "og:description",
        content: "Manage meetings, attendance and roles in Pantheon.",
      },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const session = useSession();

  if (session.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!session.isStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <h1 className="font-display text-xl font-semibold">Restricted area</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account does not have access to the admin console.
          </p>
          <Button variant="outline" className="mt-6" asChild>
            <Link to="/meeting">Back to meeting</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="admin-hero">
        <div className="mx-auto max-w-6xl px-4 py-7">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-white hover:bg-white/15 hover:text-white"
            >
              <Link to="/meeting">
                <ArrowLeft className="size-4" />
                Meeting
              </Link>
            </Button>
            <Badge className="ml-auto gap-1.5 bg-white/18 uppercase text-white">
              <ShieldCheck className="size-3.5" />
              {session.roles[0] ?? "staff"}
            </Badge>
          </div>
          <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight">
            Pantheon admin console
          </h1>
          <p className="mt-1 text-sm text-white/80">
            Schedule and control broadcasts, audit attendance and manage access.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Tabs defaultValue="meetings">
          <TabsList>
            <TabsTrigger value="meetings">Meetings</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>
          <TabsContent value="meetings" className="mt-6">
            <MeetingsPanel />
          </TabsContent>
          <TabsContent value="attendance" className="mt-6">
            <AttendancePanel />
          </TabsContent>
          <TabsContent value="users" className="mt-6">
            <UsersPanel canEditRoles={session.isAdmin} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function MeetingsPanel() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [deleting, setDeleting] = useState<Meeting | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("meetings")
      .select("*")
      .order("scheduled_at", { ascending: false });
    if (error) showError(error, "Could not load meetings");
    else setMeetings(data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(meeting: Meeting) {
    setEditing(meeting);
    setForm({
      title: meeting.title,
      description: meeting.description ?? "",
      hostName: meeting.host_name ?? "",
      scheduledAt: new Date(meeting.scheduled_at).toISOString().slice(0, 16),
      streamUrl: meeting.stream_url ?? "",
      embedUrl: meeting.embed_url ?? "",
      chat: meeting.chat_enabled,
      questions: meeting.questions_enabled,
    });
    setOpen(true);
  }

  async function save() {
    if (!form.title.trim()) {
      showError("Give the meeting a title.", "Title required");
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      host_name: form.hostName.trim() || null,
      scheduled_at: form.scheduledAt
        ? new Date(form.scheduledAt).toISOString()
        : new Date().toISOString(),
      stream_url: form.streamUrl.trim() || null,
      embed_url: form.embedUrl.trim() || null,
      chat_enabled: form.chat,
      questions_enabled: form.questions,
    };
    const { error } = editing
      ? await supabase.from("meetings").update(payload).eq("id", editing.id)
      : await supabase.from("meetings").insert(payload);
    setSaving(false);
    if (error) return showError(error, editing ? "Could not save meeting" : "Could not create meeting");
    toast.success(editing ? "Meeting updated." : "Meeting created.");
    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
    void load();
  }

  async function remove(meeting: Meeting) {
    const { error } = await supabase.from("meetings").delete().eq("id", meeting.id);
    setDeleting(null);
    if (error) return showError(error, "Could not delete meeting");
    toast.success("Meeting deleted.");
    void load();
  }

  async function setStatus(meeting: Meeting, status: Meeting["status"]) {
    const patch: Database["public"]["Tables"]["meetings"]["Update"] = { status };
    if (status === "live") patch.started_at = new Date().toISOString();
    if (status === "ended") patch.ended_at = new Date().toISOString();
    const { error } = await supabase.from("meetings").update(patch).eq("id", meeting.id);
    if (error) return showError(error, "Could not update meeting");
    void load();
  }

  async function toggleFeature(
    meeting: Meeting,
    key: "chat_enabled" | "questions_enabled",
    value: boolean,
  ) {
    const patch: Database["public"]["Tables"]["meetings"]["Update"] =
      key === "chat_enabled" ? { chat_enabled: value } : { questions_enabled: value };
    const { error } = await supabase.from("meetings").update(patch).eq("id", meeting.id);
    if (error) return showError(error, "Could not update meeting");
    void load();
  }

  const liveCount = meetings.filter((m) => m.status === "live").length;
  const upcoming = meetings.filter((m) => m.status === "scheduled" || m.status === "starting_soon").length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard icon={Radio} label="Live now" value={String(liveCount)} tone="live" />
        <MetricCard icon={CalendarDays} label="Upcoming" value={String(upcoming)} tone="primary" />
        <MetricCard icon={Users} label="All meetings" value={String(meetings.length)} tone="success" />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold tracking-tight">Meetings</h2>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          New meeting
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit meeting" : "Create a meeting"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="host">Host name</Label>
                <Input
                  id="host"
                  value={form.hostName}
                  onChange={(e) => setForm({ ...form, hostName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduled">Scheduled for</Label>
                <Input
                  id="scheduled"
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stream">HLS stream URL (.m3u8)</Label>
              <Input
                id="stream"
                placeholder="https://cdn.example.com/live/stream.m3u8"
                value={form.streamUrl}
                onChange={(e) => setForm({ ...form, streamUrl: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="embed">Embed URL (fallback)</Label>
              <Input
                id="embed"
                placeholder="https://www.youtube.com/embed/…"
                value={form.embedUrl}
                onChange={(e) => setForm({ ...form, embedUrl: e.target.value })}
              />
            </div>
            <div className="space-y-3 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="chat">Chat enabled</Label>
                <Switch
                  id="chat"
                  checked={form.chat}
                  onCheckedChange={(checked) => setForm({ ...form, chat: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="questions">Questions enabled</Label>
                <Switch
                  id="questions"
                  checked={form.questions}
                  onCheckedChange={(checked) => setForm({ ...form, questions: checked })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={save} disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : editing ? (
                "Save changes"
              ) : (
                "Create meeting"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this meeting?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.title}” and its chat, questions and attendance records will be removed.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && void remove(deleting)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete meeting
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-3">
        {meetings.map((meeting) => (
          <div
            key={meeting.id}
            className="animate-rise-in rounded-2xl border border-border bg-card p-5 shadow-panel transition-all hover:border-primary/40"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-semibold">{meeting.title}</h3>
                  <Badge
                    className={meeting.status === "live" ? "bg-live text-live-foreground" : undefined}
                    variant={meeting.status === "live" ? "default" : "secondary"}
                  >
                    {meeting.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {new Date(meeting.scheduled_at).toLocaleString()}
                  {meeting.host_name ? ` • ${meeting.host_name}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {meeting.status !== "live" ? (
                  <Button variant="live" size="sm" onClick={() => setStatus(meeting, "live")}>
                    <Radio className="size-4" />
                    Go live
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setStatus(meeting, "ended")}>
                    <Square className="size-4" />
                    End meeting
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => openEdit(meeting)}>
                  <Pencil className="size-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleting(meeting)}
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-6">
              {(
                [
                  ["chat_enabled", "Chat"],
                  ["questions_enabled", "Questions"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={meeting[key]}
                    onCheckedChange={(checked) => toggleFeature(meeting, key, checked)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        ))}
        {meetings.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No meetings yet. Create your first one.
          </p>
        )}
      </div>
    </div>
  );
}

function AttendancePanel() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingId, setMeetingId] = useState("");
  const [rows, setRows] = useState<Attendance[]>([]);
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    void supabase
      .from("meetings")
      .select("*")
      .order("scheduled_at", { ascending: false })
      .then(({ data }) => {
        setMeetings(data ?? []);
        if (data?.[0]) setMeetingId(data[0].id);
      });
  }, []);

  useEffect(() => {
    if (!meetingId) return;
    void supabase
      .from("attendance_sessions")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("joined_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) showError(error, "Could not load attendance");
        else setRows(data ?? []);
      });
  }, [meetingId]);

  const visible = useMemo(() => {
    const from = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const to = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;
    return rows
      .filter((row) => {
        const at = new Date(row.joined_at).getTime();
        if (from !== null && at < from) return false;
        if (to !== null && at > to) return false;
        return true;
      })
      .sort((a, b) => {
        const diff = new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
        return sortDir === "asc" ? diff : -diff;
      });
  }, [rows, fromDate, toDate, sortDir]);

  const uniquePeople = new Set(visible.map((row) => row.user_id)).size;
  const totalMinutes = Math.round(
    visible.reduce((sum, row) => sum + secondsBetween(row.joined_at, row.left_at), 0) / 60,
  );

  function exportCsv() {
    const header = ["Name", "KC Handle", "Church", "Joined", "Left", "Duration", "Status"];
    const body = visible.map((row) => [
      row.display_name ?? "",
      row.kc_handle ?? "",
      row.church_name ?? "",
      new Date(row.joined_at).toISOString(),
      row.left_at ? new Date(row.left_at).toISOString() : "",
      formatDuration(secondsBetween(row.joined_at, row.left_at)),
      row.status,
    ]);
    const csv = [header, ...body]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-${meetingId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard icon={Users} label="Records" value={String(visible.length)} tone="primary" />
        <MetricCard icon={ShieldCheck} label="Unique people" value={String(uniquePeople)} tone="success" />
        <MetricCard
          icon={CalendarDays}
          label="Total watch time"
          value={`${totalMinutes} min`}
          tone="live"
        />
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="space-y-1.5">
          <Label>Meeting</Label>
          <Select value={meetingId} onValueChange={setMeetingId}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Select a meeting" />
            </SelectTrigger>
            <SelectContent>
              {meetings.map((meeting) => (
                <SelectItem key={meeting.id} value={meeting.id}>
                  {meeting.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="from">From</Label>
          <Input
            id="from"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-[160px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to">To</Label>
          <Input
            id="to"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-[160px]"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setSortDir((dir) => (dir === "desc" ? "asc" : "desc"))}
        >
          <ArrowUpDown className="size-4" />
          Date: {sortDir === "desc" ? "Newest first" : "Oldest first"}
        </Button>
        <Button onClick={exportCsv} disabled={visible.length === 0}>
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>KC Handle</TableHead>
              <TableHead>Church</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.display_name}</TableCell>
                <TableCell className="text-muted-foreground">{row.kc_handle}</TableCell>
                <TableCell className="text-muted-foreground">{row.church_name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(row.joined_at).toLocaleString()}
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatDuration(secondsBetween(row.joined_at, row.left_at))}
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      row.status === "in_meeting" ? "bg-success text-success-foreground" : undefined
                    }
                    variant={row.status === "in_meeting" ? "default" : "secondary"}
                  >
                    {row.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  No attendance records for this filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  tone: "primary" | "success" | "live";
}) {
  const tones: Record<typeof tone, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/12 text-success",
    live: "bg-live/12 text-live",
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-panel">
      <span className={`flex size-11 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-display text-xl font-semibold">{value}</p>
      </div>
    </div>
  );
}

function UsersPanel({ canEditRoles }: { canEditRoles: boolean }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Record<string, AppRole[]>>({});
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const [{ data: people, error }, { data: userRoles }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    if (error) return showError(error, "Could not load users");
    setProfiles(people ?? []);
    const map: Record<string, AppRole[]> = {};
    for (const row of userRoles ?? []) {
      map[row.user_id] = [...(map[row.user_id] ?? []), row.role];
    }
    setRoles(map);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function assignRole(userId: string, role: AppRole) {
    const { error } = await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
    if (error) return showError(error, "Could not assign role");
    toast.success("Role assigned.");
    void load();
  }

  const filtered = profiles.filter((profile) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [profile.first_name, profile.last_name, profile.kc_handle, profile.church_email]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term));
  });

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search by name, KC Handle or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>KC Handle</TableHead>
              <TableHead>Church</TableHead>
              <TableHead>Roles</TableHead>
              {canEditRoles && <TableHead>Assign role</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((profile) => (
              <TableRow key={profile.id}>
                <TableCell className="font-medium">
                  {[profile.title, profile.first_name, profile.last_name].filter(Boolean).join(" ")}
                </TableCell>
                <TableCell className="text-muted-foreground">{profile.kc_handle}</TableCell>
                <TableCell className="text-muted-foreground">{profile.church_name}</TableCell>
                <TableCell className="space-x-1">
                  {(roles[profile.id] ?? ["participant"]).map((role) => (
                    <Badge key={role} variant="secondary">
                      {role}
                    </Badge>
                  ))}
                </TableCell>
                {canEditRoles && (
                  <TableCell>
                    <Select onValueChange={(value) => assignRole(profile.id, value as AppRole)}>
                      <SelectTrigger className="h-8 w-[160px]">
                        <SelectValue placeholder="Add role" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
