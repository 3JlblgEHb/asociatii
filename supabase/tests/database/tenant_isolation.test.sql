BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(14);

SELECT has_function(
  'public',
  'create_organization',
  ARRAY['text', 'text', 'text', 'text', 'text', 'text'],
  'atomic organization creation RPC exists'
);

SELECT has_function(
  'public',
  'accept_organization_invitation',
  ARRAY['text'],
  'atomic invitation acceptance RPC exists'
);

SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.write_audit_log(uuid,text,text,uuid,jsonb)',
    'EXECUTE'
  ),
  'authenticated users cannot call the raw audit writer'
);

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES
  (
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'tenant-a@example.test',
    '',
    now(),
    '{}',
    '{"full_name":"Tenant A"}',
    now(),
    now()
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'tenant-b@example.test',
    '',
    now(),
    '{}',
    '{"full_name":"Tenant B"}',
    now(),
    now()
  );

INSERT INTO public.organizations (id, name, slug)
VALUES
  ('aaaaaaaa-0000-4000-8000-000000000001', 'APC Tenant A', 'apc-tenant-a'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'APC Tenant B', 'apc-tenant-b');

INSERT INTO public.organization_members (organization_id, user_id, role, status)
VALUES
  (
    'aaaaaaaa-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'association_admin',
    'active'
  ),
  (
    'bbbbbbbb-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    'association_admin',
    'active'
  );

INSERT INTO public.buildings (id, organization_id, name, address)
VALUES
  (
    'aaaaaaaa-1000-4000-8000-000000000001',
    'aaaaaaaa-0000-4000-8000-000000000001',
    'Building A',
    'Address A'
  ),
  (
    'bbbbbbbb-1000-4000-8000-000000000002',
    'bbbbbbbb-0000-4000-8000-000000000002',
    'Building B',
    'Address B'
  );

SELECT set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

SELECT results_eq(
  $$SELECT id FROM public.organizations ORDER BY id$$,
  $$VALUES ('aaaaaaaa-0000-4000-8000-000000000001'::UUID)$$,
  'a member sees only their organization'
);

SELECT results_eq(
  $$SELECT id FROM public.buildings ORDER BY id$$,
  $$VALUES ('aaaaaaaa-1000-4000-8000-000000000001'::UUID)$$,
  'a member sees only buildings in their organization'
);

SELECT throws_ok(
  $$UPDATE public.users_profiles
    SET global_role = 'super_admin'
    WHERE id = '10000000-0000-4000-8000-000000000001'$$,
  '42501',
  NULL,
  'users cannot promote their own global role'
);

SELECT throws_ok(
  $$INSERT INTO public.organizations (name, slug)
    VALUES ('Unsafe direct APC', 'unsafe-direct-apc')$$,
  '42501',
  NULL,
  'organizations cannot be created with a direct insert'
);

SELECT throws_ok(
  $$INSERT INTO public.organization_members (
      organization_id, user_id, role, status
    ) VALUES (
      'bbbbbbbb-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000001',
      'association_admin',
      'active'
    )$$,
  '42501',
  NULL,
  'a user cannot join another tenant as administrator'
);

SELECT lives_ok(
  $$SELECT public.create_organization(
    'Atomic APC',
    'atomic-apc',
    'Test address',
    NULL,
    NULL,
    NULL
  )$$,
  'organization RPC creates the tenant and administrator atomically'
);

SELECT throws_ok(
  $$INSERT INTO public.apartments (
      organization_id, building_id, number
    ) VALUES (
      'aaaaaaaa-0000-4000-8000-000000000001',
      'bbbbbbbb-1000-4000-8000-000000000002',
      'cross-tenant'
    )$$,
  '23503',
  NULL,
  'a child cannot reference a building from another tenant'
);

SELECT throws_ok(
  $$SELECT public.write_management_audit_log(
    'bbbbbbbb-0000-4000-8000-000000000002',
    'forged_action',
    'organization',
    'bbbbbbbb-0000-4000-8000-000000000002',
    '{}'
  )$$,
  '42501',
  NULL,
  'a manager cannot write audit events into another tenant'
);

SELECT throws_ok(
  $$SELECT public.write_audit_log(
    'aaaaaaaa-0000-4000-8000-000000000001',
    'forged_action',
    'organization',
    'aaaaaaaa-0000-4000-8000-000000000001',
    '{}'
  )$$,
  '42501',
  NULL,
  'the raw audit writer is not callable by authenticated users'
);

RESET ROLE;

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Org members can read registered documents storage'
  ),
  'document storage requires a registered document record'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Org members can read registered request attachments'
  ),
  'request storage requires a registered request attachment'
);

SELECT * FROM finish();
ROLLBACK;
