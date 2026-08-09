import { NextRequest, NextResponse } from "next/server";

import {
  getInventoryAdmin,
  createVariant,
  updateVariant,
  deleteVariant,
} from "@/lib/db/inventory";

import type { Inventory } from "@/types/db";

export async function GET(req: NextRequest) {
  const product = req.nextUrl.searchParams.get("product");

  if (!product) {
    return NextResponse.json({ error: "product required" }, { status: 400 });
  }

  return NextResponse.json(await getInventoryAdmin(product));
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Omit<Inventory, "id">;

  await createVariant(body);

  return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as Inventory;

  await updateVariant(body);

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = (await req.json()) as { id: number };

  await deleteVariant(id);

  return NextResponse.json({ success: true });
}