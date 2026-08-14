import { getDB } from "@/lib/d1";
import type { Collection } from "@/types/db";
import { queryAll } from "@/lib/d1";
import { getProductsByCollectionAdmin, deleteProduct } from "@/lib/db/products";

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
      collection_name, collection_slug, description, status
    ) VALUES (?, ?, ?, ?)
  `)
  .bind(
    collection.collection_name,
    collection.collection_slug,
    collection.description,
    collection.status
  )
  .run();
}

/**
 * Updates a collection. If the slug changed, cascades that rename to
 * products.collection_slug (read by the public/admin product-by-collection
 * queries) and inventory.collection_slug (a denormalized copy, unread
 * today but kept truthful) — otherwise both go stale and silently stop
 * matching the renamed collection.
 */
/**
 * Updates a collection. No cascade needed — products reference
 * collection_id (immutable), so renaming collection_slug or
 * collection_name here doesn't touch any child rows at all.
 */
export async function updateCollection(collection: Collection) {
  const db = await getDB();

  await db.prepare(`
    UPDATE collections
    SET collection_name = ?, collection_slug = ?, description = ?, status = ?
    WHERE id = ?
  `)
  .bind(
    collection.collection_name,
    collection.collection_slug,
    collection.description,
    collection.status,
    collection.id
  )
  .run();
}

/**
 * Deletes a collection and cascades to every product under it (which
 * in turn cascades to that product's inventory and images). WITHOUT
 * this, deleting a collection leaves every one of its products,
 * variants, and images as invisible orphans.
 */
/**
 * Deletes a collection and cascades to every product under it (which
 * in turn cascades to that product's inventory and images). WITHOUT
 * this, deleting a collection leaves every one of its products,
 * variants, and images as invisible orphans.
 */
export async function deleteCollection(id: number) {
  const db = await getDB();

  const products = await getProductsByCollectionAdmin(id);

  for (const product of products) {
    await deleteProduct(product.id);
  }

  await db.prepare(`DELETE FROM collections WHERE id = ?`).bind(id).run();
}