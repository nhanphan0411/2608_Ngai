import { getDB } from "@/lib/d1";
import type { Collection } from "@/types/db";
import { queryAll } from "@/lib/d1";
import { getProductsByCollectionAdmin, deleteProduct } from "@/lib/db/products";
import {
  deleteCollectionPhotosForCollection,
  renameCollectionPhotosFolder,
} from "@/lib/db/collectionPhotos";

export async function getCollection(id: number): Promise<Collection | null> {
  const db = await getDB();

  return (await db
    .prepare(`SELECT * FROM collections WHERE id = ? LIMIT 1`)
    .bind(id)
    .first()) as Collection | null;
}

export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  const db = await getDB();

  return (await db
    .prepare(`SELECT * FROM collections WHERE collection_slug = ? LIMIT 1`)
    .bind(slug)
    .first()) as Collection | null;
}

export async function getAllCollectionsAdmin(): Promise<Collection[]> {
  const db = await getDB();

  return queryAll<Collection>(
    db.prepare(`SELECT * FROM collections ORDER BY id`)
  );
}

/** Public-facing list for things like the collection page's "switch
 * collection" dropdown — only ever shows collections that are live. */
export async function getActiveCollections(): Promise<Collection[]> {
  const db = await getDB();

  return queryAll<Collection>(
    db
      .prepare(`SELECT * FROM collections WHERE status = 'Active' ORDER BY collection_name`)
  );
}

/**
 * Most-recently-created live collection — used to send visitors of the bare
 * /collections route straight to a collection page instead of an index.
 * Collections have no created_at column, so "latest" is the highest id
 * (ids are assigned in insertion order). Falls back to any collection
 * (regardless of status) if nothing is Active, so the route still resolves
 * while a store is being set up.
 */
export async function getLatestCollection(): Promise<Collection | null> {
  const db = await getDB();

  const active = (await db
    .prepare(`SELECT * FROM collections WHERE status = 'Active' ORDER BY id DESC LIMIT 1`)
    .first()) as Collection | null;

  if (active) return active;

  return (await db
    .prepare(`SELECT * FROM collections ORDER BY id DESC LIMIT 1`)
    .first()) as Collection | null;
}

export async function saveCollections(collections: Collection[]): Promise<void> {
  const db = await getDB();

  await db.prepare(`DELETE FROM collections`).run();

  const stmt = db.prepare(`
    INSERT INTO collections (
      id, collection_name, collection_slug, description, status
    ) VALUES (?, ?, ?, ?, ?)
  `);

  const batch = collections.map((c) =>
    stmt.bind(c.id, c.collection_name, c.collection_slug, c.description, c.status)
  );

  if (batch.length > 0) await db.batch(batch);
}

export async function createCollection(collection: Omit<Collection, "id">) {
  const db = await getDB();

  await db.prepare(`
    INSERT INTO collections (
      collection_name, collection_slug, description, status, layout_style
    ) VALUES (?, ?, ?, ?, ?)
  `)
  .bind(
    collection.collection_name,
    collection.collection_slug,
    collection.description,
    collection.status,
    collection.layout_style ?? "grid"
  )
  .run();
}

/**
 * Updates a collection. If the slug changed, cascades that rename to
 * the collection's editorial-photo R2 folder (Collections/{slug}/...)
 * so photo objects and their stored keys/urls stay in sync with the
 * collection's current identity — otherwise photos keep working but
 * silently sit under a now-stale folder name. Products are unaffected:
 * they reference collection_id (immutable) and their own R2 folder is
 * keyed by product slug, not collection slug.
 */
export async function updateCollection(collection: Collection) {
  const db = await getDB();

  const existing = (await db
    .prepare(`SELECT * FROM collections WHERE id = ? LIMIT 1`)
    .bind(collection.id)
    .first()) as Collection | null;

  await db.prepare(`
    UPDATE collections
    SET collection_name = ?, collection_slug = ?, description = ?, status = ?, layout_style = ?
    WHERE id = ?
  `)
  .bind(
    collection.collection_name,
    collection.collection_slug,
    collection.description,
    collection.status,
    collection.layout_style ?? "grid",
    collection.id
  )
  .run();

  if (existing && existing.collection_slug !== collection.collection_slug) {
    await renameCollectionPhotosFolder(
      collection.id,
      existing.collection_slug,
      collection.collection_slug
    );
  }
}

/**
 * Deletes a collection and cascades to every product under it (which
 * in turn cascades to that product's inventory and images), plus this
 * collection's own editorial photos and their R2 objects. WITHOUT
 * this, deleting a collection leaves every one of its products,
 * variants, images, and photos as invisible orphans.
 */
export async function deleteCollection(id: number) {
  const db = await getDB();

  const products = await getProductsByCollectionAdmin(id);

  for (const product of products) {
    await deleteProduct(product.id);
  }

  await deleteCollectionPhotosForCollection(id);

  await db.prepare(`DELETE FROM collections WHERE id = ?`).bind(id).run();
}