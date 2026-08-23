import { NextRequest, NextResponse } from "next/server";
import { getCollectionPhotos } from "@/lib/db/collectionPhotos";

export async function GET(req: NextRequest) {
  const collectionId = req.nextUrl.searchParams.get("collection_id");

  if (!collectionId) {
    return NextResponse.json({ error: "collection_id required" }, { status: 400 });
  }

  try {
    return NextResponse.json(await getCollectionPhotos(Number(collectionId)));
  } catch (err) {
    console.error("GET /api/admin/collections/photos failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}