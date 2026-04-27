-- Permanent 6-char family identifier used for caregiver re-login (separate from invite codes)
ALTER TABLE families ADD COLUMN family_code text;

UPDATE families
SET family_code = upper(substring(md5(gen_random_uuid()::text) from 1 for 6));

ALTER TABLE families ALTER COLUMN family_code SET NOT NULL;
ALTER TABLE families ADD CONSTRAINT families_family_code_key UNIQUE (family_code);

-- Called unauthenticated to resolve family_id from family_code during caregiver login
CREATE OR REPLACE FUNCTION get_family_id_by_code(p_family_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_family_id uuid;
BEGIN
  SELECT id INTO v_family_id FROM families WHERE family_code = upper(p_family_code);
  RETURN v_family_id;
END;
$$;

-- Replace restrictive invite_codes SELECT policy with public-read (caregivers must
-- look up family_id by code BEFORE authenticating)
DROP POLICY IF EXISTS "family read codes" ON invite_codes;
DROP POLICY IF EXISTS "public read codes" ON invite_codes;
CREATE POLICY "public read codes" ON invite_codes FOR SELECT USING (true);

-- Update create_parent_profile to generate family_code on new family
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
