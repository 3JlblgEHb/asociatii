-- Replace the apartment-centric model with the condominium/property domain.

CREATE TYPE public.property_unit_type AS ENUM (
  'apartment',
  'commercial',
  'parking',
  'storage',
  'other'
);

CREATE TYPE public.occupancy_type AS ENUM (
  'tenant',
  'resident',
  'commercial_occupant',
  'other'
);

CREATE TABLE public.condominiums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  cadastral_number TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  UNIQUE (organization_id, cadastral_number)
);

CREATE TRIGGER condominiums_updated_at
  BEFORE UPDATE ON public.condominiums
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.condominiums (organization_id, name, address)
SELECT id, name || ' — Condominiu', COALESCE(address, 'Adresă nespecificată')
FROM public.organizations;

ALTER TABLE public.buildings ADD COLUMN condominium_id UUID;

UPDATE public.buildings building
SET condominium_id = (
  SELECT condominium.id
  FROM public.condominiums condominium
  WHERE condominium.organization_id = building.organization_id
  ORDER BY condominium.created_at, condominium.id
  LIMIT 1
);

ALTER TABLE public.buildings ALTER COLUMN condominium_id SET NOT NULL;
ALTER TABLE public.buildings
  ADD CONSTRAINT buildings_condominium_same_organization
  FOREIGN KEY (condominium_id, organization_id)
  REFERENCES public.condominiums (id, organization_id);

ALTER TABLE public.apartments RENAME TO property_units;
ALTER TABLE public.property_units ADD COLUMN condominium_id UUID;
ALTER TABLE public.property_units
  ADD COLUMN unit_type public.property_unit_type NOT NULL DEFAULT 'apartment';
ALTER TABLE public.property_units ADD COLUMN cadastral_number TEXT;
ALTER TABLE public.property_units ADD COLUMN entrance TEXT;
ALTER TABLE public.property_units
  ADD COLUMN common_share NUMERIC(14, 12)
  CHECK (common_share IS NULL OR (common_share > 0 AND common_share <= 1));

UPDATE public.property_units unit
SET condominium_id = building.condominium_id
FROM public.buildings building
WHERE building.id = unit.building_id;

ALTER TABLE public.property_units ALTER COLUMN condominium_id SET NOT NULL;
ALTER TABLE public.property_units
  ADD CONSTRAINT property_units_condominium_same_organization
  FOREIGN KEY (condominium_id, organization_id)
  REFERENCES public.condominiums (id, organization_id);
ALTER TABLE public.property_units
  ADD CONSTRAINT property_units_cadastral_number_key
  UNIQUE (organization_id, cadastral_number);

CREATE TABLE public.persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  UNIQUE (organization_id, user_id)
);

CREATE TRIGGER persons_updated_at
  BEFORE UPDATE ON public.persons
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.persons (organization_id, user_id, full_name, email, phone)
SELECT
  member.organization_id,
  profile.id,
  COALESCE(profile.full_name, profile.email),
  profile.email,
  profile.phone
FROM public.organization_members member
JOIN public.users_profiles profile ON profile.id = member.user_id
ON CONFLICT (organization_id, user_id) DO NOTHING;

