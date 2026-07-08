-- ============================================
-- Migration 007: Only admins may reassign a project's engineer
-- ============================================
-- projects_update (002_rls_policies.sql) lets an assigned engineer update
-- any column on their own project, including assigned_engineer_id — so an
-- engineer could hand the project to (or take it from) another engineer.
-- RLS's USING clause has no access to OLD vs NEW, so this must be enforced
-- with a BEFORE UPDATE trigger.

CREATE OR REPLACE FUNCTION public.prevent_engineer_reassignment()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin()
     AND NEW.assigned_engineer_id IS DISTINCT FROM OLD.assigned_engineer_id THEN
    RAISE EXCEPTION 'فقط مدير النظام يمكنه تغيير المهندس المسؤول عن المشروع';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_engineer_reassignment
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.prevent_engineer_reassignment();
