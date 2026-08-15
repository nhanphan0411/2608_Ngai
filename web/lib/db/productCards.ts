import { getInventory } from "@/lib/db/inventory";
import { getAllImagesForProduct } from "@/lib/db/images";
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
 */
export async function buildProductCards(products: Product[]): Promise<ProductCardData[]> {
  return Promise.all(
    products.map(async (product) => ({
      product,
      variants: await getInventory(product.id),
      images: await getAllImagesForProduct(product.id),
    }))
  );
}