CREATE TABLE public.property_ownerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_unit_id UUID NOT NULL,
  person_id UUID NOT NULL,
  ownership_share NUMERIC(14, 12) NOT NULL DEFAULT 1
    CHECK (ownership_share > 0 AND ownership_share <= 1),
  valid_from DATE NOT NULL DEFAULT current_date,
  valid_to DATE,
  document_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (valid_to IS NULL OR valid_to >= valid_from),
  FOREIGN KEY (property_unit_id, organization_id)
    REFERENCES public.property_units (id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (person_id, organization_id)
    REFERENCES public.persons (id, organization_id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX property_ownerships_active_owner_key
  ON public.property_ownerships (property_unit_id, person_id)
  WHERE valid_to IS NULL;
CREATE INDEX property_ownerships_unit_idx
  ON public.property_ownerships (property_unit_id, valid_to);
CREATE INDEX property_ownerships_person_idx
  ON public.property_ownerships (person_id, valid_to);

CREATE TRIGGER property_ownerships_updated_at
  BEFORE UPDATE ON public.property_ownerships
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.property_ownerships (
  organization_id,
  property_unit_id,
  person_id,
  ownership_share
)
SELECT
  unit.organization_id,
  unit.id,
  person.id,
  1
FROM public.property_units unit
JOIN public.persons person
  ON person.organization_id = unit.organization_id
 AND person.user_id = unit.owner_id
WHERE unit.owner_id IS NOT NULL;

CREATE TABLE public.property_occupancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_unit_id UUID NOT NULL,
  person_id UUID NOT NULL,
  occupancy_type public.occupancy_type NOT NULL DEFAULT 'resident',
  valid_from DATE NOT NULL DEFAULT current_date,
  valid_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (valid_to IS NULL OR valid_to >= valid_from),
  FOREIGN KEY (property_unit_id, organization_id)
    REFERENCES public.property_units (id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (person_id, organization_id)
    REFERENCES public.persons (id, organization_id) ON DELETE RESTRICT
);

CREATE TRIGGER property_occupancies_updated_at
  BEFORE UPDATE ON public.property_occupancies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.property_mandates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  grantor_person_id UUID NOT NULL,
  representative_person_id UUID NOT NULL,
  property_unit_id UUID,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['general_meeting'],
  valid_from DATE NOT NULL DEFAULT current_date,
  valid_to DATE NOT NULL,
  document_reference TEXT,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (grantor_person_id <> representative_person_id),
  CHECK (valid_to >= valid_from),
  FOREIGN KEY (grantor_person_id, organization_id)
    REFERENCES public.persons (id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (representative_person_id, organization_id)
    REFERENCES public.persons (id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (property_unit_id, organization_id)
    REFERENCES public.property_units (id, organization_id) ON DELETE CASCADE
);

CREATE TRIGGER property_mandates_updated_at
  BEFORE UPDATE ON public.property_mandates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Membership represents access/office in the APC, never ownership of one unit.
ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_apartment_same_organization;
ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_apartment_id_fkey;
ALTER TABLE public.organization_members DROP COLUMN apartment_id;
ALTER TABLE public.property_units DROP COLUMN owner_id;

ALTER TABLE public.vote_responses RENAME COLUMN apartment_id TO property_unit_id;
ALTER TABLE public.service_requests RENAME COLUMN apartment_id TO property_unit_id;

ALTER INDEX IF EXISTS idx_apartments_org RENAME TO idx_property_units_org;
ALTER INDEX IF EXISTS idx_apartments_building RENAME TO idx_property_units_building;
CREATE INDEX idx_condominiums_org ON public.condominiums(organization_id);
CREATE INDEX idx_buildings_condominium ON public.buildings(condominium_id);
CREATE INDEX idx_property_units_condominium ON public.property_units(condominium_id);
CREATE INDEX idx_persons_org ON public.persons(organization_id);

-- New associations always start with one explicit condominium.
CREATE OR REPLACE FUNCTION public.create_organization(
  p_name TEXT,
  p_slug TEXT,
  p_address TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS public.organizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org public.organizations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users_profiles WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'User profile not found' USING ERRCODE = '42501';
  END IF;

  p_name := btrim(p_name);
  p_slug := lower(btrim(p_slug));

  IF char_length(p_name) < 2 OR char_length(p_name) > 200 THEN
    RAISE EXCEPTION 'Organization name must contain 2 to 200 characters';
  END IF;

  IF p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' OR char_length(p_slug) > 200 THEN
    RAISE EXCEPTION 'Invalid organization slug';
  END IF;

  INSERT INTO public.organizations (name, slug, address, phone, email, description)
  VALUES (p_name, p_slug, p_address, p_phone, p_email, p_description)
  RETURNING * INTO v_org;

  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES (v_org.id, auth.uid(), 'association_admin', 'active');

  INSERT INTO public.persons (organization_id, user_id, full_name, email)
  SELECT v_org.id, profile.id, COALESCE(profile.full_name, profile.email), profile.email
  FROM public.users_profiles profile
  WHERE profile.id = auth.uid();

  INSERT INTO public.condominiums (organization_id, name, address)
  VALUES (v_org.id, v_org.name || ' — Condominiu', COALESCE(v_org.address, 'Adresă nespecificată'));

  INSERT INTO public.audit_logs (organization_id, user_id, action, entity_type, entity_id)
  VALUES (v_org.id, auth.uid(), 'organization_created', 'organization', v_org.id);

  RETURN v_org;
END;
$$;

-- Voting remains a simple MVP flow, now based on active ownership instead of a
-- membership-to-apartment shortcut. Legal meeting voting is a later domain.
CREATE OR REPLACE FUNCTION public.user_has_voting_rights(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.property_ownerships ownership
    JOIN public.persons person ON person.id = ownership.person_id
    JOIN public.property_units unit ON unit.id = ownership.property_unit_id
    WHERE person.user_id = auth.uid()
      AND ownership.organization_id = org_id
      AND ownership.valid_from <= current_date
      AND (ownership.valid_to IS NULL OR ownership.valid_to >= current_date)
      AND unit.has_voting_rights = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_property_unit_id(org_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ownership.property_unit_id
  FROM public.property_ownerships ownership
  JOIN public.persons person ON person.id = ownership.person_id
  JOIN public.property_units unit ON unit.id = ownership.property_unit_id
  WHERE person.user_id = auth.uid()
    AND ownership.organization_id = org_id
    AND ownership.valid_from <= current_date
    AND (ownership.valid_to IS NULL OR ownership.valid_to >= current_date)
    AND unit.has_voting_rights = TRUE
  ORDER BY ownership.created_at, ownership.id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.cast_vote(p_vote_id UUID, p_option_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vote public.votes%ROWTYPE;
  v_property_unit_id UUID;
  v_response_id UUID;
BEGIN
  SELECT * INTO v_vote FROM public.votes WHERE id = p_vote_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vote not found'; END IF;
  IF v_vote.status <> 'active' THEN RAISE EXCEPTION 'Vote is not active'; END IF;
  IF v_vote.starts_at IS NOT NULL AND v_vote.starts_at > now() THEN RAISE EXCEPTION 'Vote has not started yet'; END IF;
  IF v_vote.ends_at IS NOT NULL AND v_vote.ends_at < now() THEN RAISE EXCEPTION 'Vote has ended'; END IF;
  IF NOT public.user_has_voting_rights(v_vote.organization_id) THEN RAISE EXCEPTION 'User does not have voting rights'; END IF;

  v_property_unit_id := public.get_user_property_unit_id(v_vote.organization_id);
  IF v_property_unit_id IS NULL THEN RAISE EXCEPTION 'No property unit linked to user'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.vote_options WHERE id = p_option_id AND vote_id = p_vote_id
  ) THEN RAISE EXCEPTION 'Invalid vote option'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.vote_responses
    WHERE vote_id = p_vote_id AND property_unit_id = v_property_unit_id
  ) THEN RAISE EXCEPTION 'Property unit has already voted'; END IF;

  INSERT INTO public.vote_responses (
    vote_id, organization_id, property_unit_id, option_id, voter_id
  ) VALUES (
    p_vote_id, v_vote.organization_id, v_property_unit_id, p_option_id, auth.uid()
  ) RETURNING id INTO v_response_id;

  PERFORM public.write_audit_log(
    v_vote.organization_id,
    'vote_cast',
    'vote_response',
    v_response_id,
    jsonb_build_object('vote_id', p_vote_id, 'option_id', p_option_id)
  );

  RETURN v_response_id;
END;
$$;

DROP FUNCTION IF EXISTS public.get_user_apartment_id(UUID);

-- RLS for the new domain.
ALTER TABLE public.condominiums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_ownerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_occupancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_mandates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view condominiums"
  ON public.condominiums FOR SELECT
  USING (public.is_org_member(organization_id));
CREATE POLICY "Admins can manage condominiums"
  ON public.condominiums FOR ALL
  USING (public.can_manage_org(organization_id))
  WITH CHECK (public.can_manage_org(organization_id));

DROP POLICY IF EXISTS "Members can view apartments" ON public.property_units;
DROP POLICY IF EXISTS "Admins can manage apartments" ON public.property_units;
CREATE POLICY "Members can view property units"
  ON public.property_units FOR SELECT
  USING (public.is_org_member(organization_id));
CREATE POLICY "Admins can manage property units"
  ON public.property_units FOR ALL
  USING (public.can_manage_org(organization_id))
  WITH CHECK (public.can_manage_org(organization_id));

CREATE POLICY "Members can view persons"
  ON public.persons FOR SELECT
  USING (public.is_org_member(organization_id));
CREATE POLICY "Admins can manage persons"
  ON public.persons FOR ALL
  USING (public.can_manage_org(organization_id))
  WITH CHECK (public.can_manage_org(organization_id));

CREATE POLICY "Members can view property ownerships"
  ON public.property_ownerships FOR SELECT
  USING (public.is_org_member(organization_id));
CREATE POLICY "Admins can manage property ownerships"
  ON public.property_ownerships FOR ALL
  USING (public.can_manage_org(organization_id))
  WITH CHECK (public.can_manage_org(organization_id));

CREATE POLICY "Members can view property occupancies"
  ON public.property_occupancies FOR SELECT
  USING (public.is_org_member(organization_id));
CREATE POLICY "Admins can manage property occupancies"
  ON public.property_occupancies FOR ALL
  USING (public.can_manage_org(organization_id))
  WITH CHECK (public.can_manage_org(organization_id));

CREATE POLICY "Members can view property mandates"
  ON public.property_mandates FOR SELECT
  USING (public.is_org_member(organization_id));
CREATE POLICY "Admins can manage property mandates"
  ON public.property_mandates FOR ALL
  USING (public.can_manage_org(organization_id))
  WITH CHECK (public.can_manage_org(organization_id));

GRANT SELECT ON public.condominiums, public.persons, public.property_ownerships,
  public.property_occupancies, public.property_mandates TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.condominiums, public.persons,
  public.property_ownerships, public.property_occupancies, public.property_mandates
  TO authenticated;
