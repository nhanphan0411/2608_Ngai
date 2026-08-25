export type CollectionLayoutStyle = "grid" | "random";

export interface Collection {
  id: number;
  collection_name: string;
  collection_slug: string;
  description: string | null;
  status: string;
  layout_style: CollectionLayoutStyle;
  sort_order: number;
}

export interface CollectionPhoto {
  id: number;
  collection_id: number;
  r2_key_thumb: string;
  r2_key_mid: string;
  r2_key_large: string;
  url_thumb: string;
  url_mid: string;
  url_large: string;
  sort_order: number;
  created_at: string;
}

export interface Product {
  id: number;
  collection_id: number;
  product_name: string;
  product_slug: string;
  category: string | null;
  status: string;
  description: string | null;
  shipping: string | null;
  sizeGuide: string | null;
  size_guide_id: number | null;
  notes: string | null;
  sort_order: number;
}

export interface Inventory {
  id: number;
  product_id: number;
  variant_group_id: number;

  variant1: string | null;
  value1: string | null;

  variant2: string | null;
  value2: string | null;

  variant3: string | null;
  value3: string | null;

  stock: number | null;

  priceVND: number;
  priceUSD: number;

  status: string;
}

export interface Order {
  id: number;
  public_id: string;
  created_at: string;
  payment_status: string;
  payment_method: string;
  customer_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  subtotal: number;
  currency: string;
  idempotency_key: string | null;
  shipping_fee: number;
  country: string | null;
}
export interface OrderDetail {
  id: number;

  order_id: number;
  variant_id: number;

  quantity: number;

  unit_price: number;
  total_price: number;
}

export interface CartItem {
  variant_id: number;
  quantity: number;
}

export interface NewOrder {
  created_at: string;
  payment_status: string;
  payment_method: string;
  customer_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  currency: string;
  idempotency_key?: string | null;
  shipping_fee?: number;
  country: string | null;
}

export interface Image {
  id: number;
  variant_group_id: number;   // was product_id, value1, value2
  r2_key_thumb: string;
  r2_key_mid: string;
  r2_key_large: string;
  url_thumb: string;
  url_mid: string;
  url_large: string;
  sort_order: number;
  created_at: string;
}

export interface Settings {
  id: number;
  store_name: string;
  store_description: string | null;
  contact_info: string | null;
  default_currency: string;
  shipping_fee_vnd: number;
  shipping_fee_usd: number;
  payment_methods: string;
  stock_list: string | null;
}

export interface VariantGroup {
  id: number;
  product_id: number;
  value1: string;
  value2: string | null;
}

export interface Document {
  id: number;
  name: string;
  slug: string;
  content_markdown: string;
  created_at: string;
  updated_at: string;
}