-- ============================================
-- Migration 010: Let recipients mark chat messages as read
-- ============================================
-- chat_update_own (002_rls_policies.sql) only allowed a message's sender (or
-- admin) to UPDATE it. But "mark as read" (ChatRoom.tsx loadMessages) works
-- by appending the *viewer* to read_by on messages sent by OTHER people —
-- exactly the case this policy blocked. The update silently affected 0 rows
-- (RLS filters rows rather than erroring), so unread badges never cleared.
--
-- Fix: let anyone assigned to the project update the row (needed for read
-- receipts), but add a trigger so non-senders can only change read_by —
-- not the message content itself.

DROP POLICY "chat_update_own" ON public.chat_messages;

CREATE POLICY "chat_update_assigned"
  ON public.chat_messages FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR sent_by = auth.uid()
    OR public.is_assigned_to_project(project_id)
  )
  WITH CHECK (
    public.is_admin()
    OR sent_by = auth.uid()
    OR public.is_assigned_to_project(project_id)
  );

CREATE OR REPLACE FUNCTION public.restrict_chat_message_update()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NEW.sent_by IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    IF NEW.content IS DISTINCT FROM OLD.content
       OR NEW.message_type IS DISTINCT FROM OLD.message_type
       OR NEW.file_url IS DISTINCT FROM OLD.file_url
       OR NEW.sent_by IS DISTINCT FROM OLD.sent_by
       OR NEW.project_id IS DISTINCT FROM OLD.project_id THEN
      RAISE EXCEPTION 'يمكن فقط تحديث حالة القراءة لرسائل الآخرين';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_restrict_chat_message_update
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.restrict_chat_message_update();
