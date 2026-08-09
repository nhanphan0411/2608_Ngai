import { NextRequest, NextResponse } from "next/server";
import { repointImagesForVariantGroup } from "@/lib/db/images";

export async function POST(req: NextRequest) {
  const body = await (req.json()) as any;

  await repointImagesForVariantGroup(
    body.product_slug,
    body.old_value1,
    body.old_value2 ?? null,
    body.new_value1,
    body.new_value2 ?? null
  );

  return NextResponse.json({ success: true });
}