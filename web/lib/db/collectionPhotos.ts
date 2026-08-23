import { getDB, queryAll, queryFirst } from "@/lib/d1";
import { deleteImagesSafe, renameImageSafe } from "@/engine/cloudfare/r2";
import type { CollectionPhoto } from "@/types/db";

/**
 * Editorial photos for a collection's own page (the lookbook-style
 * section above the product grid) — distinct from product `images`,
 * which are keyed by variant_group_id and used on PDPs/PLPs.
 */

export async function getCollectionPhotos(
  collectionId: number
): Promise<CollectionPhoto[]> {
  const db = await getDB();

  return queryAll<CollectionPhoto>(
    db
      .prepare(`
        SELECT *
        FROM collection_photos
        WHERE collection_id = ?
        ORDER BY sort_order ASC, id ASC
      `)
      .bind(collectionId)
  );
}

export async function getCollectionPhotoById(
  id: number
): Promise<CollectionPhoto | null> {
  const db = await getDB();

  return queryFirst<CollectionPhoto>(
    db.prepare(`SELECT * FROM collection_photos WHERE id = ?`).bind(id)
  );
}

export async function insertCollectionPhoto(
  collectionId: number,
  keys: { thumb: string; mid: string; large: string },
  urls: { thumb: string; mid: string; large: string }
): Promise<number> {
  const db = await getDB();

  const maxOrder = await queryFirst<{ max: number }>(
    db
      .prepare(`
        SELECT COALESCE(MAX(sort_order), 0) AS max
        FROM collection_photos
        WHERE collection_id = ?
      `)
      .bind(collectionId)
  );

  const result = await db
    .prepare(`
      INSERT INTO collection_photos (
        collection_id,
        r2_key_thumb, r2_key_mid, r2_key_large,
        url_thumb, url_mid, url_large,
        sort_order
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      collectionId,
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

/**
 * Deletes the DB row first, then best-effort deletes the R2 objects —
 * same reasoning as deleteImageRow: a failed R2 delete only ever leaves
 * a harmless orphaned object, never a broken reference in the app.
 */
export async function deleteCollectionPhotoRow(id: number): Promise<void> {
  const db = await getDB();

  const photo = await getCollectionPhotoById(id);
  if (!photo) return;

  await db.prepare(`DELETE FROM collection_photos WHERE id = ?`).bind(id).run();

  await deleteImagesSafe(
    [photo.r2_key_thumb, photo.r2_key_mid, photo.r2_key_large].filter(Boolean)
  );
}

export async function updateCollectionPhotoSortOrders(
  order: { id: number; sort_order: number }[]
): Promise<void> {
  const db = await getDB();

  const stmt = db.prepare(`
    UPDATE collection_photos
    SET sort_order = ?
    WHERE id = ?
  `);

  const batch = order.map((item) => stmt.bind(item.sort_order, item.id));

  if (batch.length > 0) {
    await db.batch(batch);
  }
}

/** Used when a collection is deleted, so its photos don't become orphans. */
export async function deleteCollectionPhotosForCollection(
  collectionId: number
): Promise<void> {
  const photos = await getCollectionPhotos(collectionId);
  if (photos.length === 0) return;

  const db = await getDB();

  await db
    .prepare(`DELETE FROM collection_photos WHERE collection_id = ?`)
    .bind(collectionId)
    .run();

  await deleteImagesSafe(
    photos.flatMap((p) =>
      [p.r2_key_thumb, p.r2_key_mid, p.r2_key_large].filter(Boolean)
    )
  );
}

/**
 * Called when a collection's slug changes. R2 objects for its photos
 * live under `Collections/{slug}/...`, so a slug change would otherwise
 * silently leave every photo's key/url pointing at the old folder name
 * — still working, but drifted from the collection's current identity.
 * This renames each object in place (R2 copy+delete) and updates the
 * matching DB row so keys/urls stay truthful.
 *
 * Best-effort per object: if a given rename fails, that one photo size
 * is left pointing at its old (still valid) key/url rather than the
 * whole operation failing partway through.
 */
export async function renameCollectionPhotosFolder(
  collectionId: number,
  oldSlug: string,
  newSlug: string
): Promise<void> {
  if (oldSlug === newSlug) return;

  const photos = await getCollectionPhotos(collectionId);
  if (photos.length === 0) return;

  const oldBase = `Collections/${oldSlug}/`;
  const newBase = `Collections/${newSlug}/`;

  async function renameOne(oldKey: string): Promise<{ key: string; url: string | null }> {
    if (!oldKey || !oldKey.startsWith(oldBase)) {
      // Doesn't match the expected prefix — leave it untouched rather
      // than guessing at a rewrite.
      return { key: oldKey, url: null };
    }

    const newKey = newBase + oldKey.slice(oldBase.length);
    const newUrl = await renameImageSafe(oldKey, newKey);

    // Rename failed: keep the old (still-valid) key so nothing breaks.
    return newUrl ? { key: newKey, url: newUrl } : { key: oldKey, url: null };
  }

  const db = await getDB();
  const stmt = db.prepare(`
    UPDATE collection_photos
    SET r2_key_thumb = ?, r2_key_mid = ?, r2_key_large = ?,
        url_thumb = ?, url_mid = ?, url_large = ?
    WHERE id = ?
  `);

  const batch = [];

  for (const photo of photos) {
    const [thumb, mid, large] = await Promise.all([
      renameOne(photo.r2_key_thumb),
      renameOne(photo.r2_key_mid),
      renameOne(photo.r2_key_large),
    ]);

    batch.push(
      stmt.bind(
        thumb.key,
        mid.key,
        large.key,
        thumb.url ?? photo.url_thumb,
        mid.url ?? photo.url_mid,
        large.url ?? photo.url_large,
        photo.id
      )
    );
  }

  if (batch.length > 0) {
    await db.batch(batch);
  }
}