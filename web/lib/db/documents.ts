import { getDB, queryAll, queryFirst } from "@/lib/d1";
import type { Document } from "@/types/db";

export async function getAllDocuments(): Promise<Document[]> {
  const db = await getDB();

  return queryAll<Document>(
    db.prepare(`SELECT * FROM documents ORDER BY name`)
  );
}

export async function getDocument(id: number): Promise<Document | null> {
  const db = await getDB();

  return queryFirst<Document>(
    db.prepare(`SELECT * FROM documents WHERE id = ? LIMIT 1`).bind(id)
  );
}

/** Public lookup used by the /{slug} page. */
export async function getDocumentBySlug(slug: string): Promise<Document | null> {
  const db = await getDB();

  return queryFirst<Document>(
    db.prepare(`SELECT * FROM documents WHERE slug = ? LIMIT 1`).bind(slug)
  );
}

export async function createDocument(doc: Pick<Document, "name" | "slug" | "content_markdown">) {
  const db = await getDB();

  await db
    .prepare(
      `INSERT INTO documents (name, slug, content_markdown, created_at, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    )
    .bind(doc.name, doc.slug, doc.content_markdown)
    .run();
}

export async function updateDocument(doc: Pick<Document, "id" | "name" | "slug" | "content_markdown">) {
  const db = await getDB();

  await db
    .prepare(
      `UPDATE documents
       SET name = ?, slug = ?, content_markdown = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .bind(doc.name, doc.slug, doc.content_markdown, doc.id)
    .run();
}

export async function deleteDocument(id: number) {
  const db = await getDB();

  await db.prepare(`DELETE FROM documents WHERE id = ?`).bind(id).run();
}