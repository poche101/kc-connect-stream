-- ENUMS
CREATE TYPE public.app_role AS ENUM ('super_admin','admin','meeting_manager','host','moderator','participant');
CREATE TYPE public.meeting_status AS ENUM ('scheduled','starting_soon','live','ended','archived');
CREATE TYPE public.attendance_status AS ENUM ('in_meeting','idle','left_meeting','logged_out');
CREATE TYPE public.question_status AS ENUM ('pending','answered','dismissed');
CREATE TYPE public.hand_status AS ENUM ('raised','acknowledged','answered','lowered','dismissed');
CREATE TYPE public.message_status AS ENUM ('visible','hidden','deleted','pinned');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- CHURCHES
CREATE TABLE public.churches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  branch text,
  location text,
  church_code text UNIQUE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.churches TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.churches TO authenticated;
GRANT ALL ON public.churches TO service_role;
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;

-- ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin','admin','meeting_manager','host','moderator')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin','admin','meeting_manager')
  );
$$;

CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "churches_select_all" ON public.churches FOR SELECT USING (true);
CREATE POLICY "churches_manage" ON public.churches FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  phone text,
  church_id uuid REFERENCES public.churches(id) ON DELETE SET NULL,
  church_name text,
  church_email text,
  kc_handle text NOT NULL,
  photo_url text,
  status text NOT NULL DEFAULT 'active',
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX profiles_kc_handle_unique ON public.profiles (lower(kc_handle));
CREATE INDEX profiles_church_idx ON public.profiles (church_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own_or_staff" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own_or_admin" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, title, first_name, last_name, phone, church_id, church_name, church_email, kc_handle)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'title',
    COALESCE(NEW.raw_user_meta_data->>'first_name',''),
    COALESCE(NEW.raw_user_meta_data->>'last_name',''),
    NEW.raw_user_meta_data->>'phone',
    NULLIF(NEW.raw_user_meta_data->>'church_id','')::uuid,
    NEW.raw_user_meta_data->>'church_name',
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'kc_handle',''), 'KC' || substr(replace(NEW.id::text,'-',''),1,8))
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'participant') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- MEETINGS
CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  ended_at timestamptz,
  host_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  host_name text,
  status public.meeting_status NOT NULL DEFAULT 'scheduled',
  stream_url text,
  embed_url text,
  chat_enabled boolean NOT NULL DEFAULT true,
  questions_enabled boolean NOT NULL DEFAULT true,
  hand_raise_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX meetings_status_idx ON public.meetings (status, scheduled_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meetings TO authenticated;
GRANT ALL ON public.meetings TO service_role;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meetings_select" ON public.meetings FOR SELECT TO authenticated USING (true);
CREATE POLICY "meetings_manage" ON public.meetings FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR host_id = auth.uid())
  WITH CHECK (public.is_admin(auth.uid()) OR host_id = auth.uid());
CREATE TRIGGER meetings_updated_at BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ATTENDANCE
CREATE TABLE public.attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  church_name text,
  kc_handle text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  duration_seconds integer NOT NULL DEFAULT 0,
  status public.attendance_status NOT NULL DEFAULT 'in_meeting',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX attendance_meeting_idx ON public.attendance_sessions (meeting_id, status);
CREATE INDEX attendance_user_idx ON public.attendance_sessions (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_sessions TO authenticated;
GRANT ALL ON public.attendance_sessions TO service_role;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attendance_select" ON public.attendance_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "attendance_insert_own" ON public.attendance_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "attendance_update_own_or_staff" ON public.attendance_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE TRIGGER attendance_updated_at BEFORE UPDATE ON public.attendance_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CHAT
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  church_name text,
  message text NOT NULL,
  status public.message_status NOT NULL DEFAULT 'visible',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_meeting_idx ON public.chat_messages (meeting_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_select" ON public.chat_messages FOR SELECT TO authenticated
  USING (status <> 'deleted' OR public.is_staff(auth.uid()));
CREATE POLICY "chat_insert_own" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "chat_moderate" ON public.chat_messages FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "chat_delete" ON public.chat_messages FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- QUESTIONS
CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  church_name text,
  question text NOT NULL,
  status public.question_status NOT NULL DEFAULT 'pending',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz,
  answered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX questions_meeting_idx ON public.questions (meeting_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions_select" ON public.questions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "questions_insert_own" ON public.questions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "questions_update_staff" ON public.questions FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

-- RAISED HANDS
CREATE TABLE public.raised_hands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  church_name text,
  raised_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  answered_at timestamptz,
  status public.hand_status NOT NULL DEFAULT 'raised',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hands_meeting_idx ON public.raised_hands (meeting_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.raised_hands TO authenticated;
GRANT ALL ON public.raised_hands TO service_role;
ALTER TABLE public.raised_hands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hands_select" ON public.raised_hands FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "hands_insert_own" ON public.raised_hands FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "hands_update" ON public.raised_hands FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  kind text NOT NULL DEFAULT 'general',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_own" ON public.notifications FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- STREAM CONFIG
CREATE TABLE public.stream_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'Custom HLS',
  stream_url text,
  embed_url text,
  playback_type text NOT NULL DEFAULT 'hls',
  connection_status text NOT NULL DEFAULT 'unknown',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stream_configurations TO authenticated;
GRANT ALL ON public.stream_configurations TO service_role;
ALTER TABLE public.stream_configurations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stream_select_staff" ON public.stream_configurations FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "stream_manage_admin" ON public.stream_configurations FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- AUDIT LOGS
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name text,
  action text NOT NULL,
  entity text,
  entity_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_created_idx ON public.audit_logs (created_at DESC);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_select_admin" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "audit_insert_any" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- REALTIME
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.raised_hands REPLICA IDENTITY FULL;
ALTER TABLE public.questions REPLICA IDENTITY FULL;
ALTER TABLE public.attendance_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.meetings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.raised_hands;
ALTER PUBLICATION supabase_realtime ADD TABLE public.questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;

-- SEED
INSERT INTO public.churches (name, branch, location, church_code) VALUES
  ('Christ Embassy', 'Headquarters', 'Lagos, Nigeria', 'CE-HQ'),
  ('Christ Embassy', 'Ikeja', 'Lagos, Nigeria', 'CE-IKJ'),
  ('Christ Embassy', 'Abuja Central', 'Abuja, Nigeria', 'CE-ABJ'),
  ('Christ Embassy', 'Port Harcourt', 'Rivers, Nigeria', 'CE-PHC'),
  ('Christ Embassy', 'London', 'London, UK', 'CE-LDN');

INSERT INTO public.stream_configurations (provider, stream_url, playback_type, connection_status, is_default)
VALUES ('Mux / HLS', 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', 'hls', 'connected', true);

INSERT INTO public.meetings (title, description, scheduled_at, started_at, status, host_name, stream_url, chat_enabled, questions_enabled, hand_raise_enabled)
VALUES
  ('Global Leaders Meeting', 'Monthly broadcast for all ministry leaders.', now() - interval '10 minutes', now() - interval '10 minutes', 'live', 'Pastor John Doe', 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', true, true, true),
  ('Midweek Service Broadcast', 'Teaching and prayer session.', now() + interval '2 days', NULL, 'scheduled', 'Pastor John Doe', 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', true, true, true),
  ('Foundation School Special', 'Special session for new members.', now() + interval '6 days', NULL, 'scheduled', 'Pastor Grace A.', 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', true, true, true);