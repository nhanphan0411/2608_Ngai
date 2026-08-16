import { getKV } from "@/lib/kv";

export interface NavItem {
  label: string;
  href: string | null;
  children: { label: string; href: string | null }[];
}

const NAV_KEY = "nav:menu";

export async function getNavTree(): Promise<NavItem[]> {
  const kv = await getKV();
  const raw = await kv.get(NAV_KEY);
  return raw ? (JSON.parse(raw) as NavItem[]) : [];
}

export async function saveNavTree(items: NavItem[]): Promise<void> {
  const kv = await getKV();
  await kv.put(NAV_KEY, JSON.stringify(items));
}