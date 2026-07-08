-- ============================================
-- Migration 001: Create All Tables
-- مكتب الحداق للاستشارات الهندسية
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ====== ENUMS ======

CREATE TYPE public.user_role AS ENUM ('admin', 'employee');

CREATE TYPE public.project_status AS ENUM (
  'pending', 'in_progress', 'completed', 'cancelled', 'suspended'
);

CREATE TYPE public.stage_type AS ENUM (
  'architectural', 'structural', 'electrical', 'mechanical', 'approval_delivery'
);

CREATE TYPE public.stage_status AS ENUM ('not_started', 'in_progress', 'completed');

CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'done');

CREATE TYPE public.message_type AS ENUM ('text', 'image', 'file');

CREATE TYPE public.notification_type AS ENUM (
  'stage_completed', 'comment_added', 'file_uploaded', 'project_updated', 'reminder'
);

CREATE TYPE public.event_type AS ENUM ('deadline', 'meeting', 'task', 'milestone');

-- ====== SEQUENCE for project numbers ======
CREATE SEQUENCE IF NOT EXISTS project_number_seq START 1;

-- ====== PROFILES ======
-- Extends Supabase auth.users
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  phone       TEXT,
  job_title   TEXT,
  role        public.user_role NOT NULL DEFAULT 'employee',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====== PROJECTS ======
CREATE TABLE public.projects (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_number        TEXT NOT NULL UNIQUE,
  name                  TEXT NOT NULL,
  owner_name            TEXT NOT NULL,
  owner_id_number       TEXT NOT NULL,
  owner_phone           TEXT NOT NULL,
  address               TEXT NOT NULL,
  description           TEXT,
  contract_date         DATE,
  contract_signed       BOOLEAN NOT NULL DEFAULT false,
  total_contract_value  NUMERIC(15, 2) NOT NULL DEFAULT 0,
  status                public.project_status NOT NULL DEFAULT 'pending',
  assigned_engineer_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by            UUID NOT NULL REFERENCES public.profiles(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====== CONTRACTS ======
CREATE TABLE public.contracts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL,
  terms           TEXT,
  total_value     NUMERIC(15, 2) NOT NULL DEFAULT 0,
  pdf_url         TEXT,
  signed_at       TIMESTAMPTZ,
  signed_by       UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====== PAYMENTS ======
CREATE TABLE public.payments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  amount       NUMERIC(15, 2) NOT NULL,
  payment_date DATE NOT NULL,
  description  TEXT,
  receipt_url  TEXT,
  created_by   UUID NOT NULL REFERENCES public.profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====== STAGES ======
CREATE TABLE public.stages (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id           UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stage_type           public.stage_type NOT NULL,
  start_date           DATE,
  end_date             DATE,
  completion_date      DATE,
  progress_percentage  INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  status               public.stage_status NOT NULL DEFAULT 'not_started',
  description          TEXT,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, stage_type)
);

-- ====== TASKS ======
CREATE TABLE public.tasks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stage_id    UUID REFERENCES public.stages(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  description TEXT,
  due_date    DATE,
  status      public.task_status NOT NULL DEFAULT 'pending',
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by  UUID NOT NULL REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====== FILES ======
CREATE TABLE public.files (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stage_id    UUID REFERENCES public.stages(id) ON DELETE SET NULL,
  file_name   TEXT NOT NULL,
  file_url    TEXT NOT NULL,
  file_type   TEXT NOT NULL,
  file_size   BIGINT NOT NULL DEFAULT 0,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====== COMMENTS ======
CREATE TABLE public.comments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_id  UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====== CHAT MESSAGES ======
CREATE TABLE public.chat_messages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  message_type public.message_type NOT NULL DEFAULT 'text',
  file_url     TEXT,
  sent_by      UUID NOT NULL REFERENCES public.profiles(id),
  read_by      UUID[] NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====== NOTIFICATIONS ======
CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  type       public.notification_type NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====== CALENDAR EVENTS ======
CREATE TABLE public.calendar_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  event_type  public.event_type NOT NULL DEFAULT 'meeting',
  start_date  TIMESTAMPTZ NOT NULL,
  end_date    TIMESTAMPTZ,
  all_day     BOOLEAN NOT NULL DEFAULT false,
  created_by  UUID NOT NULL REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====== ACTIVITY LOGS (append-only) ======
CREATE TABLE public.activity_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  project_id  UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  description TEXT NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====== INDEXES ======
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_engineer ON public.projects(assigned_engineer_id);
CREATE INDEX idx_projects_owner_id ON public.projects(owner_id_number);
CREATE INDEX idx_projects_owner_phone ON public.projects(owner_phone);
CREATE INDEX idx_projects_created_at ON public.projects(created_at DESC);
CREATE INDEX idx_stages_project ON public.stages(project_id);
CREATE INDEX idx_payments_project ON public.payments(project_id);
CREATE INDEX idx_files_project ON public.files(project_id);
CREATE INDEX idx_comments_project ON public.comments(project_id);
CREATE INDEX idx_chat_project ON public.chat_messages(project_id);
CREATE INDEX idx_chat_created ON public.chat_messages(created_at DESC);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX idx_activity_project ON public.activity_logs(project_id);
CREATE INDEX idx_activity_user ON public.activity_logs(user_id);
CREATE INDEX idx_activity_created ON public.activity_logs(created_at DESC);
CREATE INDEX idx_calendar_start ON public.calendar_events(start_date);

-- ====== PROJECT SUMMARY VIEW ======
CREATE OR REPLACE VIEW public.project_summary AS
SELECT
  p.*,
  COALESCE(SUM(pay.amount), 0)::NUMERIC(15,2) AS amount_paid,
  (p.total_contract_value - COALESCE(SUM(pay.amount), 0))::NUMERIC(15,2) AS amount_remaining,
  prof.full_name AS engineer_name
FROM public.projects p
LEFT JOIN public.payments pay ON pay.project_id = p.id
LEFT JOIN public.profiles prof ON prof.id = p.assigned_engineer_id
GROUP BY p.id, prof.full_name;
