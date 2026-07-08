-- ============================================
-- Migration 006: Include the acting user's name in stage-completion notifications
-- ============================================
-- The previous version of notify_stage_completion() never looked up who performed
-- the update, so notifications only said "اكتملت مرحلة في مشروع" with no actor.
-- auth.uid() reflects the authenticated user making the request (RLS context),
-- so we can resolve their name without adding a new column to stages.

CREATE OR REPLACE FUNCTION public.notify_stage_completion()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  stage_label TEXT;
  proj_name   TEXT;
  actor_name  TEXT;
BEGIN
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    stage_label := CASE NEW.stage_type
      WHEN 'architectural'     THEN 'المرحلة المعمارية'
      WHEN 'structural'        THEN 'المرحلة الإنشائية'
      WHEN 'electrical'        THEN 'المرحلة الكهربائية'
      WHEN 'mechanical'        THEN 'المرحلة الميكانيكية'
      WHEN 'approval_delivery' THEN 'مرحلة الاعتماد والتسليم'
    END;

    SELECT name INTO proj_name FROM public.projects WHERE id = NEW.project_id;
    SELECT full_name INTO actor_name FROM public.profiles WHERE id = auth.uid();

    -- Notify all admins and the assigned engineer
    INSERT INTO public.notifications (user_id, project_id, title, body, type)
    SELECT
      p.id,
      NEW.project_id,
      'اكتملت مرحلة في مشروع',
      CASE
        WHEN actor_name IS NOT NULL THEN
          'قام ' || actor_name || ' بإكمال ' || stage_label || ' في مشروع: ' || proj_name
        ELSE
          'تم إكمال ' || stage_label || ' في مشروع: ' || proj_name
      END,
      'stage_completed'
    FROM public.profiles p
    WHERE p.role = 'admin' OR p.id = (
      SELECT assigned_engineer_id FROM public.projects WHERE id = NEW.project_id
    );
  END IF;
  RETURN NEW;
END;
$$;
