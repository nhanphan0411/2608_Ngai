export const dynamic = "force-dynamic";

import { getCategoryBySlug } from "@/lib/categories";
import { getProductsFiltered, PRODUCTS_PAGE_SIZE, type ProductSort } from "@/lib/db/products";
import { buildProductCards } from "@/lib/db/productCards";
import { getActiveCollections, getCollectionBySlug } from "@/lib/db/collections";
import ProductGrid from "@/components/ProductGrid";
import { notFound } from "next/navigation";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  return { title: category?.name ?? "Category not found" };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sort?: string; collection?: string }>;
}) {
  const { slug } = await params;
  const { page: pageParam, sort: sortParam, collection: collectionSlug } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const sort: ProductSort = sortParam === "name" ? "name" : "feature";

  const category = getCategoryBySlug(slug);
  if (!category) return notFound();

  const [collection, activeCollections] = await Promise.all([
    collectionSlug ? getCollectionBySlug(collectionSlug) : null,
    getActiveCollections(),
  ]);

  const { products, total } = await getProductsFiltered({
    collectionId: collection?.id,
    categoryName: category.name,
    sort,
    page,
  });

  const cards = await buildProductCards(products);

  return (
    <main className="border-b border-black">
      <ProductGrid
        cards={cards}
        emptyMessage="No products in this category."
        currentPage={page}
        totalItems={total}
        pageSize={PRODUCTS_PAGE_SIZE}
        basePath={`/categories/${slug}`}
        sort={sort}
        collectionOptions={activeCollections.map((c) => ({
          slug: c.collection_slug,
          name: c.collection_name,
        }))}
        currentCollection={collection?.collection_slug}
      />
    </main>
  );
}
