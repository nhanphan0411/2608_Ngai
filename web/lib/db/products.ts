import { getDB } from "@/lib/d1";
import { Product } from "@/types/db";
import { deleteImagesForProduct } from "@/lib/db/images";
import { deleteInventoryForProduct, deleteVariantGroupsForProduct } from "@/lib/db/inventory";

const PAGE_SIZE = 20;

export async function getAllProductsPaginated(page: number): Promise<{ products: Product[]; total: number }> {
  const db = await getDB();
  const offset = (page - 1) * PAGE_SIZE;

  const { results } = await db
    .prepare(`SELECT * FROM products WHERE status = 'Active' ORDER BY id LIMIT ? OFFSET ?`)
    .bind(PAGE_SIZE, offset)
    .all();

  const countRow = await db
    .prepare(`SELECT COUNT(*) as count FROM products WHERE status = 'Active'`)
    .first<{ count: number }>();

  return {
    products: results as unknown as Product[],
    total: countRow?.count ?? 0,
  };
}

export async function getProductsByCollectionPaginated(
  collectionId: number,
  page: number
): Promise<{ products: Product[]; total: number }> {
  const db = await getDB();
  const offset = (page - 1) * PAGE_SIZE;

  const { results } = await db
    .prepare(`
      SELECT * FROM products
      WHERE collection_id = ? AND status = 'Active'
      ORDER BY id LIMIT ? OFFSET ?
    `)
    .bind(collectionId, PAGE_SIZE, offset)
    .all();

  const countRow = await db
    .prepare(`SELECT COUNT(*) as count FROM products WHERE collection_id = ? AND status = 'Active'`)
    .bind(collectionId)
    .first<{ count: number }>();

  return {
    products: results as unknown as Product[],
    total: countRow?.count ?? 0,
  };
}

export async function getProductsByCategoryPaginated(
  categoryName: string,
  page: number
): Promise<{ products: Product[]; total: number }> {
  const db = await getDB();
  const target = categoryName.trim().toLowerCase();
  const offset = (page - 1) * PAGE_SIZE;

  const whereClause = `
    status = 'Active'
    AND (
      LOWER(TRIM(category)) = ?
      OR LOWER(category) LIKE ?
      OR LOWER(category) LIKE ?
      OR LOWER(category) LIKE ?
    )
  `;
  const bindArgs = [
    target,
    `${target}, %`,
    `%, ${target}, %`,
    `%, ${target}`,
  ];

  const { results } = await db
    .prepare(`SELECT * FROM products WHERE ${whereClause} ORDER BY id LIMIT ? OFFSET ?`)
    .bind(...bindArgs, PAGE_SIZE, offset)
    .all();

  const countRow = await db
    .prepare(`SELECT COUNT(*) as count FROM products WHERE ${whereClause}`)
    .bind(...bindArgs)
    .first<{ count: number }>();

  return {
    products: results as unknown as Product[],
    total: countRow?.count ?? 0,
  };
}

export const PRODUCTS_PAGE_SIZE = PAGE_SIZE;

export async function getProductsByCollection(collectionId: number): Promise<Product[]> {
  const db = await getDB();

  const { results } = await db
    .prepare(`
      SELECT * FROM products
      WHERE collection_id = ? AND status = 'Active'
      ORDER BY id
    `)
    .bind(collectionId)
    .all();

  return results as unknown as Product[];
}

/**
 * Slug -> row lookup. This is now the ONLY place in the codebase where
 * a URL slug touches SQL directly — every downstream call (inventory,
 * images, cascades) uses product.id from here on, not the slug.
 */
export async function getProduct(id: number): Promise<Product | null> {
  const db = await getDB();

  return (await db
    .prepare(`SELECT * FROM products WHERE id = ? LIMIT 1`)
    .bind(id)
    .first()) as Product | null;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const db = await getDB();

  return (await db
    .prepare(`SELECT * FROM products WHERE product_slug = ? LIMIT 1`)
    .bind(slug)
    .first()) as Product | null;
}

