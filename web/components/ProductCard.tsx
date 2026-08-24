"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { addToCart } from "@/lib/cart";
import { buildProductOptions } from "@/lib/productOptions";
import { formatPrice } from "@/lib/currency";
import { getCurrency } from "@/lib/currency";
import { showToast } from "@/lib/toast";

export default function ProductCard({
  product,
  variants,
  images,
  priority = false,
}: {
  product: any;
  variants: any[];
  images: any[];
  priority?: boolean;
}) {
  if (variants.length === 0) {
    return (
      <div className="overflow-hidden">
        <div className="aspect-[3/4] bg-gray-100">
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            No image
          </div>
        </div>

        <div className="p-3">
          <p className="font-medium">
            {product.product_name}
          </p>

          <p className="mt-1 text-xs text-gray-400">
            No variants configured
          </p>
        </div>
      </div>
    );
  }

  const [, forceRender] = useState(0);
  const [currency, setCurrencyState] =
    useState<"VND" | "USD">("VND");

  useEffect(() => {
    setCurrencyState(getCurrency());

    const update = () => {
      forceRender((n) => n + 1);
      setCurrencyState(getCurrency());
    };

    window.addEventListener("currency-change", update);

    return () => {
      window.removeEventListener("currency-change", update);
    };
  }, []);

  const options = buildProductOptions(variants);

  const [selected, setSelected] =
    useState<Record<string, string>>(() => {
      const first = variants[0];

      const initial: Record<string, string> = {};

      if (first.variant1) {
        initial[first.variant1] = first.value1;
      }

      if (first.variant2) {
        initial[first.variant2] = first.value2;
      }

      if (first.variant3) {
        initial[first.variant3] = first.value3;
      }

      return initial;
    });

  const [imgIndex, setImgIndex] = useState(0);

  const selectedVariant = variants.find((variant) =>
    Object.entries(selected).every(
      ([name, value]) =>
        (variant.variant1 === name &&
          variant.value1 === value) ||
        (variant.variant2 === name &&
          variant.value2 === value) ||
        (variant.variant3 === name &&
          variant.value3 === value)
    )
  );

  const galleryImages = images.filter(
    (img) =>
      img.variant_group_id ===
      selectedVariant?.variant_group_id
  );

  const currentImage =
    galleryImages[imgIndex] ?? galleryImages[0];

  function selectOption(name: string, value: string) {
    setSelected((prev) => ({
      ...prev,
      [name]: value,
    }));

    setImgIndex(0);
  }

  function nextImage(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (galleryImages.length === 0) return;

    setImgIndex(
      (i) => (i + 1) % galleryImages.length
    );
  }

  function prevImage(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (galleryImages.length === 0) return;

    setImgIndex(
      (i) =>
        (i - 1 + galleryImages.length) %
        galleryImages.length
    );
  }

  return (
    <Link
      href={`/products/${product.product_slug}`}
    >
      <div className="group overflow-hidden">

        {/* ================= IMAGE ================= */}
        <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">

          {currentImage ? (
            <Image
              src={currentImage.url_mid}
              alt={product.product_name}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              className="object-cover"
              priority={priority}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              No image
            </div>
          )}

          {/* ================= IMAGE ARROWS ================= */}
          {galleryImages.length > 1 && (
            <>
              {/* Previous */}
              <button
                type="button"
                onClick={prevImage}
                aria-label="Previous image"
                className="
                absolute left-3 top-1/2
                flex h-8 w-8
                -translate-y-1/2
                items-center justify-center
                cursor-w-resize
                text-2xl
                opacity-0
                transition-opacity
                duration-200
                group-hover:opacity-100
              "
              >
                ‹
              </button>

              {/* Next */}
              <button
                type="button"
                onClick={nextImage}
                aria-label="Next image"
                className="
                absolute right-3 top-1/2
                flex h-8 w-8
                -translate-y-1/2
                items-center justify-center
                cursor-e-resize
                text-2xl
                opacity-0
                transition-opacity
                duration-200
                group-hover:opacity-100
              "
              >
                ›
              </button>
            </>
          )}
        </div>

        {/* ================= PRODUCT INFO ================= */}
        <div className="space-y-0 p-3">
          <h2 className="text-center text-sm uppercase">
            {product.product_name}
          </h2>

          {selectedVariant ? (
            <p className="text-center text-sm">
              {formatPrice(
                selectedVariant.priceVND,
                selectedVariant.priceUSD,
                currency
              )}
            </p>
          ) : (
            <p className="text-center text-xs text-gray-400">
              Select options
            </p>
          )}

        </div>
      </div>
    </Link>
  );
}