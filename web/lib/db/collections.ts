import { getDB } from "@/lib/d1";
import type { Collection } from "@/types/db";
import { queryAll } from "@/lib/d1";
import { getProductsByCollectionAdmin, deleteProduct } from "@/lib/db/products";

export async function getCollections() {
  const db = await getDB();

  return queryAll<Collection>(
    db.prepare(`SELECT * FROM collections WHERE status='Active' ORDER BY id`)
  );
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
export async function deleteCollection(id: number) {
  const db = await getDB();

  const existing = (await db
    .prepare(`SELECT collection_slug FROM collections WHERE id = ?`)
    .bind(id)
    .first()) as { collection_slug: string } | null;

  if (existing) {
    const products = await getProductsByCollectionAdmin(existing.collection_slug);

    for (const product of products) {
      await deleteProduct(product.id);
    }
  }

  await db.prepare(`DELETE FROM collections WHERE id = ?`).bind(id).run();
}