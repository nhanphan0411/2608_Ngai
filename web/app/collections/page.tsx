export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import { getLatestCollection } from "@/lib/db/collections";

export default async function AllCollectionsPage() {
  const latest = await getLatestCollection();

  if (!latest) return notFound();

  redirect(`/collections/${latest.collection_slug}`);
}