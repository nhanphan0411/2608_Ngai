import { getDB } from "@/lib/d1";
import type { Settings } from "@/types/db";

export async function getSettings(): Promise<Settings> {
  const db = await getDB();

  const row = await db
    .prepare(`SELECT * FROM settings WHERE id = 1`)
    .first<Settings>();

  return (
    row ?? {
      id: 1,
      store_name: "My Store",
      store_description: null,
      contact_info: null,
      default_currency: "VND",
      shipping_fee_vnd: 0,
      shipping_fee_usd: 0,
      payment_methods: "Card Payment, Bank Transfer",
      stock_list: null,
    }
  );
}

export async function updateSettings(settings: Omit<Settings, "id">): Promise<void> {
  const db = await getDB();

  await db
    .prepare(`
      UPDATE settings SET
        store_name = ?, store_description = ?,
        contact_info = ?,
        default_currency = ?,
        shipping_fee_vnd = ?, shipping_fee_usd = ?,
        payment_methods = ?,
        stock_list = ?
      WHERE id = 1
    `)
    .bind(
      settings.store_name,
      settings.store_description,
      settings.contact_info,
      settings.default_currency,
      settings.shipping_fee_vnd,
      settings.shipping_fee_usd,
      settings.payment_methods,
      settings.stock_list
    )
    .run();
}