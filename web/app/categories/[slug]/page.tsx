export const dynamic = "force-dynamic";

import { getCategoryBySlug } from "@/lib/categories";
import { getProductsByCategoryPaginated, PRODUCTS_PAGE_SIZE } from "@/lib/db/products";
import { buildProductCards } from "@/lib/db/productCards";
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
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const category = getCategoryBySlug(slug);
  if (!category) return notFound();

  const { products, total } = await getProductsByCategoryPaginated(category.name, page);
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
      />
    </main>
  );
}