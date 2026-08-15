export const dynamic = "force-dynamic";

import { getProductBySlug } from "@/lib/db/products";
import { getInventory } from "@/lib/db/inventory";
import { getAllImagesForProduct } from "@/lib/db/images";
import { buildProductOptions } from "@/lib/productOptions";
import { getSizeGuideById } from "@/lib/db/sizeGuides";
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

  const inventory: any[] = await getInventory(product.id);
  const images: any[] = await getAllImagesForProduct(product.id);
  const options = buildProductOptions(inventory);
  const sizeGuide = product.size_guide_id ? await getSizeGuideById(product.size_guide_id) : null;

  return (
    <ProductDetails
      product={product}
      options={options}
      variants={inventory}
      sizeGuide={sizeGuide}
      images={images}
    />
  );
}