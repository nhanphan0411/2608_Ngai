import Link from "next/link";

export default function Pagination({
  currentPage,
  totalItems,
  pageSize,
  basePath,
  extraParams = {},
}: {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  basePath: string;
  // Non-page query params (sort, collection, category…) to carry along
  // when moving between pages, so paging doesn't silently drop a filter.
  extraParams?: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalPages <= 1) return null;

  function pageHref(page: number) {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(extraParams)) {
      if (value) params.set(key, value);
    }

    if (page !== 1) params.set("page", String(page));

    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-10">
      <Link
        href={pageHref(Math.max(1, currentPage - 1))}
        aria-disabled={currentPage === 1}
        className={`px-3 py-1.5 rounded border text-sm ${
          currentPage === 1
            ? "pointer-events-none opacity-30"
            : "hover:bg-gray-50"
        }`}
      >
        Previous
      </Link>

      <span className="text-sm text-gray-500 px-2">
        Page {currentPage} of {totalPages}
      </span>

      <Link
        href={pageHref(Math.min(totalPages, currentPage + 1))}
        aria-disabled={currentPage === totalPages}
        className={`px-3 py-1.5 rounded border text-sm ${
          currentPage === totalPages
            ? "pointer-events-none opacity-30"
            : "hover:bg-gray-50"
        }`}
      >
        Next
      </Link>
    </div>
  );
}