/** Id -> row lookup. Used anywhere we already have a numeric product_id
 * (e.g. off an inventory row) and don't want to round-trip through a slug. */
export async function getProductById(id: number): Promise<Product | null> {
  const db = await getDB();

  return (await db
    .prepare(`SELECT * FROM products WHERE id = ? LIMIT 1`)
    .bind(id)
    .first()) as Product | null;
}

export async function getAllProducts(): Promise<Product[]> {
  const db = await getDB();

  const { results } = await db
    .prepare(`SELECT * FROM products WHERE status = 'Active' ORDER BY id`)
    .all();

  return results as unknown as Product[];
}

export async function getProductsByCollectionAdmin(collectionId: number): Promise<Product[]> {
  const db = await getDB();

  const { results } = await db
    .prepare(`SELECT * FROM products WHERE collection_id = ? ORDER BY id`)
    .bind(collectionId)
    .all();

  return results as unknown as Product[];
}

export async function saveProducts(products: Product[]): Promise<void> {
  const db = await getDB();

  await db.prepare(`DELETE FROM products`).run();

  const stmt = db.prepare(`
    INSERT INTO products (
      id, collection_id, product_name, product_slug,
      category, status, description, shipping, sizeGuide, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const batch = products.map((p) =>
    stmt.bind(
      p.id, p.collection_id, p.product_name, p.product_slug,
      p.category, p.status, p.description, p.shipping, p.sizeGuide, p.notes
    )
  );

  if (batch.length > 0) await db.batch(batch);
}

export async function getAllProductsAdmin(): Promise<Product[]> {
  const db = await getDB();

  const { results } = await db.prepare(`SELECT * FROM products ORDER BY id`).all();

  return results as unknown as Product[];
}

export async function createProduct(product: Omit<Product, "id">) {
  const db = await getDB();

  await db.prepare(`
    INSERT INTO products (
      collection_id, product_name, product_slug,
      category, status, description, shipping, sizeGuide, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  .bind(
    product.collection_id, product.product_name, product.product_slug,
    product.category, product.status, product.description,
    product.shipping, product.sizeGuide, product.notes
  )
  .run();
}

/**
 * Updates a product. No more slug-cascade needed — inventory and images
 * reference product_id, so renaming product_slug here doesn't touch them
 * at all. product_slug can still change freely; it's just a display/URL
 * value now, not a join key.
 */
export async function updateProduct(product: Product) {
  const db = await getDB();

  await db.prepare(`
    UPDATE products
    SET
      collection_id = ?, product_name = ?, product_slug = ?,
      category = ?, status = ?, description = ?,
      shipping = ?, sizeGuide = ?, notes = ?
    WHERE id = ?
  `)
  .bind(
    product.collection_id, product.product_name, product.product_slug,
    product.category, product.status, product.description,
    product.shipping, product.sizeGuide, product.notes,
    product.id
  )
  .run();
}

/**
 * Deletes a product and cascades cleanup to its inventory rows and
 * images (DB rows + R2 objects) — without this, both accumulate
 * forever as invisible orphans every time a product is removed.
 */
export async function deleteProduct(id: number) {
  const db = await getDB();

  await deleteInventoryForProduct(id);
  await deleteImagesForProduct(id);
  await deleteVariantGroupsForProduct(id);

  await db.prepare(`DELETE FROM products WHERE id = ?`).bind(id).run();

}

export async function getProductsByCategory(categoryName: string): Promise<Product[]> {
  const db = await getDB();

  const target = categoryName.trim().toLowerCase();

  const { results } = await db
    .prepare(`
      SELECT * FROM products
      WHERE status = 'Active'
        AND (
          LOWER(TRIM(category)) = ?
          OR LOWER(category) LIKE ?
          OR LOWER(category) LIKE ?
          OR LOWER(category) LIKE ?
        )
      ORDER BY id
    `)
    .bind(
      target,
      `${target}, %`,
      `%, ${target}, %`,
      `%, ${target}`
    )
    .all();

  return results as unknown as Product[];
}