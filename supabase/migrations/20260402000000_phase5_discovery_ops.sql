-- Phase 5: FND-01 / OPS-01 -- bundle_tags, bundle_reports, import_count
-- D-06/D-08/D-10: bundle_tags as separate table for normalization + efficient tag filtering
-- D-11/D-12/D-13/D-14: bundle_reports for moderation (no auto-action; admin dashboard review)
-- D-16: import_count atomic counter on bundles

-- 1. bundle_tags table (D-06, D-08, D-10)
--    Composite PK (bundle_id, tag_name) ensures no duplicate tags per bundle.
--    Max 5 tags enforced at API level (D-08); tag_name_idx enables efficient filtering by tag.
CREATE TABLE public.bundle_tags (
  bundle_id uuid NOT NULL REFERENCES public.bundles (id) ON DELETE CASCADE,
  tag_name text NOT NULL,
  PRIMARY KEY (bundle_id, tag_name)
);
CREATE INDEX bundle_tags_tag_name_idx ON public.bundle_tags (tag_name);

-- 2. bundle_reports table (D-11, D-12, D-13, D-14)
--    UNIQUE (reporter_user_id, bundle_id) prevents duplicate reports from same user.
--    reason CHECK constraint limits to known moderation categories.
CREATE TABLE public.bundle_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.bundles (id) ON DELETE CASCADE,
  reporter_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('malicious', 'spam', 'inappropriate', 'other')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reporter_user_id, bundle_id)
);
CREATE INDEX bundle_reports_bundle_id_idx ON public.bundle_reports (bundle_id);

-- 3. import_count column on bundles (D-16)
--    Atomic counter incremented on each successful import.
ALTER TABLE public.bundles ADD COLUMN import_count integer NOT NULL DEFAULT 0;

-- 4. RLS on bundle_tags
--    Public read for public bundles; owner can write their own bundle's tags.
ALTER TABLE public.bundle_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bundle_tags_select_public" ON public.bundle_tags
  FOR SELECT TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.bundles b WHERE b.id = bundle_id AND b.visibility = 'public')
  );
CREATE POLICY "bundle_tags_select_own" ON public.bundle_tags
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.bundles b WHERE b.id = bundle_id AND b.owner_user_id = auth.uid())
  );
CREATE POLICY "bundle_tags_insert_own" ON public.bundle_tags
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.bundles b WHERE b.id = bundle_id AND b.owner_user_id = auth.uid())
  );
CREATE POLICY "bundle_tags_delete_own" ON public.bundle_tags
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.bundles b WHERE b.id = bundle_id AND b.owner_user_id = auth.uid())
  );

-- 5. RLS on bundle_reports
--    Any authenticated user can submit a report; users can only see their own reports.
--    No public read -- admin-only access via service role through Supabase dashboard (D-13, D-15).
ALTER TABLE public.bundle_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bundle_reports_insert_authenticated" ON public.bundle_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_user_id);
CREATE POLICY "bundle_reports_select_own" ON public.bundle_reports
  FOR SELECT USING (auth.uid() = reporter_user_id);

-- 6. Comments
COMMENT ON TABLE public.bundle_tags IS 'Free-form tags per bundle. Max 5 enforced at API level (D-08).';
COMMENT ON TABLE public.bundle_reports IS 'User reports for moderation review. No auto-action — Supabase dashboard review (D-13, D-15).';
COMMENT ON COLUMN public.bundles.import_count IS 'Atomic counter incremented on each import (D-16).';
