import { getDB } from "@/lib/d1";
import { deleteImagesSafe } from "@/engine/cloudfare/r2";

export interface SizeGuide {
  id: number;
  name: string;
  r2_key: string;
  url: string;
  created_at: string;
}

export async function getAllSizeGuides(): Promise<SizeGuide[]> {
  const db = await getDB();
  const { results } = await db
    .prepare(`SELECT * FROM size_guides ORDER BY name`)
    .all();
  return results as unknown as SizeGuide[];
}

export async function getSizeGuideById(id: number): Promise<SizeGuide | null> {
  const db = await getDB();
  return (await db
    .prepare(`SELECT * FROM size_guides WHERE id = ?`)
    .bind(id)
    .first()) as SizeGuide | null;
}

export async function createSizeGuide(name: string, r2Key: string, url: string): Promise<number> {
  const db = await getDB();
  const result = await db
    .prepare(`INSERT INTO size_guides (name, r2_key, url) VALUES (?, ?, ?)`)
    .bind(name, r2Key, url)
    .run();
  return Number(result.meta.last_row_id);
}

export async function deleteSizeGuide(id: number): Promise<void> {
  const db = await getDB();
  const guide = await getSizeGuideById(id);
  if (!guide) return;

  await db.prepare(`DELETE FROM size_guides WHERE id = ?`).bind(id).run();
  await deleteImagesSafe([guide.r2_key]);
}