import { useEffect, useMemo, useState } from "react";
import { Users, Radio, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatDuration, initialsOf, secondsBetween, shortTime } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

export type AttendanceRow = Database["public"]["Tables"]["attendance_sessions"]["Row"];

// Heartbeats land every 15s, so a 45s window keeps "online" accurate while the
// participant is still on the meeting page.
const PRESENCE_WINDOW_MS = 45_000;

export type ParticipantView = {
  id: string;
  userId: string;
  name: string;
  kcHandle: string | null;
  church: string | null;
  joinedAt: string;
  leftAt: string | null;
  online: boolean;
};

/** Collapses raw attendance rows into one card per person (latest session wins). */
export function toParticipants(rows: AttendanceRow[]): ParticipantView[] {
  const latest = new Map<string, AttendanceRow>();
  for (const row of rows) {
    const current = latest.get(row.user_id);
    if (!current || new Date(row.joined_at) > new Date(current.joined_at)) {
      latest.set(row.user_id, row);
    }
  }
  return [...latest.values()]
    .map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.display_name?.trim() || "Participant",
      kcHandle: row.kc_handle,
      church: row.church_name,
      joinedAt: row.joined_at,
      leftAt: row.left_at,
      online:
        !row.left_at &&
        Date.now() - new Date(row.last_seen_at).getTime() < PRESENCE_WINDOW_MS,
    }))
    .sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

/** Zoom-style participant grid shown below the broadcast console. */
export function ParticipantGrid({ participants }: { participants: ParticipantView[] }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setTick((t) => t + 1), 5_000);
    return () => window.clearInterval(timer);
  }, []);

  const onlineCount = useMemo(
    () => participants.filter((p) => p.online).length,
    [participants],
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-panel">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-base font-semibold tracking-tight">Participants</h2>
        <Badge variant="secondary" className="gap-1.5">
          <Users className="size-3.5" />
          {participants.length} total
        </Badge>
        <Badge className="gap-1.5 bg-success text-success-foreground">
          <Radio className="size-3.5" />
          {onlineCount} in meeting
        </Badge>
      </div>

      {participants.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No one has joined yet.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {participants.map((person) => (
            <article
              key={person.userId}
              className="animate-pop-in group relative overflow-hidden rounded-xl border border-border bg-background p-4 transition-all hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-panel"
            >
              <span
                aria-hidden
                className={`absolute inset-x-0 top-0 h-1 ${
                  person.online ? "bg-success" : "bg-border"
                }`}
              />
              <div className="flex items-start gap-3">
                <span className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 font-display text-sm font-semibold text-primary">
                  {initialsOf(person.name)}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background ${
                      person.online ? "animate-live-pulse bg-success" : "bg-muted-foreground/50"
                    }`}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{person.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {person.kcHandle ?? "No KC handle"}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {person.church ?? "Church not set"}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                <span
                  className={`rounded-full px-2 py-0.5 font-medium ${
                    person.online
                      ? "bg-success/12 text-success"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {person.online ? "Online" : "Left the meeting"}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="size-3.5" />
                  {person.online
                    ? `${formatDuration(secondsBetween(person.joinedAt))} in`
                    : `${formatDuration(secondsBetween(person.joinedAt, person.leftAt))} • left ${
                        person.leftAt ? shortTime(person.leftAt) : ""
                      }`}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
