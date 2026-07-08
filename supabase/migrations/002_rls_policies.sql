-- ============================================
-- Migration 002: Row Level Security Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- ====== HELPER FUNCTIONS ======

-- Check if the authenticated user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  )
$$;

-- Check if user is assigned to a project
CREATE OR REPLACE FUNCTION public.is_assigned_to_project(project_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_uuid AND assigned_engineer_id = auth.uid()
  )
$$;

-- ====== PROFILES POLICIES ======

CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_insert_admin"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "profiles_update_own_or_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_delete_admin"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ====== PROJECTS POLICIES ======

CREATE POLICY "projects_select"
  ON public.projects FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR assigned_engineer_id = auth.uid()
    OR created_by = auth.uid()
  );

CREATE POLICY "projects_insert"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "projects_update"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR assigned_engineer_id = auth.uid()
  );

CREATE POLICY "projects_delete_admin"
  ON public.projects FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ====== CONTRACTS POLICIES ======

CREATE POLICY "contracts_select"
  ON public.contracts FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_assigned_to_project(project_id)
  );

CREATE POLICY "contracts_insert_admin"
  ON public.contracts FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "contracts_update_admin"
  ON public.contracts FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "contracts_delete_admin"
  ON public.contracts FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ====== PAYMENTS POLICIES ======

CREATE POLICY "payments_select"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_assigned_to_project(project_id)
  );

CREATE POLICY "payments_insert_admin"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "payments_update_admin"
  ON public.payments FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "payments_delete_admin"
  ON public.payments FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ====== STAGES POLICIES ======

CREATE POLICY "stages_select"
  ON public.stages FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_assigned_to_project(project_id)
  );

CREATE POLICY "stages_insert"
  ON public.stages FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR public.is_assigned_to_project(project_id)
  );

CREATE POLICY "stages_update"
  ON public.stages FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_assigned_to_project(project_id)
  );

CREATE POLICY "stages_delete_admin"
  ON public.stages FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ====== FILES POLICIES ======

CREATE POLICY "files_select"
  ON public.files FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_assigned_to_project(project_id)
  );

CREATE POLICY "files_insert"
  ON public.files FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR public.is_assigned_to_project(project_id)
  );

CREATE POLICY "files_delete_admin"
  ON public.files FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ====== COMMENTS POLICIES ======

CREATE POLICY "comments_select"
  ON public.comments FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_assigned_to_project(project_id)
  );

CREATE POLICY "comments_insert"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (public.is_admin() OR public.is_assigned_to_project(project_id))
  );

CREATE POLICY "comments_update_own"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR public.is_admin());

CREATE POLICY "comments_delete_own_or_admin"
  ON public.comments FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR public.is_admin());

-- ====== CHAT MESSAGES POLICIES ======

CREATE POLICY "chat_select"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_assigned_to_project(project_id)
  );

CREATE POLICY "chat_insert"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (public.is_admin() OR public.is_assigned_to_project(project_id))
  );

CREATE POLICY "chat_update_own"
  ON public.chat_messages FOR UPDATE
  TO authenticated
  USING (sent_by = auth.uid() OR public.is_admin());

CREATE POLICY "chat_delete_admin"
  ON public.chat_messages FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ====== NOTIFICATIONS POLICIES ======

CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_delete_own"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_insert"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- ====== CALENDAR EVENTS POLICIES ======

CREATE POLICY "calendar_select"
  ON public.calendar_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "calendar_insert"
  ON public.calendar_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "calendar_update"
  ON public.calendar_events FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR public.is_admin());

CREATE POLICY "calendar_delete"
  ON public.calendar_events FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR public.is_admin());

-- ====== ACTIVITY LOGS POLICIES (read-only for users, no delete) ======

CREATE POLICY "activity_logs_select_admin"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR project_id IN (
      SELECT id FROM public.projects
      WHERE assigned_engineer_id = auth.uid()
    )
  );

-- INSERT allowed only via server-side triggers (service role)
-- No UPDATE or DELETE policies — immutable audit trail
