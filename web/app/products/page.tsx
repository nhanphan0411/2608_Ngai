export const dynamic = "force-dynamic";

import { getAllProductsPaginated, PRODUCTS_PAGE_SIZE } from "@/lib/db/products";
import { buildProductCards } from "@/lib/db/productCards";
import ProductGrid from "@/components/ProductGrid";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const { products, total } = await getAllProductsPaginated(page);
  const cards = await buildProductCards(products);

  return (
    <main className="border-b border-black">
      <ProductGrid
        cards={cards}
        currentPage={page}
        totalItems={total}
        pageSize={PRODUCTS_PAGE_SIZE}
        basePath="/products"
      />
    </main>
  );
}