import { getDB, queryAll, queryFirst } from "@/lib/d1";
import { deleteImagesSafe } from "@/engine/cloudfare/r2";
import type { Image } from "@/types/db";

/**
 * Images are keyed by variant_group_id only. R2 key text (product slug,
 * value1, value2) is built by the caller (upload route) BEFORE calling
 * this — this file no longer stores or needs that text, only the id.
 */

export async function getImages(variantGroupId: number): Promise<Image[]> {
  const db = await getDB();

  return queryAll<Image>(
    db
      .prepare(`
        SELECT *
        FROM images
        WHERE variant_group_id = ?
        ORDER BY sort_order ASC, id ASC
      `)
      .bind(variantGroupId)
  );
}

export async function insertImage(
  variantGroupId: number,
  keys: { thumb: string; mid: string; large: string },
  urls: { thumb: string; mid: string; large: string }
): Promise<number> {
  const db = await getDB();

  const maxOrder = await queryFirst<{ max: number }>(
    db
      .prepare(`
        SELECT COALESCE(MAX(sort_order), 0) AS max
        FROM images
        WHERE variant_group_id = ?
      `)
      .bind(variantGroupId)
  );

  const result = await db
    .prepare(`
      INSERT INTO images (
        variant_group_id,
        r2_key_thumb, r2_key_mid, r2_key_large,
        url_thumb, url_mid, url_large,
        sort_order
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      variantGroupId,
      keys.thumb,
      keys.mid,
      keys.large,
      urls.thumb,
      urls.mid,
      urls.large,
      (maxOrder?.max ?? 0) + 1
    )
    .run();

  return Number(result.meta.last_row_id);
}

export async function getImageById(id: number): Promise<Image | null> {
  const db = await getDB();

  return queryFirst<Image>(
    db.prepare(`SELECT * FROM images WHERE id = ?`).bind(id)
  );
}

/**
 * Deletes the DB row first, then best-effort deletes all 3 R2 objects.
 * DB-first means a failed R2 delete only ever leaves harmless orphaned
 * objects in the bucket — never a broken image reference in the app.
 */
export async function deleteImageRow(id: number): Promise<void> {
  const db = await getDB();

  const image = await getImageById(id);
  if (!image) return;

  await db.prepare(`DELETE FROM images WHERE id = ?`).bind(id).run();

  await deleteImagesSafe(
    [image.r2_key_thumb, image.r2_key_mid, image.r2_key_large].filter(Boolean)
  );
}

export async function updateSortOrders(
  order: { id: number; sort_order: number }[]
): Promise<void> {
  const db = await getDB();

  const stmt = db.prepare(`
    UPDATE images
    SET sort_order = ?
    WHERE id = ?
  `);

  const batch = order.map((item) => stmt.bind(item.sort_order, item.id));

  if (batch.length > 0) {
    await db.batch(batch);
  }
}

export async function getFirstImage(variantGroupId: number): Promise<Image | null> {
  const db = await getDB();

  return (await db
    .prepare(`
      SELECT *
      FROM images
      WHERE variant_group_id = ?
      ORDER BY sort_order ASC, id ASC
      LIMIT 1
    `)
    .bind(variantGroupId)
    .first()) as Image | null;
}

/** Gets every image across every variant group belonging to a product. */
export async function getAllImagesForProduct(productId: number): Promise<Image[]> {
  const db = await getDB();

  return queryAll<Image>(
    db
      .prepare(`
        SELECT images.*
        FROM images
        JOIN variant_groups ON variant_groups.id = images.variant_group_id
        WHERE variant_groups.product_id = ?
        ORDER BY images.sort_order ASC, images.id ASC
      `)
      .bind(productId)
  );
}

function allKeys(images: Image[]): string[] {
  return images.flatMap((img) =>
    [img.r2_key_thumb, img.r2_key_mid, img.r2_key_large].filter(Boolean)
  );
}

export async function deleteImagesForProduct(productId: number): Promise<void> {
  const db = await getDB();

  const images = await getAllImagesForProduct(productId);
  if (images.length === 0) return;

  await db
    .prepare(`
      DELETE FROM images
      WHERE variant_group_id IN (
        SELECT id FROM variant_groups WHERE product_id = ?
      )
    `)
    .bind(productId)
    .run();

  await deleteImagesSafe(allKeys(images));
}

export async function deleteImagesForVariantGroup(variantGroupId: number): Promise<void> {
  const db = await getDB();

  const images = await getImages(variantGroupId);
  if (images.length === 0) return;

  await db
    .prepare(`DELETE FROM images WHERE variant_group_id = ?`)
    .bind(variantGroupId)
    .run();

  await deleteImagesSafe(allKeys(images));
}