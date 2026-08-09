DROP TABLE IF EXISTS order_details;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS images;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS collections;

CREATE TABLE collections (
  id INTEGER PRIMARY KEY,
  collection_name TEXT NOT NULL,
  collection_slug TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT NOT NULL
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  collection_slug TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_slug TEXT NOT NULL UNIQUE,
  category TEXT,
  status TEXT NOT NULL,
  description TEXT,
  shipping TEXT,
  sizeGuide TEXT,
  notes TEXT
);

CREATE TABLE inventory (
  id INTEGER PRIMARY KEY,
  collection_slug TEXT NOT NULL,
  product_slug TEXT NOT NULL,

  variant1 TEXT,
  value1 TEXT,

  variant2 TEXT,
  value2 TEXT,

  variant3 TEXT,
  value3 TEXT,

  stock INTEGER,
  priceVND INTEGER,
  priceUSD REAL,

  status TEXT NOT NULL
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  created_at TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  subtotal INTEGER NOT NULL,
  currency TEXT NOT NULL,
  idempotency_key TEXT UNIQUE
);

CREATE TABLE order_details (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id INTEGER NOT NULL REFERENCES inventory(id),
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  total_price INTEGER NOT NULL
);

CREATE TABLE images (
  id INTEGER PRIMARY KEY,
  product_slug TEXT NOT NULL,
  value1 TEXT NOT NULL,
  value2 TEXT,
  r2_key TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);