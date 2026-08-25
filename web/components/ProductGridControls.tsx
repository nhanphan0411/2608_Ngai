"use client";

import { useRouter } from "next/navigation";

export type FilterOption = { slug: string; name: string };

// Sort/filter bar for ProductGrid. All three are independent, combinable
// query params on the current listing route (?sort=&collection=&category=)
// — changing one preserves the others and resets pagination to page 1.
// Collection/category dropdowns are omitted by the parent when the page's
// own route already fixes that dimension (e.g. no Collection filter on
// /collections/[slug], which already has its own collection switcher).
export default function ProductGridControls({
  basePath,
  sort,
  collectionOptions,
  currentCollection,
  categoryOptions,
  currentCategory,
}: {
  basePath: string;
  sort: "feature" | "name";
  collectionOptions?: FilterOption[];
  currentCollection?: string;
  categoryOptions?: FilterOption[];
  currentCategory?: string;
}) {
  const router = useRouter();

  function navigate(next: { sort?: string; collection?: string; category?: string }) {
    const params = new URLSearchParams();

    const nextSort = next.sort ?? sort;
    const nextCollection = next.collection ?? currentCollection;
    const nextCategory = next.category ?? currentCategory;

    if (nextSort && nextSort !== "feature") params.set("sort", nextSort);
    if (nextCollection) params.set("collection", nextCollection);
    if (nextCategory) params.set("category", nextCategory);

    const query = params.toString();
    router.push(query ? `${basePath}?${query}` : basePath);
  }

  const selectClass =
    "py-0.5 text-[10px] uppercase tracking-wide outline-none cursor-pointer";

  return (
    <div className="flex flex-wrap items-center sm:justify-end max-sm:justify-center gap-1.5 border-b border-black py-1.5 sm:px-2">
      {collectionOptions && collectionOptions.length > 0 && (
        <select
          value={currentCollection || ""}
          onChange={(e) => navigate({ collection: e.target.value })}
          className={selectClass}
          aria-label="Filter by collection"
        >
          <option value="">All Collections</option>
          {collectionOptions.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      {categoryOptions && categoryOptions.length > 0 && (
        <select
          value={currentCategory || ""}
          onChange={(e) => navigate({ category: e.target.value })}
          className={selectClass}
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          {categoryOptions.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      <select
        value={sort}
        onChange={(e) => navigate({ sort: e.target.value })}
        className={selectClass}
        aria-label="Sort products"
      >
        <option value="feature">Sort: Feature</option>
        <option value="name">Sort: Name</option>
      </select>
    </div>
  );
}
