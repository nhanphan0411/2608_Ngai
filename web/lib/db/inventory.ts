import { getDB } from "@/lib/d1";
import type { Inventory, Product } from "@/types/db";
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
export async function findOrCreateVariantGroup(
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

/**
 * Renames a variant group in place — updates value1/value2 on the
 * variant_groups row itself. Because inventory rows and images both
 * reference variant_group_id (not value1/value2 text), nothing else
 * needs to change: every row and every image "renames" automatically
 * just by virtue of still pointing at this same id.
 */
export async function renameVariantGroup(
  id: number,
  value1: string,
  value2: string | null
): Promise<void> {
  const db = await getDB();

  const normalizedValue1 = normalize(value1) ?? "original";
  const normalizedValue2 = normalize(value2);

  await db
    .prepare(`UPDATE variant_groups SET value1 = ?, value2 = ? WHERE id = ?`)
    .bind(normalizedValue1, normalizedValue2, id)
    .run();
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

/** Batched version of getVariantById for any number of ids — one query
 * instead of one per id. Same "Active only" rule; an id not in the result
 * means it doesn't exist or isn't Active, same as a null from
 * getVariantById. */
export async function getVariantsByIds(ids: number[]): Promise<Inventory[]> {
  if (ids.length === 0) return [];

  const db = await getDB();
  const placeholders = ids.map(() => "?").join(",");

  const { results } = await db
    .prepare(`
      SELECT * FROM inventory
      WHERE id IN (${placeholders}) AND status = 'Active'
    `)
    .bind(...ids)
    .all();

  return results as unknown as Inventory[];
}

/**
 * Batched version of getVariantById + getProductById + getFirstImage
 * combined — one query for any number of variant ids instead of 3 round
 * trips per id. Used by the cart API to resolve a whole cart in one query.
 * Only Active variants are returned (same rule as getVariantById); a
 * missing id in the input just won't appear in the result.
 */
export async function getVariantsForCart(
  ids: number[]
): Promise<{ variant: Inventory; product: Product; imageUrl: string | null }[]> {
  if (ids.length === 0) return [];

  const db = await getDB();
  const placeholders = ids.map(() => "?").join(",");

  const { results } = await db
    .prepare(`
      SELECT
        i.id, i.product_id, i.variant_group_id,
        i.variant1, i.value1, i.variant2, i.value2, i.variant3, i.value3,
        i.stock, i.priceVND, i.priceUSD, i.status,

        p.id AS p_id, p.collection_id AS p_collection_id,
        p.product_name AS p_product_name, p.product_slug AS p_product_slug,
        p.category AS p_category, p.status AS p_status,
        p.description AS p_description, p.shipping AS p_shipping,
        p.sizeGuide AS p_sizeGuide, p.size_guide_id AS p_size_guide_id,
        p.notes AS p_notes, p.sort_order AS p_sort_order,

        (
          SELECT url_thumb FROM images
          WHERE variant_group_id = i.variant_group_id
          ORDER BY sort_order ASC, id ASC LIMIT 1
        ) AS image_url

      FROM inventory i
      JOIN products p ON p.id = i.product_id
      WHERE i.id IN (${placeholders}) AND i.status = 'Active'
    `)
    .bind(...ids)
    .all();

  return (results as any[]).map((row) => ({
    variant: {
      id: row.id,
      product_id: row.product_id,
      variant_group_id: row.variant_group_id,
      variant1: row.variant1,
      value1: row.value1,
      variant2: row.variant2,
      value2: row.value2,
      variant3: row.variant3,
      value3: row.value3,
      stock: row.stock,
      priceVND: row.priceVND,
      priceUSD: row.priceUSD,
      status: row.status,
    } as Inventory,
    product: {
      id: row.p_id,
      collection_id: row.p_collection_id,
      product_name: row.p_product_name,
      product_slug: row.p_product_slug,
      category: row.p_category,
      status: row.p_status,
      description: row.p_description,
      shipping: row.p_shipping,
      sizeGuide: row.p_sizeGuide,
      size_guide_id: row.p_size_guide_id,
      notes: row.p_notes,
      sort_order: row.p_sort_order,
    } as Product,
    imageUrl: row.image_url ?? null,
  }));
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

export async function createVariant(item: Omit<Inventory, "id" | "variant_group_id">) {
  const db = await getDB();
  const v = withVariantDefaults(item as Inventory);
  const groupId = await findOrCreateVariantGroup(v.product_id, v.value1!, v.value2);

  const result = await db.prepare(`
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

  return { id: Number(result.meta.last_row_id), variant_group_id: groupId };
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

  return { id: v.id, variant_group_id: groupId };
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
    await db.prepare(`DELETE FROM variant_groups WHERE id = ?`).bind(variant.variant_group_id).run();

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

/** Deletes every variant_groups row for a product. Only call this AFTER
 * both its inventory rows and its images have already been cleaned up —
 * deleteImagesForProduct needs the variant_groups rows to still exist
 * in order to find which images belong to this product. */
export async function deleteVariantGroupsForProduct(productId: number): Promise<void> {
  const db = await getDB();

  await db
    .prepare(`DELETE FROM variant_groups WHERE product_id = ?`)
    .bind(productId)
    .run();
}