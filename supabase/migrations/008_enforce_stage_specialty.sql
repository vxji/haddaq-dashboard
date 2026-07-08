-- ============================================
-- Migration 008: An engineer may only edit the stage matching their specialty
-- ============================================
-- stages_update (002_rls_policies.sql) lets the project's assigned engineer
-- update ANY of the 5 stages (architectural, structural, electrical,
-- mechanical, approval_delivery), regardless of their own discipline.
-- This keeps the RLS as-is (still gates by project assignment / admin) but
-- adds a BEFORE UPDATE trigger that further requires the acting user's
-- profiles.job_title to match the stage_type being changed.
--
-- IMPORTANT: profiles.job_title must exactly match one of the values in
-- src/types/index.ts STAGE_ENGINEER_JOB_TITLE for that engineer to edit the
-- corresponding stage. The app's user forms now use a fixed dropdown with
-- these exact labels instead of free text, precisely so this match holds.

CREATE OR REPLACE FUNCTION public.enforce_stage_specialty()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  actor_job_title   TEXT;
  expected_job_title TEXT;
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  expected_job_title := CASE NEW.stage_type
    WHEN 'architectural'     THEN 'مهندس معماري'
    WHEN 'structural'        THEN 'مهندس إنشائي'
    WHEN 'electrical'        THEN 'مهندس كهربائي'
    WHEN 'mechanical'        THEN 'مهندس ميكانيكي'
    WHEN 'approval_delivery' THEN 'مهندس اعتماد وتسليم'
  END;

  SELECT job_title INTO actor_job_title FROM public.profiles WHERE id = auth.uid();

  IF actor_job_title IS DISTINCT FROM expected_job_title THEN
    RAISE EXCEPTION 'لا تملك صلاحية تعديل هذه المرحلة — يتطلب المسمى الوظيفي: %', expected_job_title;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_stage_specialty
  BEFORE UPDATE ON public.stages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_stage_specialty();
