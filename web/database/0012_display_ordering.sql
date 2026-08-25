-- Admin-controlled display order for collections (site-wide) and products
-- (within their own collection). Backfilled to match today's default
-- ordering (insertion/id order) so nothing visibly reshuffles until an
-- admin actually drags something.
ALTER TABLE collections ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

UPDATE collections SET sort_order = (
  SELECT COUNT(*) FROM collections c2 WHERE c2.id <= collections.id
);

UPDATE products SET sort_order = (
  SELECT COUNT(*) FROM products p2
  WHERE p2.collection_id = products.collection_id AND p2.id <= products.id
);
