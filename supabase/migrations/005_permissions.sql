-- ============================================
-- Migration 005: Permissions (extensible role system)
-- ============================================

CREATE TABLE public.permissions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key        TEXT NOT NULL UNIQUE,
  label      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.role_permissions (
  role          public.user_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_id)
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permissions_select"
  ON public.permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "permissions_admin_write"
  ON public.permissions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "role_permissions_select"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "role_permissions_admin_write"
  ON public.role_permissions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Helper for future RLS/UI checks: SELECT public.has_permission('projects.delete')
CREATE OR REPLACE FUNCTION public.has_permission(perm_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.role_permissions rp
    JOIN public.permissions p ON p.id = rp.permission_id
    JOIN public.profiles pr ON pr.role = rp.role
    WHERE pr.id = auth.uid() AND p.key = perm_key AND pr.is_active = true
  )
$$;

-- ====== Seed catalog reflecting current admin/employee capabilities ======
INSERT INTO public.permissions (key, label) VALUES
  ('users.manage',          'إنشاء وحذف المستخدمين'),
  ('permissions.manage',    'تعديل صلاحيات الأدوار'),
  ('projects.view_all',     'رؤية كل المشاريع'),
  ('projects.delete',       'حذف المشاريع'),
  ('projects.edit_assigned','تعديل المشاريع المسندة'),
  ('contracts.manage',      'إدارة العقود'),
  ('payments.manage',       'إدارة المدفوعات'),
  ('activity_log.view_all', 'رؤية سجل النشاط الكامل'),
  ('notes.add',             'إضافة ملاحظات'),
  ('files.upload',          'رفع ملفات'),
  ('chat.use',              'استخدام الدردشة');

-- Admin: all permissions
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin', id FROM public.permissions;

-- Employee: scoped subset matching current behavior
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'employee', id FROM public.permissions
WHERE key IN ('projects.edit_assigned', 'notes.add', 'files.upload', 'chat.use');
