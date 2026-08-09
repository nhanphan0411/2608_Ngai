CREATE TABLE images_new (
  id INTEGER PRIMARY KEY,
  product_slug TEXT NOT NULL,
  value1 TEXT NOT NULL,
  value2 TEXT,
  r2_key_thumb TEXT,
  r2_key_mid TEXT,
  r2_key_large TEXT,
  url_thumb TEXT,
  url_mid TEXT,
  url_large TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO images_new (
  id, product_slug, value1, value2,
  r2_key_thumb, r2_key_mid, r2_key_large,
  url_thumb, url_mid, url_large,
  sort_order, created_at
)
SELECT
  id, product_slug, value1, value2,
  r2_key, r2_key, r2_key,
  url, url, url,
  sort_order, created_at
FROM images;

DROP TABLE images;
ALTER TABLE images_new RENAME TO images;