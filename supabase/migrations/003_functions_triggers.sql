-- ============================================
-- Migration 003: Functions and Triggers
-- ============================================

-- ====== Auto-update updated_at ======
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_stages_updated_at
  BEFORE UPDATE ON public.stages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_calendar_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====== Auto-generate project number ======
CREATE OR REPLACE FUNCTION public.generate_project_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  seq_num INTEGER;
BEGIN
  seq_num := NEXTVAL('project_number_seq');
  NEW.project_number := 'ENG-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_projects_number
  BEFORE INSERT ON public.projects
  FOR EACH ROW
  WHEN (NEW.project_number IS NULL OR NEW.project_number = '')
  EXECUTE FUNCTION public.generate_project_number();

-- ====== Activity Log Trigger Function ======
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  action_text TEXT;
  entity_text TEXT;
  desc_text   TEXT;
  proj_id     UUID;
  meta        JSONB;
BEGIN
  -- Determine action
  IF TG_OP = 'INSERT' THEN
    action_text := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    action_text := 'update';
  ELSE
    action_text := 'delete';
  END IF;

  entity_text := TG_TABLE_NAME;

  -- Build metadata
  IF TG_OP = 'DELETE' THEN
    meta := to_jsonb(OLD);
    proj_id := CASE
      WHEN TG_TABLE_NAME = 'projects' THEN OLD.id
      WHEN TG_TABLE_NAME IN ('stages', 'payments', 'contracts', 'files', 'comments') THEN OLD.project_id
      ELSE NULL
    END;
  ELSE
    meta := jsonb_build_object(
      'new', to_jsonb(NEW),
      'old', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END
    );
    proj_id := CASE
      WHEN TG_TABLE_NAME = 'projects' THEN NEW.id
      WHEN TG_TABLE_NAME IN ('stages', 'payments', 'contracts', 'files', 'comments') THEN NEW.project_id
      ELSE NULL
    END;
  END IF;

  -- Build description
  desc_text := CASE action_text
    WHEN 'create' THEN 'تم إنشاء ' || entity_text
    WHEN 'update' THEN 'تم تعديل ' || entity_text
    WHEN 'delete' THEN 'تم حذف ' || entity_text
  END;

  INSERT INTO public.activity_logs (
    user_id, project_id, action, entity_type,
    entity_id, description, metadata
  ) VALUES (
    auth.uid(),
    proj_id,
    action_text,
    entity_text,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    desc_text,
    meta
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
EXCEPTION
  WHEN OTHERS THEN
    -- Never block the original operation due to logging failure
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- Attach activity log triggers
CREATE TRIGGER trg_log_projects
  AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER trg_log_contracts
  AFTER INSERT OR UPDATE OR DELETE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER trg_log_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER trg_log_stages
  AFTER INSERT OR UPDATE OR DELETE ON public.stages
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER trg_log_files
  AFTER INSERT OR DELETE ON public.files
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER trg_log_comments
  AFTER INSERT OR UPDATE OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- ====== Auto-create profile after signup ======
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'employee')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====== Auto-create project stages on project creation ======
CREATE OR REPLACE FUNCTION public.create_default_stages()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.stages (project_id, stage_type, status)
  VALUES
    (NEW.id, 'architectural', 'not_started'),
    (NEW.id, 'structural', 'not_started'),
    (NEW.id, 'electrical', 'not_started'),
    (NEW.id, 'mechanical', 'not_started'),
    (NEW.id, 'approval_delivery', 'not_started');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_project_default_stages
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.create_default_stages();

-- ====== Notification when stage completes ======
CREATE OR REPLACE FUNCTION public.notify_stage_completion()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  stage_label TEXT;
  proj_name   TEXT;
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

    -- Notify all admins and the assigned engineer
    INSERT INTO public.notifications (user_id, project_id, title, body, type)
    SELECT
      p.id,
      NEW.project_id,
      'اكتملت مرحلة في مشروع',
      'تم إكمال ' || stage_label || ' في مشروع: ' || proj_name,
      'stage_completed'
    FROM public.profiles p
    WHERE p.role = 'admin' OR p.id = (
      SELECT assigned_engineer_id FROM public.projects WHERE id = NEW.project_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stage_completion_notify
  AFTER UPDATE OF status ON public.stages
  FOR EACH ROW EXECUTE FUNCTION public.notify_stage_completion();

-- ====== Notification when comment is added ======
CREATE OR REPLACE FUNCTION public.notify_comment_added()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  proj_name TEXT;
BEGIN
  SELECT name INTO proj_name FROM public.projects WHERE id = NEW.project_id;

  INSERT INTO public.notifications (user_id, project_id, title, body, type)
  SELECT
    p.id,
    NEW.project_id,
    'ملاحظة جديدة',
    'تمت إضافة ملاحظة في مشروع: ' || proj_name,
    'comment_added'
  FROM public.profiles p
  WHERE (p.role = 'admin' OR p.id = (
    SELECT assigned_engineer_id FROM public.projects WHERE id = NEW.project_id
  ))
  AND p.id != NEW.created_by;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_comment_notify
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_comment_added();

-- ====== Notification when file is uploaded ======
CREATE OR REPLACE FUNCTION public.notify_file_uploaded()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  proj_name TEXT;
BEGIN
  SELECT name INTO proj_name FROM public.projects WHERE id = NEW.project_id;

  INSERT INTO public.notifications (user_id, project_id, title, body, type)
  SELECT
    p.id,
    NEW.project_id,
    'ملف جديد',
    'تم رفع ملف جديد في مشروع: ' || proj_name || ' — ' || NEW.file_name,
    'file_uploaded'
  FROM public.profiles p
  WHERE (p.role = 'admin' OR p.id = (
    SELECT assigned_engineer_id FROM public.projects WHERE id = NEW.project_id
  ))
  AND p.id != NEW.uploaded_by;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_file_notify
  AFTER INSERT ON public.files
  FOR EACH ROW EXECUTE FUNCTION public.notify_file_uploaded();

-- ====== Storage Buckets (run after migrations) ======
-- Note: Supabase Storage buckets should be created via Dashboard or CLI
-- INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('contract-pdfs', 'contract-pdfs', false);

-- ====== pg_cron: Reminder Job (runs daily at 8:00 AM UTC) ======
-- Requires pg_cron extension enabled in Supabase
-- SELECT cron.schedule('deadline-reminders', '0 8 * * *', $$
--   SELECT public.send_deadline_reminders();
-- $$);

CREATE OR REPLACE FUNCTION public.send_deadline_reminders()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  evt RECORD;
BEGIN
  FOR evt IN
    SELECT
      ce.id,
      ce.project_id,
      ce.title,
      ce.start_date,
      (ce.start_date::date - CURRENT_DATE) AS days_until
    FROM public.calendar_events ce
    WHERE ce.event_type = 'deadline'
      AND ce.start_date::date > CURRENT_DATE
      AND (ce.start_date::date - CURRENT_DATE) IN (1, 3, 7)
  LOOP
    INSERT INTO public.notifications (user_id, project_id, title, body, type)
    SELECT
      p.id,
      evt.project_id,
      'تذكير موعد تسليم',
      'يتبقى ' || evt.days_until || ' يوم/أيام على موعد: ' || evt.title,
      'reminder'
    FROM public.profiles p
    WHERE p.is_active = true
      AND (
        p.role = 'admin'
        OR p.id = (SELECT assigned_engineer_id FROM public.projects WHERE id = evt.project_id)
      );
  END LOOP;
END;
$$;
