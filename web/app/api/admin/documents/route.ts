import { NextRequest, NextResponse } from "next/server";

import {
  getAllDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
} from "@/lib/db/documents";

import type { Document } from "@/types/db";

// Reserved so a document slug can never shadow a real top-level route
// (the /{slug} catch-all only wins when nothing else matches, but this
// stops an admin from creating a document that would be unreachable).
const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "about",
  "cart",
  "categories",
  "checkout",
  "collections",
  "coming-soon",
  "order",
  "products",
  "favicon.ico",
]);

export async function GET() {
  try {
    return NextResponse.json(await getAllDocuments());
  } catch (err) {
    console.error("GET /api/admin/documents failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Pick<Document, "name" | "slug" | "content_markdown">;

    const error = validate(body);
    if (error) return NextResponse.json({ error }, { status: 400 });

    await createDocument(body);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/admin/documents failed:", err);
    return NextResponse.json(
      { error: friendlyError(err) },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as Document;

    const error = validate(body);
    if (error) return NextResponse.json({ error }, { status: 400 });

    await updateDocument(body);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PUT /api/admin/documents failed:", err);
    return NextResponse.json(
      { error: friendlyError(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = (await req.json()) as { id: number };

    await deleteDocument(id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/admin/documents failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

function validate(body: { name?: string; slug?: string }): string | null {
  if (!body.name?.trim()) return "Name is required.";
  if (!body.slug?.trim()) return "Slug is required.";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(body.slug)) {
    return "Slug must be lowercase letters, numbers, and hyphens only (e.g. terms-of-service).";
  }
  if (RESERVED_SLUGS.has(body.slug)) {
    return `"${body.slug}" is a reserved route and can't be used as a document slug.`;
  }
  return null;
}

function friendlyError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("UNIQUE constraint failed")) {
    return "That slug is already used by another document.";
  }
  return message;
}