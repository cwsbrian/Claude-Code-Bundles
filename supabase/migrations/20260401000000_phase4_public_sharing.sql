-- Phase 4: PUB-01/02/03, MOD-01 -- public sharing, lineage, profiles, moderation

-- 1. profiles table (D-14)
CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  github_handle text NOT NULL UNIQUE,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Trigger to auto-populate profiles from OAuth metadata (D-14)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, github_handle, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'user_name',
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'user_name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    github_handle = EXCLUDED.github_handle,
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Backfill existing users into profiles
INSERT INTO public.profiles (user_id, github_handle, display_name, avatar_url)
SELECT
  id,
  raw_user_meta_data->>'user_name',
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'user_name'),
  raw_user_meta_data->>'avatar_url'
FROM auth.users
WHERE raw_user_meta_data->>'user_name' IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- 4. bundle_publish_records table (D-03)
CREATE TABLE public.bundle_publish_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.bundles (id) ON DELETE CASCADE,
  published_snapshot_id uuid REFERENCES public.bundle_snapshots (id) ON DELETE SET NULL,
  display_name text,
  published_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bundle_publish_records_bundle_id_idx ON public.bundle_publish_records (bundle_id);

-- 5. ALTER TABLE additions
ALTER TABLE public.bundles ADD COLUMN description text DEFAULT '';
ALTER TABLE public.bundle_lineage ADD COLUMN root_author_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

-- 6. Enable RLS on new tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_publish_records ENABLE ROW LEVEL SECURITY;

-- 7. RLS policies for profiles (public read, owner update)
CREATE POLICY "profiles_select_public" ON public.profiles
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- 8. RLS policies for bundle_publish_records (owner via bundle)
CREATE POLICY "bundle_publish_records_select_own" ON public.bundle_publish_records
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.bundles b WHERE b.id = bundle_id AND b.owner_user_id = auth.uid())
  );
CREATE POLICY "bundle_publish_records_insert_own" ON public.bundle_publish_records
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.bundles b WHERE b.id = bundle_id AND b.owner_user_id = auth.uid())
  );

-- 9. Public read RLS policies (D-22) -- anonymous SELECT for public visibility rows
CREATE POLICY "bundles_select_public" ON public.bundles
  FOR SELECT TO anon, authenticated USING (visibility = 'public');

CREATE POLICY "bundle_snapshots_select_public" ON public.bundle_snapshots
  FOR SELECT TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.bundles b WHERE b.id = bundle_id AND b.visibility = 'public')
  );

CREATE POLICY "bundle_lineage_select_public" ON public.bundle_lineage
  FOR SELECT TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.bundles b WHERE b.id = bundle_id AND b.visibility = 'public')
  );

CREATE POLICY "bundle_publish_records_select_public" ON public.bundle_publish_records
  FOR SELECT TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.bundles b WHERE b.id = bundle_id AND b.visibility = 'public')
  );
