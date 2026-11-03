CREATE TABLE IF NOT EXISTS courses (
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text, title text NOT NULL, description text NOT NULL DEFAULT '',
 category text NOT NULL DEFAULT 'General', published boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS lessons (
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text, course_id text NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
 title text NOT NULL, description text NOT NULL DEFAULT '', position integer NOT NULL CHECK(position>0),
 video_id text NOT NULL CHECK(video_id ~ '^[a-zA-Z0-9_-]{11}$'), provider text NOT NULL DEFAULT 'youtube' CHECK(provider='youtube'),
 published boolean NOT NULL DEFAULT false, UNIQUE(course_id,position)
);
CREATE TABLE IF NOT EXISTS enrollments (
 user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE, course_id text NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
 active boolean NOT NULL DEFAULT true, PRIMARY KEY(user_id,course_id)
);
CREATE TABLE IF NOT EXISTS invitations (
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text, email text NOT NULL, token_hash text NOT NULL UNIQUE,
 course_id text REFERENCES courses(id) ON DELETE SET NULL, expires_at timestamptz NOT NULL,
 accepted_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invitations_email_idx ON invitations(email);
CREATE TABLE IF NOT EXISTS login_activity (
 session_id text PRIMARY KEY REFERENCES session(id) ON DELETE CASCADE,
 last_seen timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS trusted_browsers (
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text, user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE, label text NOT NULL, expires_at timestamptz NOT NULL, revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS browser_user_idx ON trusted_browsers(user_id);
CREATE TABLE IF NOT EXISTS browser_challenges (
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text, session_id text NOT NULL REFERENCES session(id) ON DELETE CASCADE,
 user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE, code_hash text NOT NULL, attempts integer NOT NULL DEFAULT 0,
 expires_at timestamptz NOT NULL, used_at timestamptz
);
CREATE INDEX IF NOT EXISTS challenge_session_idx ON browser_challenges(session_id);
CREATE TABLE IF NOT EXISTS playback_sessions (
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text, user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 session_id text NOT NULL REFERENCES session(id) ON DELETE CASCADE, browser_id text NOT NULL REFERENCES trusted_browsers(id),
 lesson_id text NOT NULL REFERENCES lessons(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL,
 revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS playback_user_idx ON playback_sessions(user_id,expires_at) WHERE revoked_at IS NULL;
CREATE TABLE IF NOT EXISTS security_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, kind text NOT NULL, user_id text REFERENCES "user"(id) ON DELETE SET NULL,
 reference text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_created_idx ON security_events(created_at);
