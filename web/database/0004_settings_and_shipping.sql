CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  store_name TEXT NOT NULL DEFAULT 'My Store',
  store_description TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  default_currency TEXT NOT NULL DEFAULT 'VND',
  shipping_fee_vnd INTEGER NOT NULL DEFAULT 0,
  shipping_fee_usd REAL NOT NULL DEFAULT 0,
  payment_methods TEXT NOT NULL DEFAULT 'Card Payment, Bank Transfer'
);

INSERT OR IGNORE INTO settings (id) VALUES (1);

ALTER TABLE orders ADD COLUMN shipping_fee INTEGER NOT NULL DEFAULT 0;