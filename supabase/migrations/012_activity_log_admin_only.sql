-- ============================================
-- Migration 012: Restrict activity_logs to admin-only read
-- Previous policy also let an assigned engineer read logs for
-- their own project. سجل النشاط must be visible to admin only.
-- Safe to re-run: drops its own policy first.
-- ============================================

DROP POLICY IF EXISTS "activity_logs_select_admin" ON public.activity_logs;

CREATE POLICY "activity_logs_select_admin"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());
