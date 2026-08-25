import { getDB } from "@/lib/d1";
import type { Product } from "@/types/db";

export type ProductCardData = {
  product: Product;
  variants: any[];
  images: any[];
};

/**
 * Takes a plain list of products and attaches each one's variants and
 * images — the exact assembly step every product grid page needs, in
 * one place instead of copy-pasted across products/collections/categories.
 *
 * Batches both lookups into one query each (WHERE ... IN (...)) instead of
 * querying per product — a page of 18 products used to fire up to 36 extra
 * D1 round trips here alone.
 */
export async function buildProductCards(products: Product[]): Promise<ProductCardData[]> {
  if (products.length === 0) return [];

  const db = await getDB();
  const ids = products.map((p) => p.id);
  const placeholders = ids.map(() => "?").join(",");

  const [{ results: allVariants }, { results: allImages }] = await Promise.all([
    db
      .prepare(`
        SELECT * FROM inventory
        WHERE product_id IN (${placeholders}) AND status = 'Active'
        ORDER BY product_id, id
      `)
      .bind(...ids)
      .all(),
    db
      .prepare(`
        SELECT images.*, variant_groups.product_id AS __product_id
        FROM images
        JOIN variant_groups ON variant_groups.id = images.variant_group_id
        WHERE variant_groups.product_id IN (${placeholders})
        ORDER BY images.sort_order ASC, images.id ASC
      `)
      .bind(...ids)
      .all(),
  ]);

  const variantsByProduct = new Map<number, any[]>();
  for (const row of allVariants as any[]) {
    const list = variantsByProduct.get(row.product_id) ?? [];
    list.push(row);
    variantsByProduct.set(row.product_id, list);
  }

  const imagesByProduct = new Map<number, any[]>();
  for (const row of allImages as any[]) {
    const { __product_id, ...image } = row;
    const list = imagesByProduct.get(__product_id) ?? [];
    list.push(image);
    imagesByProduct.set(__product_id, list);
  }

  return products.map((product) => ({
    product,
    variants: variantsByProduct.get(product.id) ?? [],
    images: imagesByProduct.get(product.id) ?? [],
  }));
}
