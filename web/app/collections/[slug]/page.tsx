export const dynamic = "force-dynamic";

import { getProductsByCollectionPaginated, PRODUCTS_PAGE_SIZE } from "@/lib/db/products";
import { getCollectionBySlug } from "@/lib/db/collections";
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
  return { title: slug };
}

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const collection = await getCollectionBySlug(slug);
  if (!collection) return notFound();

  const { products, total } = await getProductsByCollectionPaginated(collection.id, page);
  const cards = await buildProductCards(products);

  return (
    <main className="max-w-5xl mx-auto p-10">
      <h1 className="text-3xl font-bold mb-8">{collection.collection_name}</h1>

      <ProductGrid
        cards={cards}
        emptyMessage="No products in this collection."
        currentPage={page}
        totalItems={total}
        pageSize={PRODUCTS_PAGE_SIZE}
        basePath={`/collections/${slug}`}
      />
    </main>
  );
}