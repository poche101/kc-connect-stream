APP URL: https://efjwxznvsketolnrukfp.supabase.co/rest/v1/





-- Audit logs: an entry must be attributed to the signed-in user.
DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_insert_any_actor ON public.audit_logs;
CREATE POLICY audit_logs_insert ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Church directory: signed-in users only.
DROP POLICY IF EXISTS churches_select ON public.churches;
DROP POLICY IF EXISTS churches_select_public ON public.churches;
REVOKE SELECT ON public.churches FROM anon;
CREATE POLICY churches_select ON public.churches
  FOR SELECT TO authenticated
  USING (true);

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



-- Participants must be able to see each other in the meeting roster.
DROP POLICY IF EXISTS "attendance_select" ON public.attendance_sessions;
CREATE POLICY "attendance_select" ON public.attendance_sessions
  FOR SELECT TO authenticated USING (true);

-- Realtime delivery for the meeting screen.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_sessions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.questions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;


REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;
