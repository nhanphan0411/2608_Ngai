import { NextRequest, NextResponse } from "next/server";

import {
  getAllProductsAdmin,
  getProductsByCollectionAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/lib/db/products";

import type { Product } from "@/types/db";

export async function GET(req: NextRequest) {
  const collection = req.nextUrl.searchParams.get("collection");

  // Existing Image Manager behavior
  if (collection) {
    return NextResponse.json(
      await getProductsByCollectionAdmin(collection)
    );
  }

  // Admin CMS behavior
  return NextResponse.json(
    await getAllProductsAdmin()
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Omit<Product, "id">;

  await createProduct(body);

  return NextResponse.json({
    success: true,
  });
}

export async function PUT(req: NextRequest) {
  const body = await req.json() as Product;

  await updateProduct(body);

  return NextResponse.json({
    success: true,
  });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json() as {
    id: number;
  };

  await deleteProduct(id);

  return NextResponse.json({
    success: true,
  });
}