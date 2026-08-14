import { getDB } from "@/lib/d1";
import type { Inventory } from "@/types/db";
import { deleteImagesForVariantGroup } from "@/lib/db/images";

/**
 * Strips whitespace and lowercases a variant field. Applied to every
 * variant1/value1/variant2/value2/variant3/value3 write so "Red " and "red"
 * can never both exist as separate option values.
 */
export function normalize(v: string | null | undefined): string | null {
  if (v == null) return null;
  const trimmed = v.trim().toLowerCase();
  return trimmed === "" ? null : trimmed;
}

/**
 * Applies normalize() to every variant name/value field, then defaults
 * variant1/value1 to "color"/"original" and variant3/value3 to
 * "size"/"one-size" when left blank. variant2/value2 stay optional (null)
 * on purpose — there's no third mandatory axis in this catalog.
 */
function withVariantDefaults<
T extends {
    variant1: string | null; value1: string | null;
    variant2: string | null; value2: string | null;
    variant3: string | null; value3: string | null;
  }
>(item: T): T {
  return {
    ...item,
    variant1: normalize(item.variant1) ?? "color",
    value1:   normalize(item.value1)   ?? "original",
    variant2: normalize(item.variant2),
    value2:   normalize(item.value2),
    variant3: normalize(item.variant3) ?? "size",
    value3:   normalize(item.value3)   ?? "one-size",
  };
}

/**
 * Finds the variant_groups row for (product_id, value1, value2), creating
 * it if it doesn't exist yet. This is the single choke point that turns
 * "color=red" into a real group id — every insert/update goes through
 * this instead of ever writing value1/value2 onto images directly.
 */
async function findOrCreateVariantGroup(
  productId: number,
  value1: string,
  value2: string | null
): Promise<number> {
  const db = await getDB();

  const existing = (await db
    .prepare(`
      SELECT id FROM variant_groups
      WHERE product_id = ? AND value1 = ? AND IFNULL(value2,'') = IFNULL(?, '')
    `)
    .bind(productId, value1, value2 ?? null)
    .first()) as { id: number } | null;

  if (existing) return existing.id;

  const result = await db
    .prepare(`INSERT INTO variant_groups (product_id, value1, value2) VALUES (?, ?, ?)`)
    .bind(productId, value1, value2 ?? null)
    .run();

  return Number(result.meta.last_row_id);
}

export async function getInventory(productId: number): Promise<Inventory[]> {
  const db = await getDB();

  const { results } = await db
    .prepare(`
      SELECT * FROM inventory
      WHERE product_id = ? AND status = 'Active'
      ORDER BY id
    `)
    .bind(productId)
    .all();

  return results as unknown as Inventory[];
}

export async function getInventoryAdmin(productId: number): Promise<Inventory[]> {
  const db = await getDB();

  const { results } = await db
    .prepare(`SELECT * FROM inventory WHERE product_id = ? ORDER BY id`)
    .bind(productId)
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
  productId: number
): Promise<{ value1: string }[]> {
  const db = await getDB();

  const { results } = await db
    .prepare(`
      SELECT DISTINCT value1 FROM inventory
      WHERE product_id = ?
      ORDER BY value1
    `)
    .bind(productId)
    .all();

  return results as unknown as { value1: string }[];
}

export async function getValue2Options(
  productId: number,
  value1: string
): Promise<{ value2: string }[]> {
  const db = await getDB();

  const { results } = await db
    .prepare(`
      SELECT DISTINCT value2 FROM inventory
      WHERE product_id = ? AND value1 = ? AND value2 IS NOT NULL AND value2 != ''
      ORDER BY value2
    `)
    .bind(productId, value1)
    .all();

  return results as unknown as { value2: string }[];
}

export async function saveInventory(inventory: Inventory[]): Promise<void> {
  const db = await getDB();

  await db.prepare(`DELETE FROM inventory`).run();

  const stmt = db.prepare(`
    INSERT INTO inventory (
      id, product_id, variant_group_id,
      variant1, value1, variant2, value2, variant3, value3,
      stock, priceVND, priceUSD, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const batch = [];
  for (const item of inventory) {
    const v = withVariantDefaults(item);
    const groupId = await findOrCreateVariantGroup(v.product_id, v.value1!, v.value2);
    batch.push(stmt.bind(
      v.id, v.product_id, groupId,
      v.variant1, v.value1, v.variant2, v.value2, v.variant3, v.value3,
      v.stock, v.priceVND, v.priceUSD, v.status
    ));
  }

  if (batch.length > 0) await db.batch(batch);
}

export async function createVariant(item: Omit<Inventory, "id" | "variant_group_id">) {
  const db = await getDB();
  const v = withVariantDefaults(item as Inventory);
  const groupId = await findOrCreateVariantGroup(v.product_id, v.value1!, v.value2);

  await db.prepare(`
    INSERT INTO inventory (
      product_id, variant_group_id,
      variant1, value1, variant2, value2, variant3, value3,
      stock, priceVND, priceUSD, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  .bind(
    v.product_id, groupId,
    v.variant1, v.value1, v.variant2, v.value2, v.variant3, v.value3,
    v.stock, v.priceVND, v.priceUSD, v.status
  )
  .run();
}

export async function updateVariant(item: Inventory) {
  const db = await getDB();
  const v = withVariantDefaults(item);
  const groupId = await findOrCreateVariantGroup(v.product_id, v.value1!, v.value2);

  await db.prepare(`
    UPDATE inventory
    SET
      product_id = ?, variant_group_id = ?,
      variant1 = ?, value1 = ?, variant2 = ?, value2 = ?, variant3 = ?, value3 = ?,
      stock = ?, priceVND = ?, priceUSD = ?, status = ?
    WHERE id = ?
  `)
  .bind(
    v.product_id, groupId,
    v.variant1, v.value1, v.variant2, v.value2, v.variant3, v.value3,
    v.stock, v.priceVND, v.priceUSD, v.status,
    v.id
  )
  .run();
}

/**
 * Deletes a variant, then checks whether any other variant still shares
 * its variant_group_id. If none do, the group's images get cleaned up
 * too — otherwise they'd sit in the DB and R2 forever with nothing left
 * able to reference them.
 */
export async function deleteVariant(id: number): Promise<void> {
  const db = await getDB();

  const variant = await getVariantByIdAnyStatus(id);
  if (!variant) return;

  await db.prepare(`DELETE FROM inventory WHERE id = ?`).bind(id).run();

  const { results: remaining } = await db
    .prepare(`SELECT id FROM inventory WHERE variant_group_id = ?`)
    .bind(variant.variant_group_id)
    .all();

  if (remaining.length === 0) {
    await deleteImagesForVariantGroup(variant.variant_group_id);
  }
}

/** Deletes every inventory row for a product. Used when a whole product is deleted. */
export async function deleteInventoryForProduct(productId: number): Promise<void> {
  const db = await getDB();

  await db
    .prepare(`DELETE FROM inventory WHERE product_id = ?`)
    .bind(productId)
    .run();
}