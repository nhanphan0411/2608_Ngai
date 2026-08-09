export const dynamic = "force-dynamic";

import { getProductsByCollectionPaginated, PRODUCTS_PAGE_SIZE } from "@/lib/db/products";
import { getInventory } from "@/lib/db/inventory";
import { getAllImagesForProduct } from "@/lib/db/images";
import ProductCard from "@/components/ProductCard";
import Pagination from "@/components/Pagination";

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

    const { products, total } = await getProductsByCollectionPaginated(slug, page);

    const cards = await Promise.all(
        products.map(async (product) => ({
            product,
            variants: await getInventory(product.product_slug),
            images: await getAllImagesForProduct(product.product_slug),
        }))
    );

    return (
        <main className="max-w-5xl mx-auto p-10">
            <h1 className="text-3xl font-bold mb-8">{slug}</h1>

            {cards.length === 0 ? (
              <p className="text-gray-400 text-sm">No products in this collection.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {cards.map(({ product, variants, images }, i) => (
                      <ProductCard
                          key={product.product_slug}
                          product={product}
                          variants={variants}
                          images={images}
                          priority={i < 3}
                      />
                  ))}
              </div>
            )}

            <Pagination
              currentPage={page}
              totalItems={total}
              pageSize={PRODUCTS_PAGE_SIZE}
              basePath={`/collections/${slug}`}
            />
        </main>
    );
}