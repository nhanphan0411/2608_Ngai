export const dynamic = "force-dynamic";

import { getAllProductsPaginated, PRODUCTS_PAGE_SIZE } from "@/lib/db/products";
import { getInventory } from "@/lib/db/inventory";
import { getAllImagesForProduct } from "@/lib/db/images";
import ProductCard from "@/components/ProductCard";
import Pagination from "@/components/Pagination";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const { products, total } = await getAllProductsPaginated(page);

  const cards = await Promise.all(
    products.map(async (product) => ({
      product,
      variants: await getInventory(product.product_slug),
      images: await getAllImagesForProduct(product.product_slug),
    }))
  );

  return (
    <main className="max-w-6xl mx-auto p-10">
      <h1 className="text-3xl font-bold mb-8">All Products</h1>

      {cards.length === 0 ? (
        <p className="text-gray-400 text-sm">No products found.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {cards.map(({ product, variants, images }) => (
            <ProductCard
              key={product.product_slug}
              product={product}
              variants={variants}
              images={images}
            />
          ))}
        </div>
      )}

      <Pagination
        currentPage={page}
        totalItems={total}
        pageSize={PRODUCTS_PAGE_SIZE}
        basePath="/products"
      />
    </main>
  );
}