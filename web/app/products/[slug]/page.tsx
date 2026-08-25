export const dynamic = "force-dynamic";

import { getProductBySlug } from "@/lib/db/products";
import { getInventory } from "@/lib/db/inventory";
import { getAllImagesForProduct } from "@/lib/db/images";
import { buildProductOptions } from "@/lib/productOptions";
import { getSizeGuideById } from "@/lib/db/sizeGuides";
import { getCollection } from "@/lib/db/collections";
import ProductDetails from "@/components/ProductDetails";
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

  const [inventory, images, sizeGuide, collection] = await Promise.all([
    getInventory(product.id) as Promise<any[]>,
    getAllImagesForProduct(product.id) as Promise<any[]>,
    product.size_guide_id ? getSizeGuideById(product.size_guide_id) : Promise.resolve(null),
    getCollection(product.collection_id),
  ]);

  const options = buildProductOptions(inventory);

  return (
    <ProductDetails
      product={product}
      collection={collection}
      options={options}
      variants={inventory}
      sizeGuide={sizeGuide}
      images={images}
    />
  );
}