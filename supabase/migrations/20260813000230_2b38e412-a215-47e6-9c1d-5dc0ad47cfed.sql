-- 1. Collapse duplicate attendance rows: keep the earliest join per person per meeting,
-- carrying over the latest activity timestamps.
WITH ranked AS (
  SELECT id, meeting_id, user_id,
         ROW_NUMBER() OVER (PARTITION BY meeting_id, user_id ORDER BY joined_at ASC) AS rn
  FROM public.attendance_sessions
), keeper AS (
  SELECT meeting_id, user_id, id FROM ranked WHERE rn = 1
), agg AS (
  SELECT a.meeting_id, a.user_id,
         MAX(a.last_seen_at) AS last_seen_at,
         CASE WHEN bool_or(a.left_at IS NULL) THEN NULL ELSE MAX(a.left_at) END AS left_at
  FROM public.attendance_sessions a
  GROUP BY a.meeting_id, a.user_id
)
UPDATE public.attendance_sessions s
SET last_seen_at = agg.last_seen_at,
    left_at = agg.left_at
FROM keeper k
JOIN agg ON agg.meeting_id = k.meeting_id AND agg.user_id = k.user_id
WHERE s.id = k.id;

DELETE FROM public.attendance_sessions s
USING (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY meeting_id, user_id ORDER BY joined_at ASC) AS rn
  FROM public.attendance_sessions
) d
WHERE d.id = s.id AND d.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS attendance_sessions_meeting_user_key
  ON public.attendance_sessions (meeting_id, user_id);

-- 2. Attendance visibility: own rows, staff, or the roster of an active meeting only.
DROP POLICY IF EXISTS attendance_select ON public.attendance_sessions;
CREATE POLICY attendance_select ON public.attendance_sessions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_staff(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = attendance_sessions.meeting_id
        AND m.status IN ('starting_soon', 'live')
    )
  );

-- 3. Meetings visibility: archived meetings are staff-only.
DROP POLICY IF EXISTS meetings_select ON public.meetings;
CREATE POLICY meetings_select ON public.meetings
  FOR SELECT TO authenticated
  USING (
    public.is_staff(auth.uid())
    OR status IN ('scheduled', 'starting_soon', 'live', 'ended')
  );