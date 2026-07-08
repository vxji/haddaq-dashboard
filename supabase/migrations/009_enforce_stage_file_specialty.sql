-- ============================================
-- Migration 009: Stage-specific file uploads follow the same specialty rule
-- ============================================
-- files_insert (002_rls_policies.sql) lets any project-assigned user attach a
-- file to any stage via files.stage_id, bypassing the same-specialty rule
-- added for stages in 008_enforce_stage_specialty.sql. This adds a matching
-- BEFORE INSERT trigger — it only fires when stage_id is set, so general
-- project-level uploads (stage_id NULL) are unaffected.

CREATE OR REPLACE FUNCTION public.enforce_stage_file_specialty()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  target_stage_type  public.stage_type;
  actor_job_title     TEXT;
  expected_job_title  TEXT;
BEGIN
  IF NEW.stage_id IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  SELECT stage_type INTO target_stage_type FROM public.stages WHERE id = NEW.stage_id;

  expected_job_title := CASE target_stage_type
    WHEN 'architectural'     THEN 'مهندس معماري'
    WHEN 'structural'        THEN 'مهندس إنشائي'
    WHEN 'electrical'        THEN 'مهندس كهربائي'
    WHEN 'mechanical'        THEN 'مهندس ميكانيكي'
    WHEN 'approval_delivery' THEN 'مهندس اعتماد وتسليم'
  END;

  SELECT job_title INTO actor_job_title FROM public.profiles WHERE id = auth.uid();

  IF actor_job_title IS DISTINCT FROM expected_job_title THEN
    RAISE EXCEPTION 'لا تملك صلاحية رفع ملفات لهذه المرحلة — يتطلب المسمى الوظيفي: %', expected_job_title;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_stage_file_specialty
  BEFORE INSERT ON public.files
  FOR EACH ROW EXECUTE FUNCTION public.enforce_stage_file_specialty();
