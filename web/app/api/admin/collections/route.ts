
import { NextRequest, NextResponse } from "next/server";

import {
  getAllCollectionsAdmin,
  createCollection,
  updateCollection,
  deleteCollection,
} from "@/lib/db/collections";

import type { Collection } from "@/types/db";

export async function GET() {
  try {
    return NextResponse.json(await getAllCollectionsAdmin());
  } catch (err) {
    console.error("GET /api/admin/collections failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Omit<Collection,"id">;

    await createCollection(body);

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    console.error("POST /api/admin/collections failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json() as Collection;

    await updateCollection(body);

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    console.error("PUT /api/admin/collections failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json() as {
      id:number;
    };

    await deleteCollection(id);

    return NextResponse.json({
      success:true,
    });
  } catch (err) {
    console.error("DELETE /api/admin/collections failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}