-- Adds editorial-photo support to collections.
--
-- layout_style drives how the public collection page renders its photo
-- section: 'grid' (fixed 4-col desktop / 3-col mobile grid) or 'random'
-- (client re-randomizes size/order on every page load — see
-- components/CollectionGallery.tsx). Defaulting existing rows to 'grid'
-- keeps today's behavior (no photos yet) unchanged.
ALTER TABLE collections ADD COLUMN layout_style TEXT NOT NULL DEFAULT 'grid';

-- Mirrors the shape of `images` (thumb/mid/large key+url triplets,
-- sort_order, created_at) but keyed by collection_id instead of
-- variant_group_id, since editorial photos belong to a collection as a
-- whole rather than to a specific product variant.
CREATE TABLE collection_photos (
  id INTEGER PRIMARY KEY,
  collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  r2_key_thumb TEXT,
  r2_key_mid TEXT,
  r2_key_large TEXT,
  url_thumb TEXT,
  url_mid TEXT,
  url_large TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);