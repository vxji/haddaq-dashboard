-- ============================================
-- Migration 004: Seed Data
-- Run AFTER creating the first admin user via Supabase Auth
-- ============================================

-- NOTE: After running migrations 001-003, create the first admin user via:
-- 1. Supabase Dashboard → Authentication → Users → Add User
-- 2. Set email: admin@haddaq.com, password: (secure password)
-- 3. Then run the UPDATE below with the actual UUID from auth.users

-- Update the first user to be admin (replace 'YOUR_ADMIN_UUID' with actual UUID)
-- UPDATE public.profiles
-- SET role = 'admin', full_name = 'مدير النظام', job_title = 'مدير النظام'
-- WHERE id = 'YOUR_ADMIN_UUID';

-- ====== Verify setup ======
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- SELECT * FROM public.profiles;
