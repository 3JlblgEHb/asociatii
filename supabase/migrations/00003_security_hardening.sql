-- Security hardening for tenant isolation and privileged workflows.

-- Users may edit their contact fields, but never their email or global role.
REVOKE UPDATE ON public.users_profiles FROM authenticated;
GRANT UPDATE (full_name, phone, avatar_url) ON public.users_profiles TO authenticated;

DROP POLICY IF EXISTS "Users can update own profile" ON public.users_profiles;
CREATE POLICY "Users can update own profile fields"
  ON public.users_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Organization creation must be atomic. The former pair of INSERT policies let
-- any authenticated user join any known organization as association_admin.
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can insert self as creator" ON public.organization_members;

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

  INSERT INTO public.organization_members (
    organization_id,
    user_id,
    role,
    status
  )
  VALUES (v_org.id, auth.uid(), 'association_admin', 'active');

  INSERT INTO public.audit_logs (
    organization_id,
    user_id,
    action,
    entity_type,
    entity_id
  )
  VALUES (v_org.id, auth.uid(), 'organization_created', 'organization', v_org.id);

  RETURN v_org;
END;
$$;

REVOKE ALL ON FUNCTION public.create_organization(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_organization(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Invitation acceptance is validated and committed as one transaction.
CREATE OR REPLACE FUNCTION public.accept_organization_invitation(p_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation public.organization_invitations%ROWTYPE;
  v_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT email INTO v_email
  FROM public.users_profiles
  WHERE id = auth.uid();

  SELECT * INTO v_invitation
  FROM public.organization_invitations
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND
    OR v_invitation.status <> 'pending'
    OR v_invitation.expires_at <= now()
    OR lower(v_invitation.email) <> lower(v_email)
  THEN
    RAISE EXCEPTION 'Invitation is invalid or expired' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.organization_members (
    organization_id,
    user_id,
    role,
    status
  )
  VALUES (
    v_invitation.organization_id,
    auth.uid(),
    v_invitation.role,
    'active'
  )
  ON CONFLICT (organization_id, user_id)
  DO UPDATE SET
    role = EXCLUDED.role,
    status = 'active',
    updated_at = now();

  UPDATE public.organization_invitations
  SET status = 'accepted', updated_at = now()
  WHERE id = v_invitation.id;

  INSERT INTO public.audit_logs (
    organization_id,
    user_id,
    action,
    entity_type,
    entity_id
  )
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

REVOKE ALL ON FUNCTION public.accept_organization_invitation(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_organization_invitation(TEXT) TO authenticated;

-- The low-level audit writer is internal. Management actions use a checked
-- wrapper, while SECURITY DEFINER domain functions can still write internally.
REVOKE ALL ON FUNCTION public.write_audit_log(UUID, TEXT, TEXT, UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.write_audit_log(UUID, TEXT, TEXT, UUID, JSONB) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.write_management_audit_log(
  p_organization_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_manage_org(p_organization_id) THEN
    RAISE EXCEPTION 'Management access required' USING ERRCODE = '42501';
  END IF;

  RETURN public.write_audit_log(
    p_organization_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_metadata
  );
END;
$$;

REVOKE ALL ON FUNCTION public.write_management_audit_log(UUID, TEXT, TEXT, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.write_management_audit_log(UUID, TEXT, TEXT, UUID, JSONB) TO authenticated;

-- Child records must reference parents from the same tenant.
ALTER TABLE public.buildings
  ADD CONSTRAINT buildings_id_organization_key UNIQUE (id, organization_id);
ALTER TABLE public.apartments
  ADD CONSTRAINT apartments_id_organization_key UNIQUE (id, organization_id);
ALTER TABLE public.votes
  ADD CONSTRAINT votes_id_organization_key UNIQUE (id, organization_id);
ALTER TABLE public.vote_options
  ADD CONSTRAINT vote_options_id_organization_key UNIQUE (id, organization_id);
ALTER TABLE public.service_requests
  ADD CONSTRAINT service_requests_id_organization_key UNIQUE (id, organization_id);

ALTER TABLE public.apartments
  ADD CONSTRAINT apartments_building_same_organization
  FOREIGN KEY (building_id, organization_id)
  REFERENCES public.buildings (id, organization_id);
ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_apartment_same_organization
  FOREIGN KEY (apartment_id, organization_id)
  REFERENCES public.apartments (id, organization_id);
ALTER TABLE public.vote_options
  ADD CONSTRAINT vote_options_vote_same_organization
  FOREIGN KEY (vote_id, organization_id)
  REFERENCES public.votes (id, organization_id);
ALTER TABLE public.vote_responses
  ADD CONSTRAINT vote_responses_vote_same_organization
  FOREIGN KEY (vote_id, organization_id)
  REFERENCES public.votes (id, organization_id);
ALTER TABLE public.vote_responses
  ADD CONSTRAINT vote_responses_apartment_same_organization
  FOREIGN KEY (apartment_id, organization_id)
  REFERENCES public.apartments (id, organization_id);
ALTER TABLE public.vote_responses
  ADD CONSTRAINT vote_responses_option_same_organization
  FOREIGN KEY (option_id, organization_id)
  REFERENCES public.vote_options (id, organization_id);
ALTER TABLE public.service_requests
  ADD CONSTRAINT service_requests_apartment_same_organization
  FOREIGN KEY (apartment_id, organization_id)
  REFERENCES public.apartments (id, organization_id);
ALTER TABLE public.service_request_comments
  ADD CONSTRAINT request_comments_request_same_organization
  FOREIGN KEY (request_id, organization_id)
  REFERENCES public.service_requests (id, organization_id);

DROP POLICY IF EXISTS "Creator can update own new requests" ON public.service_requests;
CREATE POLICY "Creator can update own new requests"
  ON public.service_requests FOR UPDATE
  USING (
    created_by = auth.uid()
    AND status = 'new'
    AND public.is_org_member(organization_id)
  )
  WITH CHECK (
    created_by = auth.uid()
    AND status = 'new'
    AND public.is_org_member(organization_id)
  );

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Members can create scoped notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (
    public.is_org_member(organization_id)
    AND (
      user_id = auth.uid()
      OR (
        public.can_manage_org(organization_id)
        AND EXISTS (
          SELECT 1
          FROM public.organization_members target
          WHERE target.organization_id = notifications.organization_id
            AND target.user_id = notifications.user_id
            AND target.status = 'active'
        )
      )
    )
  );

-- Storage authorization requires a valid UUID tenant folder and an existing DB
-- record for document downloads; path-prefix checks in application code are not
-- treated as an authorization boundary.
DROP POLICY IF EXISTS "Org members can read documents storage" ON storage.objects;
CREATE POLICY "Org members can read registered documents storage"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    AND EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.file_path = name
        AND d.organization_id = ((storage.foldername(name))[1])::UUID
        AND public.is_org_member(d.organization_id)
    )
  );

DROP POLICY IF EXISTS "Org members can read request attachments" ON storage.objects;
CREATE POLICY "Org members can read registered request attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'request-attachments'
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    AND EXISTS (
      SELECT 1
      FROM public.service_requests request
      WHERE request.organization_id = ((storage.foldername(name))[1])::UUID
        AND request.attachments ? name
        AND public.is_org_member(request.organization_id)
    )
  );
