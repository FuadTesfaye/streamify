-- Multi-provider streaming and payment entitlement schemas
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_provider_check;
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_video_id_check;

-- Provider can be youtube, mux, or cloudflare
ALTER TABLE lessons ADD CONSTRAINT lessons_provider_check CHECK (provider IN ('youtube', 'mux', 'cloudflare'));

-- video_id / playback_id must be a non-empty identifier (at least 4 chars)
ALTER TABLE lessons ADD CONSTRAINT lessons_video_id_check CHECK (length(video_id) >= 4);

-- Add visibility and playback policy to lessons
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'free' CHECK (visibility IN ('free', 'paid'));
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS playback_policy text NOT NULL DEFAULT 'public' CHECK (playback_policy IN ('public', 'signed', 'drm'));

-- Add pricing and premium status to courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS price integer NOT NULL DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'usd';

-- Add expiration to enrollments (null means lifetime)
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Payments table for automated purchase tracking and entitlement auditing
CREATE TABLE IF NOT EXISTS payments (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  course_id text NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  provider text NOT NULL DEFAULT 'stripe',
  transaction_reference text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_user_idx ON payments(user_id);
CREATE INDEX IF NOT EXISTS payments_course_idx ON payments(course_id);
