import { NextRequest, NextResponse } from "next/server";
import { findOrCreateVariantGroup } from "@/lib/db/inventory";

/**
 * Resolves (or creates) the variant_groups row for a given
 * product_id + value1 + value2 combination, and returns its id.
 *
 * Used by the admin UI when creating a brand-new variant group: it
 * needs a real variant_group_id to attach images to BEFORE any
 * inventory (size) rows exist yet.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    product_id: number;
    value1: string;
    value2: string | null;
  };

  if (!body.product_id || !body.value1) {
    return NextResponse.json(
      { error: "product_id and value1 required" },
      { status: 400 }
    );
  }

  const id = await findOrCreateVariantGroup(
    body.product_id,
    body.value1,
    body.value2 ?? null
  );

  return NextResponse.json({ id });
}