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