import { NextRequest, NextResponse } from "next/server";

import {
  getAllCollectionsAdmin,
  createCollection,
  updateCollection,
  deleteCollection,
} from "@/lib/db/collections";

import type { Collection } from "@/types/db";

export async function GET() {
  return NextResponse.json(
    await getAllCollectionsAdmin()
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Omit<Collection,"id">;

  await createCollection(body);

  return NextResponse.json({
    success: true,
  });
}

export async function PUT(req: NextRequest) {
  const body = await req.json() as Collection;

  await updateCollection(body);

  return NextResponse.json({
    success: true,
  });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json() as {
    id:number;
  };

  await deleteCollection(id);

  return NextResponse.json({
    success:true,
  });
}