-- Phase 2: BE-01 / SEC-01 — bundle metadata + RLS (private owner isolation)
-- auth.users is Supabase Auth; owner_user_id must match JWT sub.
-- Archive bytes live in Cloudflare R2; storage_object_key is the R2 object key (S3 Key).

CREATE TABLE public.bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  public_bundle_id text NOT NULL,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, public_bundle_id)
);

CREATE TABLE public.bundle_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.bundles (id) ON DELETE CASCADE,
  normalized_snapshot_hash text NOT NULL,
  storage_object_key text NOT NULL,
  schema_version text NOT NULL DEFAULT '1.0.0',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bundle_id, normalized_snapshot_hash)
);

CREATE TABLE public.bundle_lineage (
  bundle_id uuid PRIMARY KEY REFERENCES public.bundles (id) ON DELETE CASCADE,
  parent_bundle_id uuid REFERENCES public.bundles (id) ON DELETE SET NULL,
  root_bundle_id uuid REFERENCES public.bundles (id) ON DELETE SET NULL,
  imported_snapshot_id uuid NULL
);

CREATE INDEX bundle_snapshots_bundle_id_idx ON public.bundle_snapshots (bundle_id);
CREATE INDEX bundles_owner_user_id_idx ON public.bundles (owner_user_id);

ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_lineage ENABLE ROW LEVEL SECURITY;

-- bundles: owners only
CREATE POLICY "bundles_select_own" ON public.bundles
  FOR SELECT USING (auth.uid() = owner_user_id);
CREATE POLICY "bundles_insert_own" ON public.bundles
  FOR INSERT WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "bundles_update_own" ON public.bundles
  FOR UPDATE USING (auth.uid() = owner_user_id);
CREATE POLICY "bundles_delete_own" ON public.bundles
  FOR DELETE USING (auth.uid() = owner_user_id);

-- bundle_snapshots: via parent bundle ownership
CREATE POLICY "bundle_snapshots_select_own" ON public.bundle_snapshots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bundles b
      WHERE b.id = bundle_id AND b.owner_user_id = auth.uid()
    )
  );
CREATE POLICY "bundle_snapshots_insert_own" ON public.bundle_snapshots
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bundles b
      WHERE b.id = bundle_id AND b.owner_user_id = auth.uid()
    )
  );
CREATE POLICY "bundle_snapshots_update_own" ON public.bundle_snapshots
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.bundles b
      WHERE b.id = bundle_id AND b.owner_user_id = auth.uid()
    )
  );
CREATE POLICY "bundle_snapshots_delete_own" ON public.bundle_snapshots
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.bundles b
      WHERE b.id = bundle_id AND b.owner_user_id = auth.uid()
    )
  );

-- bundle_lineage: same pattern
CREATE POLICY "bundle_lineage_select_own" ON public.bundle_lineage
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bundles b
      WHERE b.id = bundle_id AND b.owner_user_id = auth.uid()
    )
  );
CREATE POLICY "bundle_lineage_insert_own" ON public.bundle_lineage
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bundles b
      WHERE b.id = bundle_id AND b.owner_user_id = auth.uid()
    )
  );
CREATE POLICY "bundle_lineage_update_own" ON public.bundle_lineage
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.bundles b
      WHERE b.id = bundle_id AND b.owner_user_id = auth.uid()
    )
  );
CREATE POLICY "bundle_lineage_delete_own" ON public.bundle_lineage
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.bundles b
      WHERE b.id = bundle_id AND b.owner_user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.bundles IS 'Private bundle metadata; RLS enforces SEC-01.';
COMMENT ON TABLE public.bundle_snapshots IS 'Immutable snapshot refs; storage_object_key under {userId}/... in Storage.';
COMMENT ON TABLE public.bundle_lineage IS 'Lineage placeholders for Phase 4 import flows.';
