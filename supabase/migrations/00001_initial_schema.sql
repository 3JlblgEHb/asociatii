-- Asociatii MVP — initial schema, RLS, storage

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE public.user_role AS ENUM (
  'super_admin',
  'association_admin',
  'manager',
  'owner',
  'resident'
);

CREATE TYPE public.document_category AS ENUM (
  'protocol',
  'invoice',
  'report',
  'statute',
  'other'
);

CREATE TYPE public.vote_status AS ENUM ('draft', 'active', 'closed');

CREATE TYPE public.request_category AS ENUM (
  'repair',
  'cleaning',
  'elevator',
  'water',
  'electricity',
  'other'
);

CREATE TYPE public.request_status AS ENUM (
  'new',
  'in_progress',
  'resolved',
  'rejected'
);

CREATE TYPE public.member_status AS ENUM ('active', 'pending', 'inactive');

CREATE TYPE public.invitation_status AS ENUM (
  'pending',
  'accepted',
  'expired',
  'cancelled'
);

CREATE TYPE public.notification_type AS ENUM (
  'announcement',
  'vote',
  'request',
  'invitation',
  'system'
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Profiles (extends auth.users)
CREATE TABLE public.users_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  global_role public.user_role,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER users_profiles_updated_at
  BEFORE UPDATE ON public.users_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Organizations
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  address TEXT,
  phone TEXT,
  email TEXT,
  description TEXT,
  logo_url TEXT,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Organization members
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users_profiles(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'resident',
  status public.member_status NOT NULL DEFAULT 'active',
  apartment_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id),
  CONSTRAINT org_member_role_check CHECK (role <> 'super_admin')
);

CREATE TRIGGER organization_members_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Buildings
CREATE TABLE public.buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  floors INTEGER,
  entrance_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER buildings_updated_at
  BEFORE UPDATE ON public.buildings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Apartments
CREATE TABLE public.apartments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  floor INTEGER,
  area_sqm NUMERIC(10, 2),
  has_voting_rights BOOLEAN NOT NULL DEFAULT TRUE,
  owner_id UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (building_id, number)
);

CREATE TRIGGER apartments_updated_at
  BEFORE UPDATE ON public.apartments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_apartment_id_fkey
  FOREIGN KEY (apartment_id) REFERENCES public.apartments(id) ON DELETE SET NULL;

-- Invitations
CREATE TABLE public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'resident',
  invited_by UUID NOT NULL REFERENCES public.users_profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status public.invitation_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT invitation_role_check CHECK (role <> 'super_admin')
);

CREATE TRIGGER organization_invitations_updated_at
  BEFORE UPDATE ON public.organization_invitations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Documents
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.users_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category public.document_category NOT NULL DEFAULT 'other',
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Announcements
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.users_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Votes
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.users_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status public.vote_status NOT NULL DEFAULT 'draft',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER votes_updated_at
  BEFORE UPDATE ON public.votes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Vote options
