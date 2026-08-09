import { CATEGORIES } from "@/lib/categories";
import Link from "next/link";

export default function CategoriesPage() {
  return (
    <main className="max-w-4xl mx-auto p-10">
      <h1 className="text-3xl font-bold mb-8">Categories</h1>

      <div className="space-y-4">
        {CATEGORIES.map((cat) => (
          <Link
            href={`/categories/${cat.slug}`}
            className="block border rounded-lg p-5"
            key={cat.slug}
          >
            <h2 className="font-bold text-xl">{cat.name}</h2>
          </Link>
        ))}
      </div>
    </main>
  );
}