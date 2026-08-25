-- Zero explicit indexes existed before this migration — every non-unique
-- WHERE filter was a full table scan. Purely additive, no behavior change.
-- (product_slug, collection_slug, orders.public_id, orders.idempotency_key,
-- documents.slug, and variant_groups.product_id are already covered by
-- existing implicit UNIQUE indexes — confirmed via PRAGMA index_list against
-- the live schema, not assumed — so they're intentionally not repeated here.)

CREATE INDEX idx_products_collection_status ON products(collection_id, status);
CREATE INDEX idx_inventory_product_status ON inventory(product_id, status);
CREATE INDEX idx_images_variant_group ON images(variant_group_id);
CREATE INDEX idx_collections_status ON collections(status);
CREATE INDEX idx_collection_photos_collection ON collection_photos(collection_id);
CREATE INDEX idx_order_details_order ON order_details(order_id);
CREATE INDEX idx_order_details_variant ON order_details(variant_id);
