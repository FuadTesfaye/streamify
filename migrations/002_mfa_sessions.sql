-- A user-level enabled flag does not prove that a particular login completed MFA.
CREATE TABLE IF NOT EXISTS session_mfa (
 session_id text PRIMARY KEY REFERENCES session(id) ON DELETE CASCADE,
 verified_at timestamptz NOT NULL DEFAULT now()
);
