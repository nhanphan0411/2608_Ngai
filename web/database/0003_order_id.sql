PRAGMA foreign_keys = OFF;

CREATE TABLE orders_new (
  id INTEGER PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
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

INSERT INTO orders_new (
  id,
  public_id,
  created_at,
  payment_status,
  payment_method,
  customer_name,
  email,
  phone,
  address,
  notes,
  subtotal,
  currency,
  idempotency_key
)
SELECT
  id,
  lower(hex(randomblob(16))),
  created_at,
  payment_status,
  payment_method,
  customer_name,
  email,
  phone,
  address,
  notes,
  subtotal,
  currency,
  idempotency_key
FROM orders;

DROP TABLE orders;

ALTER TABLE orders_new RENAME TO orders;

PRAGMA foreign_keys = ON;