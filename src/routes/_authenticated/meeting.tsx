import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Hand, LogOut, MessageSquare, Send, HelpCircle, Users, Settings } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MeetingPlayer } from "@/components/MeetingPlayer";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/lib/app-error";
import { KINGSCHAT_LOGO_URL } from "@/lib/kingschat";
import type { Database } from "@/integrations/supabase/types";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];
type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];
type Question = Database["public"]["Tables"]["questions"]["Row"];

export const Route = createFileRoute("/_authenticated/meeting")({
  head: () => ({
    meta: [
      { title: "Live meeting — KC Meeting" },
      {
        name: "description",
        content:
          "Watch the live broadcast, chat with participants, raise your hand and submit questions.",
      },
      { property: "og:title", content: "Live meeting — KC Meeting" },
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
  const [participants, setParticipants] = useState(0);
  const [chatDraft, setChatDraft] = useState("");
  const [questionDraft, setQuestionDraft] = useState("");
  const [handRaised, setHandRaised] = useState(false);
  const attendanceIdRef = useRef<string | null>(null);

  const identity = useMemo(
    () => ({
      display_name: session.displayName,
      church_name: session.profile?.church_name ?? null,
      kc_handle: session.profile?.kc_handle ?? null,
    }),
    [session.displayName, session.profile],
  );

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
            setMessages((prev) => [...prev, row]);
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

  // Attendance: open a session on join, heartbeat every 30s, close on leave.
  useEffect(() => {
    if (!meeting || !session.userId) return;
    const meetingId = meeting.id;
    const userId = session.userId;
    let cancelled = false;

    async function open() {
      const { data, error } = await supabase
        .from("attendance_sessions")
        .insert({ meeting_id: meetingId, user_id: userId, status: "in_meeting", ...identity })
        .select("id")
        .maybeSingle();
      if (error || cancelled) return;
      attendanceIdRef.current = data?.id ?? null;
    }
    void open();

    const heartbeat = window.setInterval(() => {
      const id = attendanceIdRef.current;
      if (!id) return;
      void supabase
        .from("attendance_sessions")
        .update({ last_seen_at: new Date().toISOString(), status: "in_meeting" })
        .eq("id", id);
    }, 30_000);

    const counter = window.setInterval(() => {
      const since = new Date(Date.now() - 90_000).toISOString();
      void supabase
        .from("attendance_sessions")
        .select("id", { count: "exact", head: true })
        .eq("meeting_id", meetingId)
        .is("left_at", null)
        .gte("last_seen_at", since)
        .then(({ count }) => setParticipants(count ?? 0));
    }, 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(heartbeat);
      window.clearInterval(counter);
      const id = attendanceIdRef.current;
      if (id) {
        void supabase
          .from("attendance_sessions")
          .update({ left_at: new Date().toISOString(), status: "left_meeting" })
          .eq("id", id);
      }
    };
  }, [meeting?.id, session.userId, identity]);

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!meeting || !session.userId || !chatDraft.trim()) return;
    const message = chatDraft.trim();
    setChatDraft("");
    const { error } = await supabase.from("chat_messages").insert({
      meeting_id: meeting.id,
      user_id: session.userId,
      message,
      ...identity,
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

  async function toggleHand() {
    if (!meeting || !session.userId) return;
    if (handRaised) {
      const { error } = await supabase
        .from("raised_hands")
        .update({ status: "lowered" })
        .eq("meeting_id", meeting.id)
        .eq("user_id", session.userId)
        .eq("status", "raised");
      if (error) return showError(error, "Could not lower your hand");
      setHandRaised(false);
      return;
    }
    const { error } = await supabase.from("raised_hands").insert({
      meeting_id: meeting.id,
      user_id: session.userId,
      display_name: identity.display_name,
      church_name: identity.church_name,
    });
    if (error) return showError(error, "Could not raise your hand");
    setHandRaised(true);
    toast.success("Your hand is raised.");
  }

  async function signOut() {
    const id = attendanceIdRef.current;
    if (id) {
      await supabase
        .from("attendance_sessions")
        .update({ left_at: new Date().toISOString(), status: "logged_out" })
        .eq("id", id);
    }
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const live = meeting?.status === "live";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <img src={KINGSCHAT_LOGO_URL} alt="" className="size-8 rounded-lg" />
          <span className="font-display text-sm font-semibold tracking-tight">KC MEETING</span>
          {live && (
            <Badge className="ml-1 gap-1.5 bg-live text-live-foreground">
              <span className="size-1.5 animate-pulse rounded-full bg-live-foreground" />
              LIVE
            </Badge>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
              <Users className="size-4" />
              {participants}
            </span>
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
              {meeting?.scheduled_at
                ? ` • ${new Date(meeting.scheduled_at).toLocaleString()}`
                : ""}
            </p>
            {meeting?.description && (
              <p className="mt-3 text-sm leading-relaxed text-foreground/80">
                {meeting.description}
              </p>
            )}
            {meeting?.hand_raise_enabled && (
              <Button
                variant={handRaised ? "default" : "outline"}
                className="mt-5"
                onClick={toggleHand}
              >
                <Hand className="size-4" />
                {handRaised ? "Lower hand" : "Raise hand"}
              </Button>
            )}
          </div>
        </section>

        <aside className="rounded-2xl border border-border bg-card shadow-panel">
          <Tabs defaultValue="chat" className="flex h-[calc(100vh-9rem)] flex-col">
            <TabsList className="m-3 grid grid-cols-2">
              <TabsTrigger value="chat">
                <MessageSquare className="size-4" /> Chat
              </TabsTrigger>
              <TabsTrigger value="questions">
                <HelpCircle className="size-4" /> Q&amp;A
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
                  {messages.map((message) => (
                    <div key={message.id} className="rounded-xl bg-muted px-3 py-2">
                      <p className="text-xs font-medium text-primary">
                        {message.display_name}
                        {message.church_name && (
                          <span className="ml-1 font-normal text-muted-foreground">
                            • {message.church_name}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-sm leading-relaxed">{message.message}</p>
                    </div>
                  ))}
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
          </Tabs>
        </aside>
      </main>
    </div>
  );
}
