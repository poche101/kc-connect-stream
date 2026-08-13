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