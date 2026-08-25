import ProductCard from "@/components/ProductCard";
import Pagination from "@/components/Pagination";
import ProductGridControls, { type FilterOption } from "@/components/ProductGridControls";
import type { ProductCardData } from "@/lib/db/productCards";

export default function ProductGrid({
  cards,
  emptyMessage = "No products found.",
  currentPage,
  totalItems,
  pageSize,
  basePath,
  sort = "feature",
  collectionOptions,
  currentCollection,
  categoryOptions,
  currentCategory,
}: {
  cards: ProductCardData[];
  emptyMessage?: string;
  currentPage: number;
  totalItems: number;
  pageSize: number;
  basePath: string;
  sort?: "feature" | "name";
  collectionOptions?: FilterOption[];
  currentCollection?: string;
  categoryOptions?: FilterOption[];
  currentCategory?: string;
}) {
  const extraParams = {
    sort: sort !== "feature" ? sort : undefined,
    collection: currentCollection || undefined,
    category: currentCategory || undefined,
  };

  const hasControls =
    (collectionOptions && collectionOptions.length > 0) ||
    (categoryOptions && categoryOptions.length > 0);

  return (
    <>
      {hasControls && (
        <ProductGridControls
          basePath={basePath}
          sort={sort}
          collectionOptions={collectionOptions}
          currentCollection={currentCollection}
          categoryOptions={categoryOptions}
          currentCategory={currentCategory}
        />
      )}

      {cards.length === 0 ? (
        <div className="">
          <p className="text-sm text-gray-400 text-center py-4">
            {emptyMessage}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3">
          {cards.map(({ product, variants, images }, i) => (
            <div
              key={product.product_slug}
              className="
                border-b border-r border-black
                [&:nth-child(2n)]:border-r-0
                [&:nth-last-child(-n+2)]:border-b-0

                md:[&:nth-child(2n)]:border-r
                md:[&:nth-child(3n)]:border-r-0
                md:[&:nth-last-child(-n+2)]:border-b
                md:[&:nth-last-child(-n+3)]:border-b-0
              "
            >
              <ProductCard
                product={product}
                variants={variants}
                images={images}
                priority={i < 3}
              />
            </div>
          ))}
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        pageSize={pageSize}
        basePath={basePath}
        extraParams={extraParams}
      />
    </>
  );
}
