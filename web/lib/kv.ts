import { getCloudflareContext } from "@opennextjs/cloudflare";

interface KVEnv {
  NEXT_CACHE_WORKERS_KV: KVNamespace;
}

export async function getKV(): Promise<KVNamespace> {
  const { env } = await getCloudflareContext({ async: true });
  return (env as unknown as KVEnv).NEXT_CACHE_WORKERS_KV;
}