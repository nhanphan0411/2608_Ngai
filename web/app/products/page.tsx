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
      variants: await getInventory(product.id),
      images: await getAllImagesForProduct(product.id),
    }))
  );
  const columns = 3; // matches md:grid-cols-3
  const minRows = 2; // always show at least 2 rows of grid lines
  const cellCount = Math.max(cards.length, columns * minRows);
  const paddedCount = Math.ceil(cellCount / columns) * columns;
  const placeholders = paddedCount - cards.length;


  return (
    <main className="">
      <div className="grid grid-cols-2 md:grid-cols-3">
        {cards.map(({ product, variants, images }) => (
          <div
            key={product.product_slug}
            className="border-b border-r [&:nth-child(2n)]:border-r-0 md:[&:nth-child(2n)]:border-r md:[&:nth-child(3n)]:border-r-0 [&:nth-last-child(-n+2)]:border-b-0 md:[&:nth-last-child(-n+3)]:border-b-0"
          >
            <ProductCard product={product} variants={variants} images={images} />
          </div>
        ))}

        {Array.from({ length: placeholders }).map((_, i) => (
          <div
            key={`placeholder-${i}`}
            className="border-b border-r [&:nth-child(2n)]:border-r-0 md:[&:nth-child(2n)]:border-r md:[&:nth-child(3n)]:border-r-0 [&:nth-last-child(-n+2)]:border-b-0 md:[&:nth-last-child(-n+3)]:border-b-0"
          />
        ))}
      </div>

      <div className="">
        <Pagination
          currentPage={page}
          totalItems={total}
          pageSize={PRODUCTS_PAGE_SIZE}
          basePath="/products"
        />
      </div>
    </main>
  );
}