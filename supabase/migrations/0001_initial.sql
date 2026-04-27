-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Tables ─────────────────────────────────────────────────────────────────

CREATE TABLE families (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL DEFAULT 'My Family',
  timezone   text        NOT NULL DEFAULT 'UTC',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
  id           uuid    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id    uuid    NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  display_name text    NOT NULL,
  login_slug   text    NOT NULL,
  is_parent    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, login_slug)
);

CREATE TABLE invite_codes (
  code       text        PRIMARY KEY,
  family_id  uuid        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  created_by uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  expires_at timestamptz,
  uses       integer     NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE events (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id  uuid        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  logged_by  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       text        NOT NULL CHECK (type IN ('sleep','breastfeed','bottle','note','diaper','bath','pump')),
  started_at timestamptz NOT NULL,
  ended_at   timestamptz,
  data       jsonb       NOT NULL DEFAULT '{}',
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX events_family_started  ON events (family_id, started_at DESC);
CREATE INDEX events_family_type     ON events (family_id, type, started_at DESC);
CREATE INDEX events_active          ON events (family_id) WHERE ended_at IS NULL AND deleted_at IS NULL;
CREATE INDEX events_not_deleted     ON events (family_id, started_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE push_subscriptions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  family_id  uuid        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  endpoint   text        UNIQUE NOT NULL,
  p256dh     text        NOT NULL,
  auth       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE reminder_settings (
  family_id            uuid    PRIMARY KEY REFERENCES families(id) ON DELETE CASCADE,
  feed_threshold_min   integer NOT NULL DEFAULT 120,
  sleep_threshold_min  integer NOT NULL DEFAULT 120,
  enabled              boolean NOT NULL DEFAULT true
);

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE families          ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_settings ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's family_id
CREATE OR REPLACE FUNCTION get_user_family_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT family_id FROM profiles WHERE id = auth.uid()
$$;

-- Families
CREATE POLICY "read own family"   ON families FOR SELECT USING (id = get_user_family_id());
CREATE POLICY "update own family" ON families FOR UPDATE USING (id = get_user_family_id());

-- Profiles
CREATE POLICY "read family profiles" ON profiles FOR SELECT USING (family_id = get_user_family_id());
CREATE POLICY "update own profile"   ON profiles FOR UPDATE USING (id = auth.uid());

-- Invite codes
CREATE POLICY "public read codes"   ON invite_codes FOR SELECT USING (true);
CREATE POLICY "family create codes" ON invite_codes FOR INSERT WITH CHECK (family_id = get_user_family_id());
CREATE POLICY "family update codes" ON invite_codes FOR UPDATE USING (family_id = get_user_family_id());

-- Events
CREATE POLICY "family read events"   ON events FOR SELECT USING (family_id = get_user_family_id());
CREATE POLICY "family insert events" ON events FOR INSERT WITH CHECK (family_id = get_user_family_id());
CREATE POLICY "family update events" ON events FOR UPDATE USING (family_id = get_user_family_id());

-- Push subscriptions
CREATE POLICY "own subscriptions" ON push_subscriptions FOR ALL USING (profile_id = auth.uid());

-- Reminder settings
CREATE POLICY "family reminder settings" ON reminder_settings FOR ALL USING (family_id = get_user_family_id());

-- ─── Triggers ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Functions (SECURITY DEFINER — called from client) ───────────────────────

-- Create parent profile + family after Supabase auth signup
CREATE OR REPLACE FUNCTION create_parent_profile(
  p_display_name text,
  p_family_name  text,
  p_timezone     text DEFAULT 'UTC'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_family_id uuid;
  v_slug      text;
BEGIN
  v_slug := lower(regexp_replace(p_display_name, '[^a-zA-Z0-9]', '', 'g'));

  INSERT INTO families (name, timezone, family_code)
  VALUES (p_family_name, p_timezone, upper(substring(md5(gen_random_uuid()::text) from 1 for 6)))
  RETURNING id INTO v_family_id;

  INSERT INTO profiles (id, family_id, display_name, login_slug, is_parent)
  VALUES (auth.uid(), v_family_id, p_display_name, v_slug, true);

  INSERT INTO reminder_settings (family_id) VALUES (v_family_id);

  RETURN jsonb_build_object('family_id', v_family_id);
END;
$$;

-- Join existing family via invite code
CREATE OR REPLACE FUNCTION join_family_with_code(
  p_code         text,
  p_display_name text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_family_id uuid;
  v_slug      text;
BEGIN
  SELECT family_id INTO v_family_id
  FROM invite_codes
  WHERE code = p_code
    AND (expires_at IS NULL OR expires_at > now());

  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;

  v_slug := lower(regexp_replace(p_display_name, '[^a-zA-Z0-9]', '', 'g'));

  INSERT INTO profiles (id, family_id, display_name, login_slug, is_parent)
  VALUES (auth.uid(), v_family_id, p_display_name, v_slug, false);

  UPDATE invite_codes SET uses = uses + 1 WHERE code = p_code;

  RETURN jsonb_build_object('family_id', v_family_id);
END;
$$;

-- Generate invite code (6 chars, no ambiguous characters)
CREATE OR REPLACE FUNCTION generate_invite_code(
  p_expires_hours integer DEFAULT 24
)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_code    text;
  v_fam_id  uuid;
  v_chars   text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i         integer;
BEGIN
  v_fam_id := get_user_family_id();
  IF v_fam_id IS NULL THEN RAISE EXCEPTION 'No family'; END IF;

  LOOP
    v_code := '';
    FOR i IN 1..6 LOOP
      v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::integer, 1);
    END LOOP;

    BEGIN
      INSERT INTO invite_codes (code, family_id, created_by, expires_at)
      VALUES (
        v_code, v_fam_id, auth.uid(),
        CASE WHEN p_expires_hours IS NULL THEN NULL
             ELSE now() + (p_expires_hours || ' hours')::interval
        END
      );
      EXIT;
    EXCEPTION WHEN unique_violation THEN -- retry
    END;
  END LOOP;

  RETURN v_code;
END;
$$;
