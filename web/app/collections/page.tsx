export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import { getFirstCollection } from "@/lib/db/collections";

export default async function AllCollectionsPage() {
  const first = await getFirstCollection();

  if (!first) return notFound();

  redirect(`/collections/${first.collection_slug}`);
}
