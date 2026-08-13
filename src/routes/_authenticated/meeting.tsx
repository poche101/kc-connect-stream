import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LogOut,
  MessageSquare,
  Send,
  HelpCircle,
  Users,
  Settings,
  Activity,
  Clock,
  CalendarDays,
  Signal,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MeetingPlayer } from "@/components/MeetingPlayer";
import {
  ParticipantGrid,
  toParticipants,
  type AttendanceRow,
} from "@/components/ParticipantGrid";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/lib/app-error";
import { formatDuration, secondsBetween, shortTime } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];
type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];
type Question = Database["public"]["Tables"]["questions"]["Row"];

type ActivityEvent = {
  id: string;
  kind: "join" | "leave";
  name: string;
  at: string;
  durationSeconds?: number;
};

export const Route = createFileRoute("/_authenticated/meeting")({
  head: () => ({
    meta: [
      { title: "Live meeting — Pantheon" },
      {
        name: "description",
        content:
          "Watch the live broadcast, see who is in the meeting, chat with participants and submit questions.",
      },
      { property: "og:title", content: "Live meeting — Pantheon" },
      {
        property: "og:description",
        content: "Watch the live broadcast and take part in the meeting.",
      },
    ],
  }),
  component: MeetingPage,
});

function MeetingPage() {
  const navigate = useNavigate();
  const session = useSession();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [questionDraft, setQuestionDraft] = useState("");
  const [now, setNow] = useState(() => new Date());
  const attendanceIdRef = useRef<string | null>(null);
  const seenRef = useRef<{ joined: Set<string>; left: Set<string>; ready: boolean }>({
    joined: new Set(),
    left: new Set(),
    ready: false,
  });

  const identity = useMemo(
    () => ({
      display_name: session.displayName,
      church_name: session.profile?.church_name ?? null,
      kc_handle: session.profile?.kc_handle ?? null,
    }),
    [session.displayName, session.profile],
  );

  /** Admins post as "Admin" only — no personal name or church. */
  const chatIdentity = useMemo(
    () =>
      session.isAdmin
        ? { display_name: "Admin", church_name: null }
        : { display_name: identity.display_name, church_name: identity.church_name },
    [session.isAdmin, identity],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const loadMeeting = useCallback(async () => {
    const { data, error } = await supabase
      .from("meetings")
      .select("*")
      .in("status", ["live", "starting_soon", "scheduled"])
      .order("scheduled_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) {
      showError(error, "Could not load the meeting");
      return;
    }
    setMeeting(data ?? null);
  }, []);

  useEffect(() => {
    void loadMeeting();
  }, [loadMeeting]);

  // Load interaction data + realtime subscriptions for the active meeting.
  useEffect(() => {
    if (!meeting) return;
    const meetingId = meeting.id;

    void supabase
      .from("chat_messages")
      .select("*")
      .eq("meeting_id", meetingId)
      .eq("status", "visible")
      .order("created_at")
      .limit(200)
      .then(({ data }) => setMessages(data ?? []));

    void supabase
      .from("questions")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("submitted_at", { ascending: false })
      .limit(100)
      .then(({ data }) => setQuestions(data ?? []));

    const channel = supabase
      .channel(`meeting-${meetingId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages", filter: `meeting_id=eq.${meetingId}` },
        (payload) => {
          const row = payload.new as ChatMessage;
          if (payload.eventType === "INSERT" && row.status === "visible") {
            setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
          } else if (payload.eventType === "UPDATE") {
            setMessages((prev) =>
              row.status === "visible"
                ? prev.map((m) => (m.id === row.id ? row : m))
                : prev.filter((m) => m.id !== row.id),
            );
          } else if (payload.eventType === "DELETE") {
            const old = payload.old as ChatMessage;
            setMessages((prev) => prev.filter((m) => m.id !== old.id));
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "questions", filter: `meeting_id=eq.${meetingId}` },
        () => {
          void supabase
            .from("questions")
            .select("*")
            .eq("meeting_id", meetingId)
            .order("submitted_at", { ascending: false })
            .limit(100)
            .then(({ data }) => setQuestions(data ?? []));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meetings", filter: `id=eq.${meetingId}` },
        (payload) => setMeeting(payload.new as Meeting),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [meeting?.id]);

  // Attendance roster: everyone sees who joined and how long they stayed.
  useEffect(() => {
    if (!meeting) return;
    const meetingId = meeting.id;
    let cancelled = false;

    async function refresh() {
      const { data, error } = await supabase
        .from("attendance_sessions")
        .select("*")
        .eq("meeting_id", meetingId)
        .order("joined_at", { ascending: false })
        .limit(400);
      if (cancelled || error) return;
      const rows = data ?? [];
      announce(rows);
      setAttendance(rows);
    }

    function announce(rows: AttendanceRow[]) {
      const seen = seenRef.current;
      for (const row of rows) {
        const name = row.display_name?.trim() || "A participant";
        if (!seen.joined.has(row.id)) {
          seen.joined.add(row.id);
          if (seen.ready) toast.success(`${name} joined the meeting`);
        }
        if (row.left_at && !seen.left.has(row.id)) {
          seen.left.add(row.id);
          if (seen.ready) {
            toast(
              `${name} left after ${formatDuration(secondsBetween(row.joined_at, row.left_at))}`,
            );
          }
        }
      }
      seen.ready = true;
    }

    void refresh();
    const poll = window.setInterval(() => void refresh(), 10_000);
    const channel = supabase
      .channel(`attendance-${meetingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance_sessions",
          filter: `meeting_id=eq.${meetingId}`,
        },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [meeting?.id]);

  // Own attendance record: exactly one row per person per meeting. It stays
  // "in meeting" for as long as this page is open (heartbeat) and is closed the
  // moment the participant leaves the page.
  useEffect(() => {
    if (!meeting || !session.userId) return;
    const meetingId = meeting.id;
    const userId = session.userId;
    let cancelled = false;

    async function open() {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("attendance_sessions")
        .upsert(
          {
            meeting_id: meetingId,
            user_id: userId,
            status: "in_meeting",
            joined_at: nowIso,
            last_seen_at: nowIso,
            left_at: null,
            ...identity,
          },
          { onConflict: "meeting_id,user_id" },
        )
        .select("id")
        .maybeSingle();
      if (error || cancelled) return;
      attendanceIdRef.current = data?.id ?? null;
    }
    void open();

    function beat() {
      const id = attendanceIdRef.current;
      if (!id) return;
      void supabase
        .from("attendance_sessions")
        .update({ last_seen_at: new Date().toISOString(), status: "in_meeting", left_at: null })
        .eq("id", id);
    }

    function close(status: "left_meeting" | "idle") {
      const id = attendanceIdRef.current;
      if (!id) return;
      void supabase
        .from("attendance_sessions")
        .update({ left_at: new Date().toISOString(), status })
        .eq("id", id);
    }

    const heartbeat = window.setInterval(beat, 15_000);
    // Closing the tab or navigating away marks the participant as having left.
    const onHide = () => {
      if (document.visibilityState === "hidden") close("left_meeting");
      else beat();
    };
    window.addEventListener("pagehide", () => close("left_meeting"));
    document.addEventListener("visibilitychange", onHide);

    return () => {
      cancelled = true;
      window.clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onHide);
      close("left_meeting");
      attendanceIdRef.current = null;
    };
  }, [meeting?.id, session.userId, identity]);

  const participants = useMemo(() => toParticipants(attendance), [attendance]);
  const onlineCount = participants.filter((p) => p.online).length;

  const activity = useMemo<ActivityEvent[]>(() => {
    const events: ActivityEvent[] = [];
    for (const row of attendance) {
      const name = row.display_name?.trim() || "A participant";
      events.push({ id: `${row.id}-join`, kind: "join", name, at: row.joined_at });
      if (row.left_at) {
        events.push({
          id: `${row.id}-leave`,
          kind: "leave",
          name,
          at: row.left_at,
          durationSeconds: secondsBetween(row.joined_at, row.left_at),
        });
      }
    }
    return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 80);
  }, [attendance]);

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!meeting || !session.userId || !chatDraft.trim()) return;
    const message = chatDraft.trim();
    setChatDraft("");
    const { error } = await supabase.from("chat_messages").insert({
      meeting_id: meeting.id,
      user_id: session.userId,
      message,
      ...chatIdentity,
    });
    if (error) showError(error, "Message not sent");
  }

  async function submitQuestion(event: React.FormEvent) {
    event.preventDefault();
    if (!meeting || !session.userId || !questionDraft.trim()) return;
    const question = questionDraft.trim();
    setQuestionDraft("");
    const { error } = await supabase.from("questions").insert({
      meeting_id: meeting.id,
      user_id: session.userId,
      question,
      display_name: identity.display_name,
      church_name: identity.church_name,
    });
    if (error) showError(error, "Question not submitted");
    else toast.success("Question submitted to the host.");
  }

  async function signOut() {
    const id = attendanceIdRef.current;
    if (id) {
      await supabase
        .from("attendance_sessions")
        .update({ left_at: new Date().toISOString(), status: "logged_out" })
        .eq("id", id);
      attendanceIdRef.current = null;
    }
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const live = meeting?.status === "live";
  const elapsed = meeting?.started_at ? secondsBetween(meeting.started_at) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <img src="/pwa-icon-192.png" alt="" className="size-8 rounded-lg" />
          <span className="font-display text-sm font-semibold tracking-[0.24em]">PANTHEON</span>
          {live && (
            <Badge className="ml-1 gap-1.5 bg-live text-live-foreground">
              <span className="size-1.5 animate-live-pulse rounded-full bg-live-foreground" />
              LIVE
            </Badge>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
              <Users className="size-4" />
              {onlineCount}
            </span>
            <span className="hidden items-center gap-1.5 text-sm tabular-nums text-muted-foreground md:flex">
              <Clock className="size-4" />
              {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <Button variant="outline" size="sm" asChild>
              <Link to="/profile">
                <UserCog className="size-4" />
                <span className="hidden sm:inline">Profile</span>
              </Link>
            </Button>
            {session.isStaff && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin">
                  <Settings className="size-4" />
                  Admin
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4">
          <MeetingPlayer
            streamUrl={meeting?.stream_url ?? null}
            embedUrl={meeting?.embed_url ?? null}
            live={Boolean(live)}
          />

          <div className="rounded-2xl border border-border bg-card p-5 shadow-panel">
            <h1 className="font-display text-xl font-semibold tracking-tight">
              {meeting?.title ?? "No meeting scheduled"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {meeting?.host_name ? `Hosted by ${meeting.host_name}` : "Awaiting host assignment"}
            </p>
            {meeting?.description && (
              <p className="mt-3 text-sm leading-relaxed text-foreground/80">
                {meeting.description}
              </p>
            )}
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Stat
                icon={CalendarDays}
                label="Scheduled"
                value={
                  meeting?.scheduled_at
                    ? new Date(meeting.scheduled_at).toLocaleString([], {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "—"
                }
              />
              <Stat
                icon={Signal}
                label="Broadcast time"
                value={elapsed !== null && live ? formatDuration(elapsed) : "Not started"}
              />
              <Stat icon={Users} label="In meeting" value={`${onlineCount} of ${participants.length}`} />
            </div>
          </div>

          <ParticipantGrid participants={participants} />
        </section>

        <aside className="rounded-2xl border border-border bg-card shadow-panel">
          <Tabs defaultValue="chat" className="flex h-[calc(100vh-9rem)] flex-col">
            <TabsList className="m-3 grid grid-cols-3">
              <TabsTrigger value="chat">
                <MessageSquare className="size-4" /> Chat
              </TabsTrigger>
              <TabsTrigger value="questions">
                <HelpCircle className="size-4" /> Q&amp;A
              </TabsTrigger>
              <TabsTrigger value="activity">
                <Activity className="size-4" /> Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex min-h-0 flex-1 flex-col">
              <ScrollArea className="min-h-0 flex-1 px-4">
                <div className="space-y-3 pb-4">
                  {messages.length === 0 && (
                    <p className="pt-6 text-center text-sm text-muted-foreground">
                      No messages yet.
                    </p>
                  )}
                  {messages.map((message) => {
                    const isAdminMessage = message.display_name === "Admin";
                    return (
                      <div
                        key={message.id}
                        className={`animate-pop-in rounded-xl px-3 py-2 ${
                          isAdminMessage
                            ? "border border-primary/30 bg-primary/8"
                            : "bg-muted"
                        }`}
                      >
                        <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
                          {message.display_name}
                          {isAdminMessage && (
                            <Badge className="h-4 px-1.5 text-[9px] uppercase">staff</Badge>
                          )}
                          {!isAdminMessage && message.church_name && (
                            <span className="font-normal text-muted-foreground">
                              • {message.church_name}
                            </span>
                          )}
                          <span className="ml-auto font-normal text-muted-foreground">
                            {shortTime(message.created_at)}
                          </span>
                        </p>
                        <p className="mt-0.5 text-sm leading-relaxed">{message.message}</p>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              <form onSubmit={sendMessage} className="flex gap-2 border-t border-border p-3">
                <Input
                  value={chatDraft}
                  onChange={(e) => setChatDraft(e.target.value)}
                  placeholder={meeting?.chat_enabled ? "Type a message…" : "Chat is disabled"}
                  disabled={!meeting?.chat_enabled}
                />
                <Button type="submit" size="icon" disabled={!meeting?.chat_enabled}>
                  <Send className="size-4" />
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="questions" className="flex min-h-0 flex-1 flex-col">
              <ScrollArea className="min-h-0 flex-1 px-4">
                <div className="space-y-3 pb-4">
                  {questions.length === 0 && (
                    <p className="pt-6 text-center text-sm text-muted-foreground">
                      No questions yet.
                    </p>
                  )}
                  {questions.map((question) => (
                    <div key={question.id} className="rounded-xl border border-border px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-primary">{question.display_name}</p>
                        <Badge variant="secondary" className="text-[10px] uppercase">
                          {question.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed">{question.question}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <form onSubmit={submitQuestion} className="space-y-2 border-t border-border p-3">
                <Textarea
                  value={questionDraft}
                  onChange={(e) => setQuestionDraft(e.target.value)}
                  placeholder={
                    meeting?.questions_enabled
                      ? "Ask the host a question…"
                      : "Questions are disabled"
                  }
                  disabled={!meeting?.questions_enabled}
                  rows={3}
                />
                <Button type="submit" className="w-full" disabled={!meeting?.questions_enabled}>
                  Submit question
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="activity" className="flex min-h-0 flex-1 flex-col">
              <ScrollArea className="min-h-0 flex-1 px-4">
                <div className="space-y-2 pb-4">
                  {activity.length === 0 && (
                    <p className="pt-6 text-center text-sm text-muted-foreground">
                      Join and leave events will appear here.
                    </p>
                  )}
                  {activity.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 rounded-xl border border-border px-3 py-2"
                    >
                      <span
                        className={`mt-1.5 size-2 shrink-0 rounded-full ${
                          event.kind === "join" ? "bg-success" : "bg-muted-foreground/60"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="font-medium">{event.name}</span>{" "}
                          {event.kind === "join"
                            ? "joined the meeting"
                            : `left after ${formatDuration(event.durationSeconds ?? 0)}`}
                        </p>
                        <p className="text-xs text-muted-foreground">{shortTime(event.at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </aside>
      </main>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}
