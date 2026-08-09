import { NextRequest, NextResponse } from "next/server";
import {
  getImages,
  insertImage,
  getImageById,
  deleteImageRow,
  updateSortOrders,
} from "@/lib/db/images";
import { uploadImage } from "@/engine/cloudfare/r2";
import { validateImageFile } from "@/lib/imageValidation";

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const productSlug = formData.get("product_slug") as string;
  const value1 = formData.get("value1") as string;
  const value2 = (formData.get("value2") as string | null) || null;
  const deleteIds: number[] = JSON.parse(formData.get("deleteIds") as string);
  const order: any[] = JSON.parse(formData.get("order") as string);

  if (!productSlug || !value1) {
    return NextResponse.json(
      { error: "product_slug and value1 required" },
      { status: 400 }
    );
  }

  const newCount = order.filter((o) => o.type === "new").length;

  const triplets: { thumb: File; mid: File; large: File }[] = [];
  const validationErrors: string[] = [];

  for (let i = 0; i < newCount; i++) {
    const thumb = formData.get(`new_thumb_${i}`) as File | null;
    const mid = formData.get(`new_mid_${i}`) as File | null;
    const large = formData.get(`new_large_${i}`) as File | null;

    if (!thumb || !mid || !large) {
      validationErrors.push(`Image ${i + 1}: missing a processed size — try re-adding it.`);
      continue;
    }

    for (const f of [thumb, mid, large]) {
      const result = validateImageFile(f);
      if (!result.valid) validationErrors.push(result.error!);
    }

    triplets[i] = { thumb, mid, large };
  }

  if (validationErrors.length > 0) {
    return NextResponse.json({ error: validationErrors.join(" ") }, { status: 400 });
  }

  const failures: string[] = [];

  // 1. Deletes
  for (const id of deleteIds) {
    try {
      const image = await getImageById(id);
      if (image) await deleteImageRow(id);
    } catch (err) {
      console.error(`Failed to delete image ${id}:`, err);
      failures.push(`Could not delete image #${id}`);
    }
  }

  // 2. Uploads — 3 objects per new image
  const fileIndexToId: Record<number, number> = {};

  for (let i = 0; i < triplets.length; i++) {
    const { thumb, mid, large } = triplets[i];

    try {
      const base = value2
        ? `Products/${productSlug}/${value1}/${value2}`
        : `Products/${productSlug}/${value1}`;
      const uid = crypto.randomUUID();

      const keyThumb = `${base}/${uid}-thumb.webp`;
      const keyMid = `${base}/${uid}-mid.webp`;
      const keyLarge = `${base}/${uid}-large.webp`;

      const [urlThumb, urlMid, urlLarge] = await Promise.all([
        uploadImage(keyThumb, Buffer.from(await thumb.arrayBuffer()), "image/webp"),
        uploadImage(keyMid, Buffer.from(await mid.arrayBuffer()), "image/webp"),
        uploadImage(keyLarge, Buffer.from(await large.arrayBuffer()), "image/webp"),
      ]);

      const id = await insertImage(
        productSlug, value1, value2,
        { thumb: keyThumb, mid: keyMid, large: keyLarge },
        { thumb: urlThumb, mid: urlMid, large: urlLarge }
      );

      fileIndexToId[i] = id;
    } catch (err) {
      console.error(`Failed to upload image ${i}:`, err);
      failures.push(`Could not upload image ${i + 1}`);
    }
  }

  // 3. Final sort order
  const finalOrder = order
    .map((entry, index) => ({
      id: entry.type === "existing" ? entry.id : fileIndexToId[entry.fileIndex],
      sort_order: index,
    }))
    .filter((entry) => entry.id !== undefined);

  await updateSortOrders(finalOrder);

  const images = await getImages(productSlug, value1, value2 ?? undefined);

  return NextResponse.json({
    images,
    failures: failures.length > 0 ? failures : undefined,
  });
}