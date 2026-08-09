import { NextRequest, NextResponse } from "next/server";
import { getImages, getAllImagesForProduct, insertImage } from "@/lib/db/images";
import { uploadImage } from "@/engine/cloudfare/r2";
import { validateImageFile } from "@/lib/imageValidation";

export async function GET(req: NextRequest) {
  const productSlug = req.nextUrl.searchParams.get("product_slug");
  const value1 = req.nextUrl.searchParams.get("value1");
  const value2 = req.nextUrl.searchParams.get("value2") || undefined;

  if (!productSlug) {
    return NextResponse.json({ error: "product_slug required" }, { status: 400 });
  }

  if (!value1) {
    return NextResponse.json(await getAllImagesForProduct(productSlug));
  }

  return NextResponse.json(await getImages(productSlug, value1, value2));
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const files = formData.getAll("file") as File[];
  const productSlug = formData.get("product_slug") as string | null;
  const value1 = formData.get("value1") as string | null;
  const value2 = (formData.get("value2") as string | null) || null;

  if (files.length === 0 || !productSlug || !value1) {
    return NextResponse.json(
      { error: "file(s), product_slug, value1 required" },
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
      productSlug,
      value1,
      value2,
      { thumb: r2Key, mid: r2Key, large: r2Key },
      { thumb: url, mid: url, large: url }
    );

    uploaded.push({ id, url, r2_key: r2Key });

  }

  return NextResponse.json(uploaded);
}