import { NextRequest, NextResponse } from "next/server";
import {
  getCollectionPhotos,
  insertCollectionPhoto,
  getCollectionPhotoById,
  deleteCollectionPhotoRow,
  updateCollectionPhotoSortOrders,
} from "@/lib/db/collectionPhotos";
import { uploadImage } from "@/engine/cloudfare/r2";
import { validateImageFile } from "@/lib/imageValidation";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const collectionId = Number(formData.get("collection_id"));
  const collectionSlug = formData.get("collection_slug") as string;
  const deleteIds: number[] = JSON.parse(formData.get("deleteIds") as string);
  const order: any[] = JSON.parse(formData.get("order") as string);

  if (!collectionId || !collectionSlug) {
    return NextResponse.json(
      { error: "collection_id and collection_slug required" },
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
      validationErrors.push(`Photo ${i + 1}: missing a processed size — try re-adding it.`);
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
      const photo = await getCollectionPhotoById(id);
      if (photo) await deleteCollectionPhotoRow(id);
    } catch (err) {
      console.error(`Failed to delete collection photo ${id}:`, err);
      failures.push(`Could not delete photo #${id}`);
    }
  }

  // 2. Uploads — 3 objects per new photo, rooted under Collections/{slug}
  const fileIndexToId: Record<number, number> = {};

  for (let i = 0; i < triplets.length; i++) {
    const { thumb, mid, large } = triplets[i];

    try {
      const base = `Collections/${collectionSlug}`;
      const uid = crypto.randomUUID();

      const keyThumb = `${base}/${uid}-thumb.webp`;
      const keyMid = `${base}/${uid}-mid.webp`;
      const keyLarge = `${base}/${uid}-large.webp`;

      const [urlThumb, urlMid, urlLarge] = await Promise.all([
        uploadImage(keyThumb, Buffer.from(await thumb.arrayBuffer()), "image/webp"),
        uploadImage(keyMid, Buffer.from(await mid.arrayBuffer()), "image/webp"),
        uploadImage(keyLarge, Buffer.from(await large.arrayBuffer()), "image/webp"),
      ]);

      const id = await insertCollectionPhoto(
        collectionId,
        { thumb: keyThumb, mid: keyMid, large: keyLarge },
        { thumb: urlThumb, mid: urlMid, large: urlLarge }
      );

      fileIndexToId[i] = id;
    } catch (err) {
      console.error(`Failed to upload collection photo ${i}:`, err);
      failures.push(`Could not upload photo ${i + 1}`);
    }
  }

  // 3. Final sort order
  const finalOrder = order
    .map((entry, index) => ({
      id: entry.type === "existing" ? entry.id : fileIndexToId[entry.fileIndex],
      sort_order: index,
    }))
    .filter((entry) => entry.id !== undefined);

  await updateCollectionPhotoSortOrders(finalOrder);

  const photos = await getCollectionPhotos(collectionId);

  return NextResponse.json({
    photos,
    failures: failures.length > 0 ? failures : undefined,
  });
}