export const dynamic = "force-dynamic";

import { getProductsFiltered, PRODUCTS_PAGE_SIZE, type ProductSort } from "@/lib/db/products";
import { buildProductCards } from "@/lib/db/productCards";
import { getActiveCollections, getCollectionBySlug } from "@/lib/db/collections";
import { CATEGORIES, getCategoryBySlug } from "@/lib/categories";
import ProductGrid from "@/components/ProductGrid";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string; collection?: string; category?: string }>;
}) {
  const {
    page: pageParam,
    sort: sortParam,
    collection: collectionSlug,
    category: categorySlug,
  } = await searchParams;

  const page = Math.max(1, Number(pageParam) || 1);
  const sort: ProductSort = sortParam === "name" ? "name" : "feature";

  const [collection, category, activeCollections] = await Promise.all([
    collectionSlug ? getCollectionBySlug(collectionSlug) : null,
    categorySlug ? getCategoryBySlug(categorySlug) : undefined,
    getActiveCollections(),
  ]);

  const { products, total } = await getProductsFiltered({
    collectionId: collection?.id,
    categoryName: category?.name,
    sort,
    page,
  });

  const cards = await buildProductCards(products);

  return (
    <main className="border-b border-black">
      <ProductGrid
        cards={cards}
        currentPage={page}
        totalItems={total}
        pageSize={PRODUCTS_PAGE_SIZE}
        basePath="/products"
        sort={sort}
        collectionOptions={activeCollections.map((c) => ({
          slug: c.collection_slug,
          name: c.collection_name,
        }))}
        currentCollection={collection?.collection_slug}
        categoryOptions={CATEGORIES.map((c) => ({ slug: c.slug, name: c.name }))}
        currentCategory={category?.slug}
      />
    </main>
  );
}
