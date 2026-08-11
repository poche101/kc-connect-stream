import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Plus, Radio, Square, Loader2, Download } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
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

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin console — KC Meeting" },
      {
        name: "description",
        content:
          "Create meetings, control the live broadcast, review attendance reports and manage participant roles.",
      },
      { property: "og:title", content: "Admin console — KC Meeting" },
      {
        property: "og:description",
        content: "Manage meetings, attendance and roles for KC Meeting.",
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
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/meeting">
              <ArrowLeft className="size-4" />
              Meeting
            </Link>
          </Button>
          <h1 className="font-display text-base font-semibold tracking-tight">Admin console</h1>
          <Badge variant="secondary" className="ml-auto uppercase">
            {session.roles[0] ?? "staff"}
          </Badge>
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
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    hostName: "",
    scheduledAt: "",
    streamUrl: "",
    embedUrl: "",
    chat: true,
    questions: true,
    hands: true,
  });

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

  async function createMeeting() {
    if (!form.title.trim()) {
      showError("Give the meeting a title.", "Title required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("meetings").insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      host_name: form.hostName.trim() || null,
      scheduled_at: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : new Date().toISOString(),
      stream_url: form.streamUrl.trim() || null,
      embed_url: form.embedUrl.trim() || null,
      chat_enabled: form.chat,
      questions_enabled: form.questions,
      hand_raise_enabled: form.hands,
    });
    setSaving(false);
    if (error) return showError(error, "Could not create meeting");
    toast.success("Meeting created.");
    setOpen(false);
    setForm({ ...form, title: "", description: "" });
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
    key: "chat_enabled" | "questions_enabled" | "hand_raise_enabled",
    value: boolean,
  ) {
    const { error } = await supabase.from("meetings").update({ [key]: value }).eq("id", meeting.id);
    if (error) return showError(error, "Could not update meeting");
    void load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold tracking-tight">Meetings</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              New meeting
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create a meeting</DialogTitle>
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
                {(
                  [
                    ["chat", "Chat enabled"],
                    ["questions", "Questions enabled"],
                    ["hands", "Hand raising enabled"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label htmlFor={key}>{label}</Label>
                    <Switch
                      id={key}
                      checked={form[key]}
                      onCheckedChange={(checked) => setForm({ ...form, [key]: checked })}
                    />
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={createMeeting} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : "Create meeting"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {meetings.map((meeting) => (
          <div
            key={meeting.id}
            className="rounded-2xl border border-border bg-card p-5 shadow-panel"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-semibold">{meeting.title}</h3>
                  <Badge
                    className={
                      meeting.status === "live" ? "bg-live text-live-foreground" : undefined
                    }
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
              <div className="flex gap-2">
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
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-6">
              {(
                [
                  ["chat_enabled", "Chat"],
                  ["questions_enabled", "Questions"],
                  ["hand_raise_enabled", "Hands"],
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

  function exportCsv() {
    const header = ["Name", "KC Handle", "Church", "Joined", "Left", "Status"];
    const body = rows.map((row) => [
      row.display_name ?? "",
      row.kc_handle ?? "",
      row.church_name ?? "",
      new Date(row.joined_at).toISOString(),
      row.left_at ? new Date(row.left_at).toISOString() : "",
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={meetingId} onValueChange={setMeetingId}>
          <SelectTrigger className="w-[280px]">
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
        <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
          <Download className="size-4" />
          Export CSV
        </Button>
        <span className="text-sm text-muted-foreground">{rows.length} records</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>KC Handle</TableHead>
              <TableHead>Church</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.display_name}</TableCell>
                <TableCell className="text-muted-foreground">{row.kc_handle}</TableCell>
                <TableCell className="text-muted-foreground">{row.church_name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(row.joined_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{row.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
                <TableCell>
                  {[profile.title, profile.first_name, profile.last_name]
                    .filter(Boolean)
                    .join(" ")}
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
