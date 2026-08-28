-- Grant global super admin access to the provided users, including when they
-- register after this migration has been applied.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users_profiles (id, email, full_name, global_role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    CASE
      WHEN lower(NEW.email) IN (
        '3jlblgehb88@gmail.com',
        'crosscode2025@gmail.com'
      ) THEN 'super_admin'::public.user_role
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

UPDATE public.users_profiles
SET global_role = 'super_admin'
WHERE lower(email) IN (
  '3jlblgehb88@gmail.com',
  'crosscode2025@gmail.com'
);
