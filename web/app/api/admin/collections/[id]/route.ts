import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/d1";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDB();

  const { id } = await params;

  const body = await req.json() as {
    collection_name: string;
    collection_slug: string;
    description: string;
    status: string;
  };

  await db.prepare(`
    UPDATE collections
    SET
      collection_name = ?,
      collection_slug = ?,
      description = ?,
      status = ?
    WHERE id = ?
  `)
  .bind(
    body.collection_name,
    body.collection_slug,
    body.description,
    body.status,
    Number(id)
  )
  .run();

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDB();

  const { id } = await params;

  await db.prepare(`
    DELETE FROM collections
    WHERE id = ?
  `)
  .bind(Number(id))
  .run();

  return NextResponse.json({ success: true });
}