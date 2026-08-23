export const dynamic = "force-dynamic";

import { getProductsByCollectionPaginated, PRODUCTS_PAGE_SIZE } from "@/lib/db/products";
import { getCollectionBySlug } from "@/lib/db/collections";
import { getCollectionPhotos } from "@/lib/db/collectionPhotos";
import { buildProductCards } from "@/lib/db/productCards";
import ProductGrid from "@/components/ProductGrid";
import CollectionGallery from "@/components/CollectionGallery";
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
  const photos = await getCollectionPhotos(collection.id);

  return (
    <main className="max-w-5xl mx-auto px-30 py-20">
      <h1 className="text-2xl mb-[10vh] w-full flex justify-between">
        {collection.collection_name.split("").map((char, i) => (
          <span key={i}>{char === " " ? "\u00A0" : char}</span>
        ))}
      </h1>

      {photos.length > 0 && (
        <div className="mb-10">
          <CollectionGallery
            photos={photos.map((p) => ({ id: p.id, url: p.url_mid || p.url_large || p.url_thumb }))}
            layoutStyle={collection.layout_style}
          />
        </div>
      )}

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