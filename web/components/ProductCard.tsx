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
      <div className="border rounded overflow-hidden p-3">
        <p className="font-medium">{product.product_name}</p>
        <p className="text-xs text-gray-400 mt-1">No variants configured</p>
      </div>
    );
  }

  const [, forceRender] = useState(0);
  const [currency, setCurrencyState] = useState<"VND" | "USD">("VND");

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

  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const first = variants[0];
    const initial: Record<string, string> = {};

    if (first.variant1) initial[first.variant1] = first.value1;
    if (first.variant2) initial[first.variant2] = first.value2;
    if (first.variant3) initial[first.variant3] = first.value3;

    return initial;
  });

  const [imgIndex, setImgIndex] = useState(0);

  const selectedVariant = variants.find((variant) =>
    Object.entries(selected).every(
      ([name, value]) =>
        (variant.variant1 === name && variant.value1 === value) ||
        (variant.variant2 === name && variant.value2 === value) ||
        (variant.variant3 === name && variant.value3 === value)
    )
  );

  const activeValue1 = variants[0]?.variant1
    ? selected[variants[0].variant1]
    : undefined;

  const activeValue2 = variants[0]?.variant2
    ? selected[variants[0].variant2]
    : undefined;

  const galleryImages = images.filter((img) => {
    if (img.value1 !== activeValue1) return false;
    if (img.value2 && img.value2 !== activeValue2) return false;
    return true;
  });

  const currentImage = galleryImages[imgIndex] ?? galleryImages[0];

  function selectOption(name: string, value: string) {
    setSelected((prev) => ({
      ...prev,
      [name]: value,
    }));

    setImgIndex(0);
  }

  function nextImage(e: React.MouseEvent) {
    e.preventDefault();

    if (galleryImages.length === 0) return;

    setImgIndex((i) => (i + 1) % galleryImages.length);
  }

  function prevImage(e: React.MouseEvent) {
    e.preventDefault();

    if (galleryImages.length === 0) return;

    setImgIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length);
  }

  return (
    <div className="border rounded overflow-hidden">
      <div className="aspect-square bg-gray-100 relative">
        {currentImage ? (
          <Image
            src={currentImage.url_thumb}
            alt={product.product_name}
            fill
            sizes="(max-width:768px) 50vw, 33vw"
            className="object-cover"
            priority={priority}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            No image
          </div>
        )}

        {galleryImages.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/70 rounded-full w-7 h-7"
            >
              ‹
            </button>

            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/70 rounded-full w-7 h-7"
            >
              ›
            </button>
          </>
        )}
      </div>

      <div className="p-3 space-y-2">
        <Link href={`/products/${product.product_slug}`}>
          <h2 className="font-medium hover:underline">
            {product.product_name}
          </h2>
        </Link>

        {/* {options.map((option) => (
          <div
            key={option.name}
            className="flex gap-1 flex-wrap"
          >
            {option.values.map((value) => {
              const active = selected[option.name] === value;

              const candidate = {
                ...selected,
                [option.name]: value,
              };

              const exists = variants.some((variant) =>
                Object.entries(candidate).every(
                  ([name, val]) =>
                    (variant.variant1 === name && variant.value1 === val) ||
                    (variant.variant2 === name && variant.value2 === val) ||
                    (variant.variant3 === name && variant.value3 === val)
                )
              );

              return (
                <button
                  key={value}
                  disabled={!exists}
                  onClick={() => selectOption(option.name, value)}
                  className={`text-xs border rounded px-2 py-1 transition
                    ${active
                      ? "bg-black text-white border-black"
                      : exists
                        ? "hover:bg-gray-100"
                        : "opacity-30 line-through cursor-not-allowed"
                    }`}
                >
                  {value}
                </button>
              );
            })}
          </div>
        ))} */}

        {selectedVariant ? (
          <>
            <p className="text-sm font-medium">
              {formatPrice(
                selectedVariant.priceVND,
                selectedVariant.priceUSD,
                currency
              )}
            </p>

            <button
              className="w-full border rounded px-3 py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={selectedVariant.stock === 0}
              onClick={() => {
                addToCart(selectedVariant.id);
                showToast("Added to cart");
              }}
            >
              {selectedVariant.stock === 0
                ? "Out of Stock"
                : "Add to Cart"}
            </button>
          </>
        ) : (
          <p className="text-xs text-gray-400">
            Select options
          </p>
        )}
      </div>
    </div>
  );
}