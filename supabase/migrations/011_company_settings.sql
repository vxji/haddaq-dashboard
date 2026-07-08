-- ============================================
-- Migration 011: Company (office) settings
-- Singleton table (id always 1) holding office info shown on
-- exported PDF/Excel report headers and the settings page.
-- Safe to re-run: drops its own objects first.
-- ============================================

DROP TABLE IF EXISTS public.company_settings;

CREATE TABLE public.company_settings (
  id                   INTEGER PRIMARY KEY DEFAULT 1,
  office_name          TEXT NOT NULL DEFAULT '',
  logo_url             TEXT,
  commercial_register  TEXT,
  tax_number           TEXT,
  address              TEXT,
  phone                TEXT,
  email                TEXT,
  website              TEXT,
  updated_by           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT company_settings_singleton CHECK (id = 1)
);

-- Seed the single row so the app can always UPDATE ... WHERE id = 1
-- instead of juggling insert-vs-update logic.
INSERT INTO public.company_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER trg_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====== RLS ======
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Everyone signed in can read (needed to stamp report headers app-wide)
CREATE POLICY "company_settings_select"
  ON public.company_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can edit. No INSERT/DELETE policy — the row is
-- pre-seeded and permanent (singleton by CHECK constraint).
CREATE POLICY "company_settings_update_admin"
  ON public.company_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ====== Storage bucket for the office logo ======
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "company_assets_public_read" ON storage.objects;
DROP POLICY IF EXISTS "company_assets_admin_write" ON storage.objects;
DROP POLICY IF EXISTS "company_assets_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "company_assets_admin_delete" ON storage.objects;

CREATE POLICY "company_assets_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company-assets');

CREATE POLICY "company_assets_admin_write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'company-assets' AND public.is_admin());

CREATE POLICY "company_assets_admin_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'company-assets' AND public.is_admin());

CREATE POLICY "company_assets_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'company-assets' AND public.is_admin());
