export const dynamic = "force-dynamic";

import { getCollections } from "@/lib/db/collections";
import Link from "next/link";

export default async function AllCollectionsPage() {

  const collections = await getCollections();

  return (
    <main className="max-w-4xl mx-auto p-10">

      <h1 className="text-3xl font-bold mb-8">
        Collections
      </h1>

      <div className="space-y-4">

        {collections.map((collection: any) => (

          <Link
            href={`/collections/${collection.collection_slug}`}
            className="block border rounded-lg p-5"
            key={collection.id}
          >
            <h2 className="font-bold text-xl">
              {collection.collection_name}
            </h2>

            <p>{collection.collection_slug}</p>
          </Link>

        ))}

      </div>

    </main>
  );

}