CREATE TABLE public.vote_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id UUID NOT NULL REFERENCES public.votes(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vote responses (one per apartment)
CREATE TABLE public.vote_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id UUID NOT NULL REFERENCES public.votes(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  apartment_id UUID NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.vote_options(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES public.users_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vote_id, apartment_id)
);

-- Service requests
CREATE TABLE public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  apartment_id UUID REFERENCES public.apartments(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.users_profiles(id) ON DELETE CASCADE,
  category public.request_category NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status public.request_status NOT NULL DEFAULT 'new',
  attachments JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER service_requests_updated_at
  BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Service request comments
CREATE TABLE public.service_request_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users_profiles(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.users_profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX idx_buildings_org ON public.buildings(organization_id);
CREATE INDEX idx_apartments_org ON public.apartments(organization_id);
CREATE INDEX idx_apartments_building ON public.apartments(building_id);
CREATE INDEX idx_documents_org ON public.documents(organization_id);
CREATE INDEX idx_announcements_org ON public.announcements(organization_id);
CREATE INDEX idx_votes_org ON public.votes(organization_id);
CREATE INDEX idx_vote_options_vote ON public.vote_options(vote_id);
CREATE INDEX idx_vote_responses_vote ON public.vote_responses(vote_id);
CREATE INDEX idx_service_requests_org ON public.service_requests(organization_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, read_at);
CREATE INDEX idx_audit_logs_org ON public.audit_logs(organization_id);
CREATE INDEX idx_invitations_token ON public.organization_invitations(token);

-- ============================================================
-- RLS helper functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users_profiles
    WHERE id = auth.uid() AND global_role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = org_id
        AND user_id = auth.uid()
        AND status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_org(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = org_id
        AND user_id = auth.uid()
        AND status = 'active'
        AND role IN ('association_admin', 'manager')
    );
$$;

CREATE OR REPLACE FUNCTION public.user_has_voting_rights(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    JOIN public.apartments a ON a.id = om.apartment_id
    WHERE om.user_id = auth.uid()
      AND om.organization_id = org_id
      AND om.role = 'owner'
      AND om.status = 'active'
      AND a.has_voting_rights = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_apartment_id(org_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT apartment_id
  FROM public.organization_members
  WHERE user_id = auth.uid()
    AND organization_id = org_id
    AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.write_audit_log(
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
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (p_organization_id, auth.uid(), p_action, p_entity_type, p_entity_id, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Cast vote (server-side enforcement)
CREATE OR REPLACE FUNCTION public.cast_vote(
  p_vote_id UUID,
  p_option_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vote public.votes%ROWTYPE;
  v_apartment_id UUID;
  v_response_id UUID;
BEGIN
  SELECT * INTO v_vote FROM public.votes WHERE id = p_vote_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vote not found';
  END IF;

  IF v_vote.status <> 'active' THEN
    RAISE EXCEPTION 'Vote is not active';
  END IF;

  IF v_vote.starts_at IS NOT NULL AND v_vote.starts_at > NOW() THEN
    RAISE EXCEPTION 'Vote has not started yet';
  END IF;

  IF v_vote.ends_at IS NOT NULL AND v_vote.ends_at < NOW() THEN
    RAISE EXCEPTION 'Vote has ended';
  END IF;

  IF NOT public.user_has_voting_rights(v_vote.organization_id) THEN
    RAISE EXCEPTION 'User does not have voting rights';
  END IF;

  v_apartment_id := public.get_user_apartment_id(v_vote.organization_id);

  IF v_apartment_id IS NULL THEN
    RAISE EXCEPTION 'No apartment linked to user';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.vote_options
    WHERE id = p_option_id AND vote_id = p_vote_id
  ) THEN
    RAISE EXCEPTION 'Invalid vote option';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.vote_responses
    WHERE vote_id = p_vote_id AND apartment_id = v_apartment_id
  ) THEN
    RAISE EXCEPTION 'Apartment has already voted';
  END IF;

  INSERT INTO public.vote_responses (vote_id, organization_id, apartment_id, option_id, voter_id)
  VALUES (p_vote_id, v_vote.organization_id, v_apartment_id, p_option_id, auth.uid())
  RETURNING id INTO v_response_id;

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

-- ============================================================
-- Enable RLS
-- ============================================================

ALTER TABLE public.users_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_request_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- users_profiles
CREATE POLICY "Users can view own profile"
  ON public.users_profiles FOR SELECT
  USING (id = auth.uid() OR public.is_super_admin());

CREATE POLICY "Users can view org member profiles"
  ON public.users_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om1
      JOIN public.organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid() AND om2.user_id = users_profiles.id
        AND om1.status = 'active' AND om2.status = 'active'
    )
  );

CREATE POLICY "Users can update own profile"
  ON public.users_profiles FOR UPDATE
  USING (id = auth.uid());

-- organizations
CREATE POLICY "Members can view their organizations"
  ON public.organizations FOR SELECT
  USING (public.is_org_member(id));

CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update organizations"
  ON public.organizations FOR UPDATE
  USING (public.can_manage_org(id));

CREATE POLICY "Super admin full access organizations"
  ON public.organizations FOR ALL
  USING (public.is_super_admin());

-- organization_members
CREATE POLICY "Members can view org members"
  ON public.organization_members FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Admins can manage org members"
  ON public.organization_members FOR INSERT
  WITH CHECK (public.can_manage_org(organization_id));

CREATE POLICY "Admins can update org members"
  ON public.organization_members FOR UPDATE
  USING (public.can_manage_org(organization_id));

CREATE POLICY "Admins can delete org members"
  ON public.organization_members FOR DELETE
  USING (public.can_manage_org(organization_id));

CREATE POLICY "Users can insert self as creator"
  ON public.organization_members FOR INSERT
  WITH CHECK (user_id = auth.uid() AND role = 'association_admin');

-- buildings
CREATE POLICY "Members can view buildings"
  ON public.buildings FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Admins can manage buildings"
  ON public.buildings FOR ALL
  USING (public.can_manage_org(organization_id))
  WITH CHECK (public.can_manage_org(organization_id));

-- apartments
CREATE POLICY "Members can view apartments"
  ON public.apartments FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Admins can manage apartments"
  ON public.apartments FOR ALL
  USING (public.can_manage_org(organization_id))
  WITH CHECK (public.can_manage_org(organization_id));

-- invitations
CREATE POLICY "Admins can manage invitations"
  ON public.organization_invitations FOR ALL
  USING (public.can_manage_org(organization_id))
  WITH CHECK (public.can_manage_org(organization_id));

CREATE POLICY "Invitee can view own invitation by token"
  ON public.organization_invitations FOR SELECT
  USING (email = (SELECT email FROM public.users_profiles WHERE id = auth.uid()));

-- documents
CREATE POLICY "Members can view documents"
  ON public.documents FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Admins can insert documents"
  ON public.documents FOR INSERT
  WITH CHECK (public.can_manage_org(organization_id) AND uploaded_by = auth.uid());

CREATE POLICY "Admins can update documents"
  ON public.documents FOR UPDATE
  USING (public.can_manage_org(organization_id));

CREATE POLICY "Admins can delete documents"
  ON public.documents FOR DELETE
  USING (public.can_manage_org(organization_id));

-- announcements
CREATE POLICY "Members can view published announcements"
  ON public.announcements FOR SELECT
  USING (public.is_org_member(organization_id) AND (is_published OR public.can_manage_org(organization_id)));

CREATE POLICY "Admins can manage announcements"
  ON public.announcements FOR ALL
  USING (public.can_manage_org(organization_id))
  WITH CHECK (public.can_manage_org(organization_id));

-- votes
CREATE POLICY "Members can view votes"
  ON public.votes FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Admins can manage votes"
  ON public.votes FOR ALL
  USING (public.can_manage_org(organization_id))
  WITH CHECK (public.can_manage_org(organization_id));

-- vote_options
CREATE POLICY "Members can view vote options"
  ON public.vote_options FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Admins can manage vote options"
  ON public.vote_options FOR ALL
  USING (public.can_manage_org(organization_id))
  WITH CHECK (public.can_manage_org(organization_id));

-- vote_responses
CREATE POLICY "Members can view vote responses"
  ON public.vote_responses FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "No direct insert vote responses"
  ON public.vote_responses FOR INSERT
  WITH CHECK (FALSE);

-- service_requests
CREATE POLICY "Members can view requests"
  ON public.service_requests FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Members can create requests"
  ON public.service_requests FOR INSERT
  WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid());

CREATE POLICY "Admins can update requests"
  ON public.service_requests FOR UPDATE
  USING (public.can_manage_org(organization_id));

CREATE POLICY "Creator can update own new requests"
  ON public.service_requests FOR UPDATE
  USING (created_by = auth.uid() AND status = 'new');

-- service_request_comments
CREATE POLICY "Members can view comments"
  ON public.service_request_comments FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Members can add comments"
  ON public.service_request_comments FOR INSERT
  WITH CHECK (public.is_org_member(organization_id) AND user_id = auth.uid());

-- notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (public.is_org_member(organization_id));

-- audit_logs
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    public.is_super_admin()
    OR (organization_id IS NOT NULL AND public.can_manage_org(organization_id))
  );

CREATE POLICY "No direct audit insert"
  ON public.audit_logs FOR INSERT
  WITH CHECK (FALSE);

-- ============================================================
-- Storage buckets
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('documents', 'documents', FALSE, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('request-attachments', 'request-attachments', FALSE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: documents bucket
CREATE POLICY "Org members can read documents storage"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND public.is_org_member((storage.foldername(name))[1]::UUID)
  );

CREATE POLICY "Admins can upload documents storage"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND public.can_manage_org((storage.foldername(name))[1]::UUID)
  );

CREATE POLICY "Admins can delete documents storage"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents'
    AND public.can_manage_org((storage.foldername(name))[1]::UUID)
  );

-- Storage RLS: request attachments
CREATE POLICY "Org members can read request attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'request-attachments'
    AND public.is_org_member((storage.foldername(name))[1]::UUID)
  );

CREATE POLICY "Members can upload request attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'request-attachments'
    AND public.is_org_member((storage.foldername(name))[1]::UUID)
  );

CREATE POLICY "Admins can delete request attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'request-attachments'
    AND public.can_manage_org((storage.foldername(name))[1]::UUID)
  );
