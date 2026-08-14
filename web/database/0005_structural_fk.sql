CREATE TABLE variant_groups (
  id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  value1 TEXT NOT NULL,
  value2 TEXT,
  UNIQUE(product_id, value1, value2)
);

-- backfill from existing inventory distinct groups, then from images

ALTER TABLE products ADD COLUMN collection_id INTEGER REFERENCES collections(id);
ALTER TABLE inventory ADD COLUMN product_id INTEGER REFERENCES products(id);
ALTER TABLE inventory ADD COLUMN variant_group_id INTEGER REFERENCES variant_groups(id);
ALTER TABLE images ADD COLUMN variant_group_id INTEGER REFERENCES variant_groups(id);

-- backfill collection_id, product_id, variant_group_id via UPDATE...JOIN equivalents
-- verify zero NULLs before dropping old columns

ALTER TABLE products DROP COLUMN collection_slug;
ALTER TABLE inventory DROP COLUMN product_slug;
ALTER TABLE inventory DROP COLUMN collection_slug;
ALTER TABLE images DROP COLUMN product_slug;
ALTER TABLE images DROP COLUMN value1;
ALTER TABLE images DROP COLUMN value2;