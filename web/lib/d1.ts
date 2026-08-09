import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getDB(): Promise<D1Database> {
  const { env } = await getCloudflareContext({
    async: true,
  });

  return (env as unknown as Cloudflare.Env).DB;
}

export async function queryAll<T>(
  stmt: D1PreparedStatement
): Promise<T[]> {
  const { results } = await stmt.all();

  return results as unknown as T[];
}

export async function queryFirst<T>(
  stmt: D1PreparedStatement
): Promise<T | null> {
  const result = await stmt.first();
  return result as T | null;
}