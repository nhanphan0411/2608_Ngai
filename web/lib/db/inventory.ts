import { getDB } from "@/lib/d1";
import type { Inventory } from "@/types/db";
import { deleteImagesForVariantGroup } from "@/lib/db/images";

export async function getInventory(productSlug: string): Promise<Inventory[]> {
  const db = await getDB();

  const { results } = await db
    .prepare(`
      SELECT * FROM inventory
      WHERE product_slug = ? AND status = 'Active'
      ORDER BY id
    `)
    .bind(productSlug)
    .all();

  return results as unknown as Inventory[];
}

export async function getInventoryAdmin(productSlug: string): Promise<Inventory[]> {
  const db = await getDB();

  const { results } = await db
    .prepare(`SELECT * FROM inventory WHERE product_slug = ? ORDER BY id`)
    .bind(productSlug)
    .all();

  return results as unknown as Inventory[];
}

export async function getVariantById(id: number): Promise<Inventory | null> {
  const db = await getDB();

  return (await db
    .prepare(`
      SELECT * FROM inventory
      WHERE id = ? AND status = 'Active'
      LIMIT 1
    `)
    .bind(id)
    .first()) as Inventory | null;
}

/** Same as getVariantById, but includes Draft rows — needed internally
 * before deleting, where "Active only" would hide a row that still
 * needs cleanup. */
async function getVariantByIdAnyStatus(id: number): Promise<Inventory | null> {
  const db = await getDB();

  return (await db
    .prepare(`SELECT * FROM inventory WHERE id = ? LIMIT 1`)
    .bind(id)
    .first()) as Inventory | null;
}

export async function getValue1Options(
  productSlug: string
): Promise<{ value1: string }[]> {
  const db = await getDB();

  const { results } = await db
    .prepare(`
      SELECT DISTINCT value1 FROM inventory
      WHERE product_slug = ?
      ORDER BY value1
    `)
    .bind(productSlug)
    .all();

  return results as unknown as { value1: string }[];
}

export async function getValue2Options(
  productSlug: string,
  value1: string
): Promise<{ value2: string }[]> {
  const db = await getDB();

  const { results } = await db
    .prepare(`
      SELECT DISTINCT value2 FROM inventory
      WHERE product_slug = ? AND value1 = ? AND value2 IS NOT NULL AND value2 != ''
      ORDER BY value2
    `)
    .bind(productSlug, value1)
    .all();

  return results as unknown as { value2: string }[];
}

export async function saveInventory(inventory: Inventory[]): Promise<void> {
  const db = await getDB();

  await db.prepare(`DELETE FROM inventory`).run();

  const stmt = db.prepare(`
    INSERT INTO inventory (
      id, collection_slug, product_slug,
      variant1, value1, variant2, value2, variant3, value3,
      stock, priceVND, priceUSD, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const batch = inventory.map((item) =>
    stmt.bind(
      item.id, item.collection_slug, item.product_slug,
      item.variant1, item.value1, item.variant2, item.value2, item.variant3, item.value3,
      item.stock, item.priceVND, item.priceUSD, item.status
    )
  );

  if (batch.length > 0) await db.batch(batch);
}

export async function createVariant(item: Omit<Inventory, "id">) {
  const db = await getDB();

  await db.prepare(`
    INSERT INTO inventory (
      collection_slug, product_slug,
      variant1, value1, variant2, value2, variant3, value3,
      stock, priceVND, priceUSD, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  .bind(
    item.collection_slug, item.product_slug,
    item.variant1, item.value1, item.variant2, item.value2, item.variant3, item.value3,
    item.stock, item.priceVND, item.priceUSD, item.status
  )
  .run();
}

export async function updateVariant(item: Inventory) {
  const db = await getDB();

  await db.prepare(`
    UPDATE inventory
    SET
      collection_slug = ?, product_slug = ?,
      variant1 = ?, value1 = ?, variant2 = ?, value2 = ?, variant3 = ?, value3 = ?,
      stock = ?, priceVND = ?, priceUSD = ?, status = ?
    WHERE id = ?
  `)
  .bind(
    item.collection_slug, item.product_slug,
    item.variant1, item.value1, item.variant2, item.value2, item.variant3, item.value3,
    item.stock, item.priceVND, item.priceUSD, item.status,
    item.id
  )
  .run();
}

/**
 * Deletes a variant, then checks whether any other variant for the same
 * product still shares its value1/value2 combination. If none do, the
 * images tied to that combination get cleaned up too — otherwise they'd
 * sit in the DB and R2 forever with nothing left able to reference them.
 */
export async function deleteVariant(id: number): Promise<void> {
  const db = await getDB();

  const variant = await getVariantByIdAnyStatus(id);
  if (!variant) return;

  await db.prepare(`DELETE FROM inventory WHERE id = ?`).bind(id).run();

  const { results: remaining } = await db
    .prepare(`
      SELECT id FROM inventory
      WHERE product_slug = ? AND value1 = ? AND IFNULL(value2,'') = IFNULL(?, '')
    `)
    .bind(variant.product_slug, variant.value1, variant.value2 ?? null)
    .all();

  if (remaining.length === 0 && variant.value1) {
    await deleteImagesForVariantGroup(
      variant.product_slug,
      variant.value1,
      variant.value2
    );
  }
}

/** Deletes every inventory row for a product. Used when a whole product is deleted. */
export async function deleteInventoryForProduct(productSlug: string): Promise<void> {
  const db = await getDB();

  await db
    .prepare(`DELETE FROM inventory WHERE product_slug = ?`)
    .bind(productSlug)
    .run();
}

/** Re-points every inventory row for a product to a new product_slug. */
export async function repointInventoryToSlug(
  oldProductSlug: string,
  newProductSlug: string
): Promise<void> {
  if (oldProductSlug === newProductSlug) return;

  const db = await getDB();

  await db
    .prepare(`UPDATE inventory SET product_slug = ? WHERE product_slug = ?`)
    .bind(newProductSlug, oldProductSlug)
    .run();
}