ALTER TABLE public.user_profiles
  ADD COLUMN avatar_url TEXT;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, full_name, avatar_url, updated_at)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'New user'),
    new.raw_user_meta_data->>'avatar_url',
    CURRENT_TIMESTAMP
  );
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_profile_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_profiles
  SET
    email = new.email,
    avatar_url = new.raw_user_meta_data->>'avatar_url',
    updated_at = CURRENT_TIMESTAMP
  WHERE user_id = new.id;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email, raw_user_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_from_auth();
