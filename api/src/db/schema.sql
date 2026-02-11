-- Dersimiz Database Schema
-- Run with: psql $DATABASE_URL -f src/db/schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Admin users (web only, email + password)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mobile/app users (profiles)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT UNIQUE NOT NULL,
  country_code TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'tutor', 'student')),
  full_name TEXT,
  school_name TEXT,
  avatar_url TEXT,
  is_approved BOOLEAN DEFAULT false,
  is_banned BOOLEAN DEFAULT false,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role) WHERE deleted_at IS NULL;

-- OTP codes and auth tokens (access/refresh jti) are stored in Redis, not in PostgreSQL.

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  new_message BOOLEAN DEFAULT true,
  approval_status BOOLEAN DEFAULT true,
  subscription_update BOOLEAN DEFAULT true,
  booster_update BOOLEAN DEFAULT true,
  new_student_contact BOOLEAN DEFAULT true,
  support_reply BOOLEAN DEFAULT true,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications log
CREATE TABLE IF NOT EXISTS notifications_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications_log(user_id, sent_at DESC);

-- Subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  display_name JSONB NOT NULL,
  description JSONB NOT NULL,
  monthly_price_cents INTEGER NOT NULL,
  yearly_price_cents INTEGER NOT NULL,
  apple_product_id_monthly VARCHAR(100),
  apple_product_id_yearly VARCHAR(100),
  google_product_id_monthly VARCHAR(100),
  google_product_id_yearly VARCHAR(100),
  features JSONB NOT NULL DEFAULT '[]',
  max_students INTEGER,
  search_visibility_boost INTEGER DEFAULT 0,
  profile_badge VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  icon VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_sort ON subscription_plans(sort_order);

-- User subscriptions (references profiles)
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  is_renewing BOOLEAN DEFAULT true,
  is_cancelled BOOLEAN DEFAULT false,
  is_trial BOOLEAN DEFAULT false,
  billing_interval VARCHAR(20) NOT NULL,
  billing_provider VARCHAR(20) NOT NULL,
  provider_subscription_id VARCHAR(255),
  provider_transaction_id VARCHAR(255),
  provider_receipt TEXT,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_active ON user_subscriptions(user_id, is_active, end_date);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_provider ON user_subscriptions(provider_subscription_id);

-- Boosters
CREATE TABLE IF NOT EXISTS boosters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  display_name JSONB NOT NULL,
  description JSONB NOT NULL,
  price_cents INTEGER NOT NULL,
  apple_product_id VARCHAR(100),
  google_product_id VARCHAR(100),
  duration_days INTEGER NOT NULL,
  search_ranking_boost INTEGER NOT NULL,
  badge_text JSONB,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  icon VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boosters_active ON boosters(is_active);

-- User boosters
CREATE TABLE IF NOT EXISTS user_boosters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booster_id UUID NOT NULL REFERENCES boosters(id),
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  provider_transaction_id VARCHAR(255) NOT NULL,
  provider_receipt TEXT,
  billing_provider VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_boosters_user ON user_boosters(user_id);
CREATE INDEX IF NOT EXISTS idx_user_boosters_active ON user_boosters(user_id, is_active, expires_at);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'TRY',
  status VARCHAR(20) NOT NULL,
  billing_provider VARCHAR(20) NOT NULL,
  provider_transaction_id VARCHAR(255) NOT NULL,
  provider_receipt TEXT,
  subscription_id UUID REFERENCES user_subscriptions(id),
  booster_id UUID REFERENCES user_boosters(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_provider ON transactions(provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);

-- Locations (countries, optional state/region, cities, districts)
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES locations(id),
  type TEXT NOT NULL CHECK (type IN ('country', 'state', 'city', 'district')),
  name JSONB NOT NULL,
  code VARCHAR(20),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_locations_parent ON locations(parent_id);
CREATE INDEX IF NOT EXISTS idx_locations_type ON locations(type);

-- Schools
CREATE TABLE IF NOT EXISTS school_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name JSONB NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

-- Grades (bound to school types: e.g. Grade 9 for High School, Year 2 for University)
CREATE TABLE IF NOT EXISTS grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_type_id UUID NOT NULL REFERENCES school_types(id) ON DELETE CASCADE,
  name JSONB NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_grades_school_type ON grades(school_type_id);

-- Lesson types (for onboarding and search)
CREATE TABLE IF NOT EXISTS lesson_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  name JSONB NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

-- Tutor lesson offerings (tutor_id = profile id, role = tutor)
CREATE TABLE IF NOT EXISTS tutor_lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_type_id UUID NOT NULL REFERENCES lesson_types(id),
  price_per_hour_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'TRY',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tutor_id, lesson_type_id)
);

CREATE INDEX IF NOT EXISTS idx_tutor_lessons_tutor ON tutor_lessons(tutor_id);

-- Tutor availability (simplified: JSONB slots per week)
CREATE TABLE IF NOT EXISTS tutor_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slots JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tutor_id)
);

-- Conversations (chat)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tutor_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_tutor ON conversations(tutor_id);
CREATE INDEX IF NOT EXISTS idx_conversations_student ON conversations(student_id);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'text',
  content TEXT,
  payload JSONB,
  moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'blocked', 'flagged')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);

-- Support tickets (one conversation per user with support)
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'replied', 'closed')),
  subject TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id),
  is_admin BOOLEAN DEFAULT false,
  admin_user_id UUID REFERENCES admin_users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Legal documents
CREATE TABLE IF NOT EXISTS legal_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL CHECK (type IN ('terms_and_conditions', 'privacy_notice', 'cookie_policy', 'acceptable_usage_policy')),
  version INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  body_markdown TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(type, version)
);

CREATE INDEX IF NOT EXISTS idx_legal_documents_type_version ON legal_documents(type, version DESC);

-- User agreements (profile accepted legal docs)
CREATE TABLE IF NOT EXISTS user_agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  legal_document_id UUID NOT NULL REFERENCES legal_documents(id),
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address VARCHAR(45) NOT NULL,
  UNIQUE(user_id, legal_document_id)
);

CREATE INDEX IF NOT EXISTS idx_user_agreements_user ON user_agreements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_agreements_document ON user_agreements(legal_document_id);

-- Student favorites (tutors)
CREATE TABLE IF NOT EXISTS student_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, tutor_id)
);

CREATE INDEX IF NOT EXISTS idx_student_favorites_student ON student_favorites(student_id);

-- Onboarding progress (step data per user)
CREATE TABLE IF NOT EXISTS onboarding_progress (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 0,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student search history
CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  criteria JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_history_student ON search_history(student_id, created_at DESC);

-- Student preferred lesson types (multiple; for "lessons I want to take")
CREATE TABLE IF NOT EXISTS student_lesson_preferences (
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_type_id UUID NOT NULL REFERENCES lesson_types(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, lesson_type_id)
);
CREATE INDEX IF NOT EXISTS idx_student_lesson_preferences_student ON student_lesson_preferences(student_id);

-- Tutor schools (multiple free-text school names)
CREATE TABLE IF NOT EXISTS tutor_schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  school_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tutor_schools_tutor ON tutor_schools(tutor_id);

-- Tutor grades (multiple; references grades table)
CREATE TABLE IF NOT EXISTS tutor_grades (
  tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  grade_id UUID NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tutor_id, grade_id)
);
CREATE INDEX IF NOT EXISTS idx_tutor_grades_tutor ON tutor_grades(tutor_id);
