export const dynamic = "force-dynamic";

import { getProductBySlug } from "@/lib/db/products";
import { getInventory } from "@/lib/db/inventory";
import { getAllImagesForProduct } from "@/lib/db/images";
import { buildProductOptions } from "@/lib/productOptions";
import ProductOptions from "@/components/ProductOptions";
import { notFound } from "next/navigation";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) return { title: "Product not found" };

  return {
    title: product.product_name,
    description: product.description ?? undefined,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) return notFound();

  const inventory: any[] = await getInventory(slug);
  const images: any[] = await getAllImagesForProduct(slug);
  const options = buildProductOptions(inventory);

  return (
    <main className="max-w-5xl mx-auto p-10">

      <h1 className="text-4xl font-bold">
        {product.product_name}
      </h1>

      <p className="mt-2 text-gray-500">
        {product.category}
      </p>

      <div className="mt-10">

        <ProductOptions
          options={options}
          variants={inventory}
          images={images}
        />

      </div>

    </main>
  );
}