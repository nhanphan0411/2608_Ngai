import { NextRequest, NextResponse } from "next/server";
import { repointImagesForVariantGroup } from "@/lib/db/images";
import { normalize } from "@/lib/db/inventory";

export async function POST(req: NextRequest) {
  const body = await (req.json()) as any;

  await repointImagesForVariantGroup(
    body.product_slug,
    normalize(body.old_value1) as string,
    normalize(body.old_value2),
    normalize(body.new_value1) as string,
    normalize(body.new_value2)
  );

  return NextResponse.json({ success: true });
}