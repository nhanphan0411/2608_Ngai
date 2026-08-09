PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE collections (
  id INTEGER PRIMARY KEY,
  collection_name TEXT NOT NULL,
  collection_slug TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT NOT NULL
);
INSERT INTO "collections" ("id","collection_name","collection_slug","description","status") VALUES(1,'ngai05','ngai05','Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.','Active');
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
INSERT INTO "products" ("id","collection_slug","product_name","product_slug","category","status","description","shipping","sizeGuide","notes") VALUES(1,'ngai05','look18','look-18','shirt','Active','Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.','A','A','Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.');
INSERT INTO "products" ("id","collection_slug","product_name","product_slug","category","status","description","shipping","sizeGuide","notes") VALUES(2,'ngai05','look19','look-19','dress','Active','Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.','C','B','Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.');
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
INSERT INTO "inventory" ("id","collection_slug","product_slug","variant1","value1","variant2","value2","variant3","value3","stock","priceVND","priceUSD","status") VALUES(1,'ngai05','look-18','Color','brown','Fabric','linen','Size','M',30,300000,3000,'Active');
INSERT INTO "inventory" ("id","collection_slug","product_slug","variant1","value1","variant2","value2","variant3","value3","stock","priceVND","priceUSD","status") VALUES(2,'ngai05','look-19','Color','Blue','Fabric','Linen','Size','S',150,30000,400,'Active');
INSERT INTO "inventory" ("id","collection_slug","product_slug","variant1","value1","variant2","value2","variant3","value3","stock","priceVND","priceUSD","status") VALUES(3,'ngai05','look-19','Color','White','Fabric','Silk','Size','M',400,300000,500,'Active');
CREATE TABLE order_details (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id INTEGER NOT NULL REFERENCES inventory(id),
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  total_price INTEGER NOT NULL
);
INSERT INTO "order_details" ("id","order_id","variant_id","quantity","unit_price","total_price") VALUES(1,3,1,1,300000,300000);
INSERT INTO "order_details" ("id","order_id","variant_id","quantity","unit_price","total_price") VALUES(2,3,2,1,30000,30000);
INSERT INTO "order_details" ("id","order_id","variant_id","quantity","unit_price","total_price") VALUES(3,4,1,1,300000,300000);
INSERT INTO "order_details" ("id","order_id","variant_id","quantity","unit_price","total_price") VALUES(4,4,2,1,30000,30000);
INSERT INTO "order_details" ("id","order_id","variant_id","quantity","unit_price","total_price") VALUES(5,5,1,1,300000,300000);
INSERT INTO "order_details" ("id","order_id","variant_id","quantity","unit_price","total_price") VALUES(6,5,2,1,30000,30000);
INSERT INTO "order_details" ("id","order_id","variant_id","quantity","unit_price","total_price") VALUES(7,6,2,1,30000,30000);
INSERT INTO "order_details" ("id","order_id","variant_id","quantity","unit_price","total_price") VALUES(8,6,1,1,300000,300000);
INSERT INTO "order_details" ("id","order_id","variant_id","quantity","unit_price","total_price") VALUES(9,7,1,1,3000,3000);
CREATE TABLE IF NOT EXISTS "images" (
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
INSERT INTO "images" ("id","product_slug","value1","value2","r2_key_thumb","r2_key_mid","r2_key_large","url_thumb","url_mid","url_large","sort_order","created_at") VALUES(1,'look-18','Red',NULL,'Products/look-18/Red/906ede00-bef8-4521-b6d4-f9db7b7bf5cf-thumb.webp','Products/look-18/Red/906ede00-bef8-4521-b6d4-f9db7b7bf5cf-mid.webp','Products/look-18/Red/906ede00-bef8-4521-b6d4-f9db7b7bf5cf-large.webp','https://pub-e1ce6cd7aa9640ccb36c096dbb0c14c7.r2.dev/Products/look-18/Red/906ede00-bef8-4521-b6d4-f9db7b7bf5cf-thumb.webp','https://pub-e1ce6cd7aa9640ccb36c096dbb0c14c7.r2.dev/Products/look-18/Red/906ede00-bef8-4521-b6d4-f9db7b7bf5cf-mid.webp','https://pub-e1ce6cd7aa9640ccb36c096dbb0c14c7.r2.dev/Products/look-18/Red/906ede00-bef8-4521-b6d4-f9db7b7bf5cf-large.webp',0,'2026-07-23 11:20:06');
INSERT INTO "images" ("id","product_slug","value1","value2","r2_key_thumb","r2_key_mid","r2_key_large","url_thumb","url_mid","url_large","sort_order","created_at") VALUES(2,'look-18','Red',NULL,'Products/look-18/Red/002836a9-e3c9-404f-a0e4-9b46d1f0f2cf-thumb.webp','Products/look-18/Red/002836a9-e3c9-404f-a0e4-9b46d1f0f2cf-mid.webp','Products/look-18/Red/002836a9-e3c9-404f-a0e4-9b46d1f0f2cf-large.webp','https://pub-e1ce6cd7aa9640ccb36c096dbb0c14c7.r2.dev/Products/look-18/Red/002836a9-e3c9-404f-a0e4-9b46d1f0f2cf-thumb.webp','https://pub-e1ce6cd7aa9640ccb36c096dbb0c14c7.r2.dev/Products/look-18/Red/002836a9-e3c9-404f-a0e4-9b46d1f0f2cf-mid.webp','https://pub-e1ce6cd7aa9640ccb36c096dbb0c14c7.r2.dev/Products/look-18/Red/002836a9-e3c9-404f-a0e4-9b46d1f0f2cf-large.webp',1,'2026-07-23 11:20:07');
INSERT INTO "images" ("id","product_slug","value1","value2","r2_key_thumb","r2_key_mid","r2_key_large","url_thumb","url_mid","url_large","sort_order","created_at") VALUES(3,'look-18','Red',NULL,'Products/look-18/Red/42fd2c86-14fb-4cae-8c48-e806d8221a7f-thumb.webp','Products/look-18/Red/42fd2c86-14fb-4cae-8c48-e806d8221a7f-mid.webp','Products/look-18/Red/42fd2c86-14fb-4cae-8c48-e806d8221a7f-large.webp','https://pub-e1ce6cd7aa9640ccb36c096dbb0c14c7.r2.dev/Products/look-18/Red/42fd2c86-14fb-4cae-8c48-e806d8221a7f-thumb.webp','https://pub-e1ce6cd7aa9640ccb36c096dbb0c14c7.r2.dev/Products/look-18/Red/42fd2c86-14fb-4cae-8c48-e806d8221a7f-mid.webp','https://pub-e1ce6cd7aa9640ccb36c096dbb0c14c7.r2.dev/Products/look-18/Red/42fd2c86-14fb-4cae-8c48-e806d8221a7f-large.webp',2,'2026-07-23 11:20:08');
INSERT INTO "images" ("id","product_slug","value1","value2","r2_key_thumb","r2_key_mid","r2_key_large","url_thumb","url_mid","url_large","sort_order","created_at") VALUES(10,'look-18','brown','linen','Products/look-18/brown/linen/dffdafa0-f6c4-4c25-b178-174450d4b261-thumb.webp','Products/look-18/brown/linen/dffdafa0-f6c4-4c25-b178-174450d4b261-mid.webp','Products/look-18/brown/linen/dffdafa0-f6c4-4c25-b178-174450d4b261-large.webp','https://pub-e1ce6cd7aa9640ccb36c096dbb0c14c7.r2.dev/Products/look-18/brown/linen/dffdafa0-f6c4-4c25-b178-174450d4b261-thumb.webp','https://pub-e1ce6cd7aa9640ccb36c096dbb0c14c7.r2.dev/Products/look-18/brown/linen/dffdafa0-f6c4-4c25-b178-174450d4b261-mid.webp','https://pub-e1ce6cd7aa9640ccb36c096dbb0c14c7.r2.dev/Products/look-18/brown/linen/dffdafa0-f6c4-4c25-b178-174450d4b261-large.webp',0,'2026-07-23 16:51:15');
INSERT INTO "images" ("id","product_slug","value1","value2","r2_key_thumb","r2_key_mid","r2_key_large","url_thumb","url_mid","url_large","sort_order","created_at") VALUES(11,'look-19','Blue','Linen','Products/look-19/Blue/Linen/04bed2b0-2304-44e2-ab58-1d7f83b4f0f6-thumb.webp','Products/look-19/Blue/Linen/04bed2b0-2304-44e2-ab58-1d7f83b4f0f6-mid.webp','Products/look-19/Blue/Linen/04bed2b0-2304-44e2-ab58-1d7f83b4f0f6-large.webp','https://pub-e1ce6cd7aa9640ccb36c096dbb0c14c7.r2.dev/Products/look-19/Blue/Linen/04bed2b0-2304-44e2-ab58-1d7f83b4f0f6-thumb.webp','https://pub-e1ce6cd7aa9640ccb36c096dbb0c14c7.r2.dev/Products/look-19/Blue/Linen/04bed2b0-2304-44e2-ab58-1d7f83b4f0f6-mid.webp','https://pub-e1ce6cd7aa9640ccb36c096dbb0c14c7.r2.dev/Products/look-19/Blue/Linen/04bed2b0-2304-44e2-ab58-1d7f83b4f0f6-large.webp',0,'2026-07-23 16:51:58');
INSERT INTO "images" ("id","product_slug","value1","value2","r2_key_thumb","r2_key_mid","r2_key_large","url_thumb","url_mid","url_large","sort_order","created_at") VALUES(12,'look-19','White','Silk','Products/look-19/White/Silk/0fcbf794-113e-4aab-918b-528cd5d4c7cb-thumb.webp','Products/look-19/White/Silk/0fcbf794-113e-4aab-918b-528cd5d4c7cb-mid.webp','Products/look-19/White/Silk/0fcbf794-113e-4aab-918b-528cd5d4c7cb-large.webp','https://pub-e1ce6cd7aa9640ccb36c096dbb0c14c7.r2.dev/Products/look-19/White/Silk/0fcbf794-113e-4aab-918b-528cd5d4c7cb-thumb.webp','https://pub-e1ce6cd7aa9640ccb36c096dbb0c14c7.r2.dev/Products/look-19/White/Silk/0fcbf794-113e-4aab-918b-528cd5d4c7cb-mid.webp','https://pub-e1ce6cd7aa9640ccb36c096dbb0c14c7.r2.dev/Products/look-19/White/Silk/0fcbf794-113e-4aab-918b-528cd5d4c7cb-large.webp',0,'2026-07-23 16:52:17');
INSERT INTO "images" ("id","product_slug","value1","value2","r2_key_thumb","r2_key_mid","r2_key_large","url_thumb","url_mid","url_large","sort_order","created_at") VALUES(13,'look-19','White','Silk','Products/look-19/White/Silk/04313751-6c21-452d-b858-61dd3b9cea41-thumb.webp','Products/look-19/White/Silk/04313751-6c21-452d-b858-61dd3b9cea41-mid.webp','Products/look-19/White/Silk/04313751-6c21-452d-b858-61dd3b9cea41-large.webp','https://pub-e1ce6cd7aa9640ccb36c096dbb0c14c7.r2.dev/Products/look-19/White/Silk/04313751-6c21-452d-b858-61dd3b9cea41-thumb.webp','https://pub-e1ce6cd7aa9640ccb36c096dbb0c14c7.r2.dev/Products/look-19/White/Silk/04313751-6c21-452d-b858-61dd3b9cea41-mid.webp','https://pub-e1ce6cd7aa9640ccb36c096dbb0c14c7.r2.dev/Products/look-19/White/Silk/04313751-6c21-452d-b858-61dd3b9cea41-large.webp',1,'2026-07-23 16:52:18');
CREATE TABLE IF NOT EXISTS "d1_migrations"(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(1,'0003_order_id.sql','2026-07-23 18:12:43');
CREATE TABLE IF NOT EXISTS "orders" (
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
INSERT INTO "orders" ("id","public_id","created_at","payment_status","payment_method","customer_name","email","phone","address","notes","subtotal","currency","idempotency_key") VALUES(1,'75217e56bc6a236f64953638d9d6ec7d','2026-07-23T17:31:39.387Z','Pending','Card Payment','Nhan Phan','nhanphan0411@gmail.com','0943066383','193/36 Nam Kỳ Khởi Nghĩa, P. Võ Thị Sáu, Q. 3','asdsa',90000,'VND','658d0f79-8077-4103-b5b1-73595a8b372d');
INSERT INTO "orders" ("id","public_id","created_at","payment_status","payment_method","customer_name","email","phone","address","notes","subtotal","currency","idempotency_key") VALUES(2,'6780ae77770bf69cad79148d2ddba9cc','2026-07-23T17:50:02.985Z','Pending','Bank Transfer','PHANNHAN PHAM','nhanphan0411@gmail.com','0948715418','203 TRAN HUNG DAO','sdasd',330000,'VND','7f019f71-6753-41eb-9cd3-eadb0c777dbd');
INSERT INTO "orders" ("id","public_id","created_at","payment_status","payment_method","customer_name","email","phone","address","notes","subtotal","currency","idempotency_key") VALUES(3,'1d680e81-f5b1-4d4a-8a16-60ca434fea20','2026-07-23T18:35:14.027Z','Pending','Bank Transfer','PHAM PHUONG LINH TRAN','nhaninsummer@gmail.com','0943066383','F104, Chung cu Son Ky, P. Son Ky','asdsadasd',330000,'VND','1a7a72d8-143d-4655-bbf5-d19ca4e45466');
INSERT INTO "orders" ("id","public_id","created_at","payment_status","payment_method","customer_name","email","phone","address","notes","subtotal","currency","idempotency_key") VALUES(4,'cb44e29a-115f-484c-a3d8-fcf3054423ca','2026-07-23T18:40:03.033Z','Pending','Card Payment','UNIVERSITY OF CALIFORNIA, LOS ANGELES','','',replace('405 HILGARD AVE\n1237 MURPHY HALL','\n',char(10)),'',330000,'VND','db34a6d1-581d-4f0f-ac8c-facb607147e3');
INSERT INTO "orders" ("id","public_id","created_at","payment_status","payment_method","customer_name","email","phone","address","notes","subtotal","currency","idempotency_key") VALUES(5,'9986212b-9ce6-4dc9-8518-9c61b1dc8fdf','2026-07-23T18:47:51.500Z','Pending','Card Payment','Phan Nhan Pham','nhanphan0411@gmail.com','0948715418','C11.05, CHUNG CƯ 76 NGÔ TẤT TỐ, P19, Q. BÌNH THẠNH','',330000,'VND','19574e0d-3d9e-4595-861d-ab0f0a79968a');
INSERT INTO "orders" ("id","public_id","created_at","payment_status","payment_method","customer_name","email","phone","address","notes","subtotal","currency","idempotency_key") VALUES(6,'2ba62553-d2d3-4315-bb30-4e1912f3af1b','2026-07-24T10:37:56.825Z','Pending','Card Payment','PHANNHAN PHAM','nhanphan0411@gmail.com','0948715418','203 TRAN HUNG DAO','',330000,'VND','d57c872c-c2e3-4323-8e15-4067bce6f7ae');
INSERT INTO "orders" ("id","public_id","created_at","payment_status","payment_method","customer_name","email","phone","address","notes","subtotal","currency","idempotency_key") VALUES(7,'b042da43-7e59-4c74-8d7b-85589eda1df8','2026-07-24T10:38:56.262Z','Pending','Card Payment','PHAM PHUONG LINH TRAN','nhaninsummer@gmail.com','','F104, Chung cu Son Ky, P. Son Ky','',3000,'USD','0813102d-34df-45ec-a540-73960fddfab4');
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('d1_migrations',1);
