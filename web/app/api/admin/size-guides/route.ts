import { NextRequest, NextResponse } from "next/server";
import { getAllSizeGuides, createSizeGuide, deleteSizeGuide } from "@/lib/db/sizeGuides";
import { uploadImage } from "@/engine/cloudfare/r2";
import { validateImageFile } from "@/lib/imageValidation";

export async function GET() {
  return NextResponse.json(await getAllSizeGuides());
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const name = (formData.get("name") as string | null)?.trim();

  if (!file || !name) {
    return NextResponse.json({ error: "file and name required" }, { status: 400 });
  }

  const result = validateImageFile(file);
  if (!result.valid) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Turn the admin's name into a safe filename: lowercase, spaces/punctuation
  // become dashes, nothing but letters/numbers/dashes survives.
  const safeName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  // A short random suffix prevents two guides named the same thing (e.g.
  // two different "top-guide" uploads) from silently overwriting each
  // other's file in R2 — the DB row is still keyed by name as typed.
  const suffix = crypto.randomUUID().slice(0, 8);
  const r2Key = `Size Guides/${safeName}-${suffix}.${result.ext}`;

  const url = await uploadImage(r2Key, buffer, file.type);

  const id = await createSizeGuide(name, r2Key, url);

  return NextResponse.json({ id, name, r2_key: r2Key, url });
}

export async function DELETE(req: NextRequest) {
  const { id } = (await req.json()) as { id: number };
  await deleteSizeGuide(id);
  return NextResponse.json({ success: true });
}