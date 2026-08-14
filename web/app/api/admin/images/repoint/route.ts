import { NextRequest, NextResponse } from "next/server";
import { renameVariantGroup } from "@/lib/db/inventory";

/**
 * Renames a variant group (its value1/value2) in place, by id.
 *
 * This used to "repoint" images from an old (product_slug, value1, value2)
 * key to a new one, because images stored that text directly. Now images
 * and inventory rows both reference variant_group_id, so a rename is just
 * one UPDATE on the variant_groups row — nothing else needs to move.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    id: number;
    value1: string;
    value2: string | null;
  };

  if (!body.id || !body.value1) {
    return NextResponse.json(
      { error: "id and value1 required" },
      { status: 400 }
    );
  }

  await renameVariantGroup(body.id, body.value1, body.value2 ?? null);

  return NextResponse.json({ success: true });
}