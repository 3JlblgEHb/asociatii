-- Keep person records synchronized with onboarding and create property units atomically.

CREATE OR REPLACE FUNCTION public.accept_organization_invitation(p_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation public.organization_invitations%ROWTYPE;
  v_profile public.users_profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_profile FROM public.users_profiles WHERE id = auth.uid();
  SELECT * INTO v_invitation
  FROM public.organization_invitations
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND
    OR v_invitation.status <> 'pending'
    OR v_invitation.expires_at <= now()
    OR lower(v_invitation.email) <> lower(v_profile.email)
  THEN
    RAISE EXCEPTION 'Invitation is invalid or expired' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES (v_invitation.organization_id, auth.uid(), v_invitation.role, 'active')
  ON CONFLICT (organization_id, user_id)
  DO UPDATE SET role = EXCLUDED.role, status = 'active', updated_at = now();

  INSERT INTO public.persons (organization_id, user_id, full_name, email, phone)
  VALUES (
    v_invitation.organization_id,
    v_profile.id,
    COALESCE(v_profile.full_name, v_profile.email),
    v_profile.email,
    v_profile.phone
  )
  ON CONFLICT (organization_id, user_id)
  DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    updated_at = now();

  UPDATE public.organization_invitations
  SET status = 'accepted', updated_at = now()
  WHERE id = v_invitation.id;

  INSERT INTO public.audit_logs (organization_id, user_id, action, entity_type, entity_id)
  VALUES (
    v_invitation.organization_id,
    auth.uid(),
    'invitation_accepted',
    'organization_invitation',
    v_invitation.id
  );

  RETURN v_invitation.organization_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_property_unit(
  p_organization_id UUID,
  p_condominium_id UUID,
  p_building_id UUID,
  p_number TEXT,
  p_unit_type public.property_unit_type DEFAULT 'apartment',
  p_cadastral_number TEXT DEFAULT NULL,
  p_floor INTEGER DEFAULT NULL,
  p_area_sqm NUMERIC DEFAULT NULL,
  p_has_voting_rights BOOLEAN DEFAULT TRUE,
  p_owner_user_id UUID DEFAULT NULL
)
RETURNS public.property_units
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit public.property_units%ROWTYPE;
  v_person_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_manage_org(p_organization_id) THEN
    RAISE EXCEPTION 'Management access required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.buildings building
    WHERE building.id = p_building_id
      AND building.condominium_id = p_condominium_id
      AND building.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Building does not belong to the selected condominium'
      USING ERRCODE = '23503';
  END IF;

  p_number := btrim(p_number);
  p_cadastral_number := NULLIF(btrim(p_cadastral_number), '');

  IF p_number = '' OR char_length(p_number) > 50 THEN
    RAISE EXCEPTION 'Property unit number is required and must not exceed 50 characters';
  END IF;

  IF p_area_sqm IS NOT NULL AND p_area_sqm <= 0 THEN
    RAISE EXCEPTION 'Property unit area must be positive';
  END IF;

  IF p_owner_user_id IS NOT NULL THEN
    SELECT id INTO v_person_id
    FROM public.persons
    WHERE organization_id = p_organization_id AND user_id = p_owner_user_id;

    IF v_person_id IS NULL THEN
      RAISE EXCEPTION 'Owner person does not belong to this organization'
        USING ERRCODE = '23503';
    END IF;
  END IF;

  INSERT INTO public.property_units (
    organization_id, condominium_id, building_id, number, unit_type,
    cadastral_number, floor, area_sqm, has_voting_rights
  )
  VALUES (
    p_organization_id, p_condominium_id, p_building_id, p_number, p_unit_type,
    p_cadastral_number, p_floor, p_area_sqm, p_has_voting_rights
  )
  RETURNING * INTO v_unit;

  IF v_person_id IS NOT NULL THEN
    INSERT INTO public.property_ownerships (
      organization_id, property_unit_id, person_id, ownership_share
    ) VALUES (p_organization_id, v_unit.id, v_person_id, 1);
  END IF;

  INSERT INTO public.audit_logs (
    organization_id, user_id, action, entity_type, entity_id, metadata
  )
  VALUES (
    p_organization_id,
    auth.uid(),
    'property_unit_created',
    'property_unit',
    v_unit.id,
    jsonb_build_object('number', v_unit.number, 'unit_type', v_unit.unit_type)
  );

  RETURN v_unit;
END;
$$;

REVOKE ALL ON FUNCTION public.create_property_unit(
  UUID, UUID, UUID, TEXT, public.property_unit_type, TEXT, INTEGER, NUMERIC, BOOLEAN, UUID
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_property_unit(
  UUID, UUID, UUID, TEXT, public.property_unit_type, TEXT, INTEGER, NUMERIC, BOOLEAN, UUID
) TO authenticated;
