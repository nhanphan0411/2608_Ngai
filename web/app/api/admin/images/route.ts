import { NextRequest, NextResponse } from "next/server";
import { getImages, getAllImagesForProduct, insertImage } from "@/lib/db/images";
import { uploadImage } from "@/engine/cloudfare/r2";
import { validateImageFile } from "@/lib/imageValidation";

export async function GET(req: NextRequest) {
  const variantGroupId = req.nextUrl.searchParams.get("variant_group_id");
  const productId = req.nextUrl.searchParams.get("product_id");

  if (variantGroupId) {
    return NextResponse.json(await getImages(Number(variantGroupId)));
  }

  if (productId) {
    return NextResponse.json(await getAllImagesForProduct(Number(productId)));
  }

  return NextResponse.json(
    { error: "variant_group_id or product_id required" },
    { status: 400 }
  );
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const files = formData.getAll("file") as File[];
  const variantGroupId = Number(formData.get("variant_group_id"));

  // product_slug/value1/value2 are only used to build a readable R2 folder
  // path — they are NOT used for any DB lookup. The real relationship is
  // variant_group_id above.
  const productSlug = (formData.get("product_slug") as string | null) ?? "product";
  const value1 = (formData.get("value1") as string | null) ?? "variant";
  const value2 = (formData.get("value2") as string | null) || null;

  if (files.length === 0 || !variantGroupId) {
    return NextResponse.json(
      { error: "file(s) and variant_group_id required" },
      { status: 400 }
    );
  }

  const errors: string[] = [];
  for (const file of files) {
    const result = validateImageFile(file);
    if (!result.valid) errors.push(result.error!);
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }

  const uploaded: { id: number; url: string; r2_key: string }[] = [];

  for (const file of files) {
    const { ext } = validateImageFile(file);
    const buffer = Buffer.from(await file.arrayBuffer());
    const keyPath = value2
      ? `Products/${productSlug}/${value1}/${value2}`
      : `Products/${productSlug}/${value1}`;
    const r2Key = `${keyPath}/${crypto.randomUUID()}.${ext}`;

    const url = await uploadImage(r2Key, buffer, file.type);
    const id = await insertImage(
      variantGroupId,
      { thumb: r2Key, mid: r2Key, large: r2Key },
      { thumb: url, mid: url, large: url }
    );

    uploaded.push({ id, url, r2_key: r2Key });
  }

  return NextResponse.json(uploaded);
}