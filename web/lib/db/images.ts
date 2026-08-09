import { getDB, queryAll, queryFirst } from "@/lib/d1";
import { deleteImagesSafe } from "@/engine/cloudfare/r2";
import type { Image } from "@/types/db";
import { renameImage } from "@/engine/cloudfare/r2";

/**
 * Renames the images tied to one value1/value2 group over to a new
 * value1/value2 group — used when an admin edits a variant's own
 * value1/value2 and expects its images to follow, not vanish.
 *
 * Caveat: if multiple inventory rows currently share the OLD group
 * (e.g. same color, different sizes), this moves ALL of their shared
 * images to the NEW group too. That's usually what's wanted (renaming
 * a shared attribute), but it means editing one row can affect what
 * other rows see if they still reference the old value.
 */
export async function repointImagesForVariantGroup(
  productSlug: string,
  oldValue1: string,
  oldValue2: string | null,
  newValue1: string,
  newValue2: string | null
): Promise<void> {
  if (oldValue1 === newValue1 && (oldValue2 ?? null) === (newValue2 ?? null)) {
    return;
  }

  const images = await getImages(productSlug, oldValue1, oldValue2 ?? undefined);
  if (images.length === 0) return;

  const db = await getDB();

  const newBase = newValue2
    ? `Products/${productSlug}/${newValue1}/${newValue2}`
    : `Products/${productSlug}/${newValue1}`;

  for (const img of images) {
    const nameThumb = img.r2_key_thumb.split("/").pop();
    const nameMid = img.r2_key_mid.split("/").pop();
    const nameLarge = img.r2_key_large.split("/").pop();

    const newKeyThumb = `${newBase}/${nameThumb}`;
    const newKeyMid = `${newBase}/${nameMid}`;
    const newKeyLarge = `${newBase}/${nameLarge}`;

    const [urlThumb, urlMid, urlLarge] = await Promise.all([
      renameImage(img.r2_key_thumb, newKeyThumb),
      renameImage(img.r2_key_mid, newKeyMid),
      renameImage(img.r2_key_large, newKeyLarge),
    ]);

    await db
      .prepare(`
        UPDATE images
        SET value1 = ?, value2 = ?,
            r2_key_thumb = ?, r2_key_mid = ?, r2_key_large = ?,
            url_thumb = ?, url_mid = ?, url_large = ?
        WHERE id = ?
      `)
      .bind(
        newValue1, newValue2,
        newKeyThumb, newKeyMid, newKeyLarge,
        urlThumb, urlMid, urlLarge,
        img.id
      )
      .run();
  }
}

export async function getImages(
  productSlug: string,
  value1: string,
  value2?: string
): Promise<Image[]> {
  const db = await getDB();

  return queryAll<Image>(
    db
      .prepare(`
        SELECT *
        FROM images
        WHERE product_slug = ?
          AND value1 = ?
          AND IFNULL(value2,'') = IFNULL(?, '')
        ORDER BY sort_order ASC, id ASC
      `)
      .bind(productSlug, value1, value2 ?? null)
  );
}

export async function insertImage(
  productSlug: string,
  value1: string,
  value2: string | null,
  keys: { thumb: string; mid: string; large: string },
  urls: { thumb: string; mid: string; large: string }
): Promise<number> {
  const db = await getDB();

  const maxOrder = await queryFirst<{ max: number }>(
    db
      .prepare(`
        SELECT COALESCE(MAX(sort_order), 0) AS max
        FROM images
        WHERE product_slug = ?
          AND value1 = ?
          AND IFNULL(value2,'') = IFNULL(?, '')
      `)
      .bind(productSlug, value1, value2 ?? null)
  );

  const result = await db
    .prepare(`
      INSERT INTO images (
        product_slug, value1, value2,
        r2_key_thumb, r2_key_mid, r2_key_large,
        url_thumb, url_mid, url_large,
        sort_order
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      productSlug,
      value1,
      value2 ?? null,
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

export async function getFirstImage(
  productSlug: string,
  value1: string | null,
  value2?: string | null
): Promise<Image | null> {
  const db = await getDB();

  return (await db
    .prepare(`
      SELECT *
      FROM images
      WHERE product_slug = ?
        AND value1 = ?
        AND IFNULL(value2,'') = IFNULL(?, '')
      ORDER BY sort_order ASC, id ASC
      LIMIT 1
    `)
    .bind(productSlug, value1, value2 ?? null)
    .first()) as Image | null;
}

export async function getAllImagesForProduct(
  productSlug: string
): Promise<Image[]> {
  const db = await getDB();

  return queryAll<Image>(
    db
      .prepare(`
        SELECT *
        FROM images
        WHERE product_slug = ?
        ORDER BY sort_order ASC, id ASC
      `)
      .bind(productSlug)
  );
}

function allKeys(images: Image[]): string[] {
  return images.flatMap((img) =>
    [img.r2_key_thumb, img.r2_key_mid, img.r2_key_large].filter(Boolean)
  );
}

export async function deleteImagesForProduct(productSlug: string): Promise<void> {
  const db = await getDB();

  const images = await getAllImagesForProduct(productSlug);
  if (images.length === 0) return;

  await db
    .prepare(`DELETE FROM images WHERE product_slug = ?`)
    .bind(productSlug)
    .run();

  await deleteImagesSafe(allKeys(images));
}

export async function deleteImagesForVariantGroup(
  productSlug: string,
  value1: string,
  value2: string | null
): Promise<void> {
  const images = await getImages(productSlug, value1, value2 ?? undefined);
  if (images.length === 0) return;

  const db = await getDB();

  await db
    .prepare(`
      DELETE FROM images
      WHERE product_slug = ?
        AND value1 = ?
        AND IFNULL(value2,'') = IFNULL(?, '')
    `)
    .bind(productSlug, value1, value2 ?? null)
    .run();

  await deleteImagesSafe(allKeys(images));
}

export async function repointImagesToSlug(
  oldProductSlug: string,
  newProductSlug: string
): Promise<void> {
  if (oldProductSlug === newProductSlug) return;

  const db = await getDB();

  await db
    .prepare(`UPDATE images SET product_slug = ? WHERE product_slug = ?`)
    .bind(newProductSlug, oldProductSlug)
    .run();
}