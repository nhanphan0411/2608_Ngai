import { getDB } from "@/lib/d1";
import { Product } from "@/types/db";
import { deleteImagesForProduct } from "@/lib/db/images";
import { deleteInventoryForProduct, deleteVariantGroupsForProduct } from "@/lib/db/inventory";

const PAGE_SIZE = 18;

export const PRODUCTS_PAGE_SIZE = PAGE_SIZE;

export type ProductSort = "feature" | "name";

function categoryCondition(categoryName: string): { clause: string; args: string[] } {
  const target = categoryName.trim().toLowerCase();

  return {
    clause: `(
      LOWER(TRIM(category)) = ?
      OR LOWER(category) LIKE ?
      OR LOWER(category) LIKE ?
      OR LOWER(category) LIKE ?
    )`,
    args: [target, `${target}, %`, `%, ${target}, %`, `%, ${target}`],
  };
}

/**
 * The single product-listing query behind /products, /collections/[slug]
 * and /categories/[slug] — collection and category are independent,
 * combinable filters, and sort is either the admin-curated display order
 * ("feature": each product's collection's sort_order, then its own
 * sort_order within that collection — so /products reads as collections in
 * their curated order, each one's products in their curated order) or
 * alphabetical by name.
 */
export async function getProductsFiltered({
  collectionId,
  categoryName,
  sort = "feature",
  page,
}: {
  collectionId?: number;
  categoryName?: string;
  sort?: ProductSort;
  page: number;
}): Promise<{ products: Product[]; total: number }> {
  const db = await getDB();
  const offset = (page - 1) * PAGE_SIZE;

  const conditions = ["products.status = 'Active'"];
  const args: (string | number)[] = [];

  if (collectionId) {
    conditions.push("products.collection_id = ?");
    args.push(collectionId);
  }

  if (categoryName) {
    const { clause, args: catArgs } = categoryCondition(categoryName);
    conditions.push(clause);
    args.push(...catArgs);
  }

  const whereClause = conditions.join(" AND ");

  const orderClause =
    sort === "name"
      ? "products.product_name ASC"
      : "collections.sort_order ASC, products.sort_order ASC, products.id ASC";

  const { results } = await db
    .prepare(`
      SELECT products.* FROM products
      JOIN collections ON collections.id = products.collection_id
      WHERE ${whereClause}
      ORDER BY ${orderClause}
      LIMIT ? OFFSET ?
    `)
    .bind(...args, PAGE_SIZE, offset)
    .all();

  const countRow = await db
    .prepare(`
      SELECT COUNT(*) as count FROM products
      JOIN collections ON collections.id = products.collection_id
      WHERE ${whereClause}
    `)
    .bind(...args)
    .first<{ count: number }>();

  return {
    products: results as unknown as Product[],
    total: countRow?.count ?? 0,
  };
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

export async function getProductsByCollectionAdmin(collectionId: number): Promise<Product[]> {
  const db = await getDB();

  const { results } = await db
    .prepare(`SELECT * FROM products WHERE collection_id = ? ORDER BY sort_order ASC, id ASC`)
    .bind(collectionId)
    .all();

  return results as unknown as Product[];
}

export async function getAllProductsAdmin(): Promise<Product[]> {
  const db = await getDB();

  const { results } = await db.prepare(`SELECT * FROM products ORDER BY id`).all();

  return results as unknown as Product[];
}

export async function createProduct(product: Omit<Product, "id">) {
  const db = await getDB();

  // New products join at the end of their collection's display order —
  // ordering itself only changes via the dedicated reorder endpoint.
  const maxOrder = await db
    .prepare(`SELECT COALESCE(MAX(sort_order), 0) AS max FROM products WHERE collection_id = ?`)
    .bind(product.collection_id)
    .first<{ max: number }>();

  await db.prepare(`
    INSERT INTO products (
      collection_id, product_name, product_slug,
      category, status, description, shipping, sizeGuide, size_guide_id, notes, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  .bind(
    product.collection_id, product.product_name, product.product_slug,
    product.category, product.status, product.description,
    product.shipping, product.sizeGuide, product.size_guide_id, product.notes,
    (maxOrder?.max ?? 0) + 1
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
      shipping = ?, sizeGuide = ?, size_guide_id = ?, notes = ?
    WHERE id = ?
  `)
  .bind(
    product.collection_id, product.product_name, product.product_slug,
    product.category, product.status, product.description,
    product.shipping, product.sizeGuide, product.size_guide_id, product.notes,
    product.id
  )
  .run();
}

/**
 * Batch-applies a new display order within one collection — called from
 * the admin drag-to-reorder UI. Same shape/pattern as
 * updateCollectionSortOrders / updateCollectionPhotoSortOrders.
 */
export async function updateProductSortOrders(
  order: { id: number; sort_order: number }[]
): Promise<void> {
  const db = await getDB();

  const stmt = db.prepare(`UPDATE products SET sort_order = ? WHERE id = ?`);
  const batch = order.map((item) => stmt.bind(item.sort_order, item.id));

  if (batch.length > 0) {
    await db.batch(batch);
  }
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
