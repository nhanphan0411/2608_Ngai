-- Discrete country code for the order, driving shipping-fee calculation
-- (Vietnam vs. international flat fee). Previously country only existed
-- baked into the free-text `address` string, unusable for pricing.
ALTER TABLE orders ADD COLUMN country TEXT;
