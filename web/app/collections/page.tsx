export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import { getLatestCollection } from "@/lib/db/collections";

// The bare /collections route isn't a real page — it always sends visitors
// straight to the latest collection page instead of showing an index.
export default async function AllCollectionsPage() {
  const latest = await getLatestCollection();

  if (!latest) return notFound();

  redirect(`/collections/${latest.collection_slug}`);
}