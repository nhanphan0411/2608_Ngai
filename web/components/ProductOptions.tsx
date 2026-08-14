"use client";

import { useState, useEffect } from "react";
import { addToCart } from "@/lib/cart";
import { formatPrice, getCurrency } from "@/lib/currency";
import Image from "next/image";

export default function ProductOptions({
    product,
    options,
    variants,
    images,
}: {
    product: { product_name: string; category: string | null; description?: string | null };
    options: {
        name: string;
        values: string[];
    }[];
    variants: any[];
    images: any[];
}) {
    console.log("ProductOptions received product:", product);
    const [selected, setSelected] = useState<Record<string, string>>(() => {
        const first = variants[0];

        const initial: Record<string, string> = {};

        if (first.variant1) initial[first.variant1] = first.value1;
        if (first.variant2) initial[first.variant2] = first.value2;
        if (first.variant3) initial[first.variant3] = first.value3;

        return initial;
    });

    // Re-render when currency changes
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

    function matchesVariant(variant: any, name: string, value: string) {
        return (
            (variant.variant1 === name && variant.value1 === value) ||
            (variant.variant2 === name && variant.value2 === value) ||
            (variant.variant3 === name && variant.value3 === value)
        );
    }

    const selectedVariant = variants.find((variant) =>
        Object.entries(selected).every(([name, value]) =>
            matchesVariant(variant, name, value)
        )
    );

    function isOptionValueAvailable(
        optionIndex: number,
        optionName: string,
        value: string
    ) {
        const constraints: Record<string, string> = {
            [optionName]: value,
        };

        for (let i = 0; i < optionIndex; i++) {
            const parentName = options[i].name;

            if (selected[parentName] !== undefined) {
                constraints[parentName] = selected[parentName];
            }
        }

        return variants.some((variant) =>
            Object.entries(constraints).every(([name, val]) =>
                matchesVariant(variant, name, val)
            )
        );
    }

    function selectOption(
        changedIndex: number,
        optionName: string,
        value: string
    ) {
        setSelected((prev) => {
            const next = {
                ...prev,
                [optionName]: value,
            };

            for (let i = changedIndex + 1; i < options.length; i++) {
                const layer = options[i];

                const currentValue = next[layer.name];

                const parentConstraints: Record<string, string> = {};

                for (let j = 0; j < i; j++) {
                    const parentName = options[j].name;

                    if (next[parentName] !== undefined) {
                        parentConstraints[parentName] = next[parentName];
                    }
                }

                const stillValid =
                    currentValue &&
                    variants.some((variant) =>
                        Object.entries({
                            ...parentConstraints,
                            [layer.name]: currentValue,
                        }).every(([name, val]) =>
                            matchesVariant(variant, name, val)
                        )
                    );

                if (!stillValid) {
                    const firstAvailable = layer.values.find((v) =>
                        variants.some((variant) =>
                            Object.entries({
                                ...parentConstraints,
                                [layer.name]: v,
                            }).every(([name, val]) =>
                                matchesVariant(variant, name, val)
                            )
                        )
                    );

                    if (firstAvailable) {
                        next[layer.name] = firstAvailable;
                    }
                }
            }

            return next;
        });
    }

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

    // "Size" gets its own slot in the vertical order; every other option
    // (color, material, etc.) is grouped under "variants" near the bottom.
    const sizeOption = options.find((o) => /size/i.test(o.name));
    const otherOptions = options.filter((o) => o !== sizeOption);

    function renderOptionGroup(option: { name: string; values: string[] }) {
        const optionIndex = options.indexOf(option);

        return (
            <div key={option.name}>
                <h2 className="mb-2 text-sm font-bold">{option.name}</h2>

                <div className="flex flex-wrap gap-2">
                    {option.values.map((value) => {
                        const active = selected[option.name] === value;
                        const available = isOptionValueAvailable(
                            optionIndex,
                            option.name,
                            value
                        );

                        return (
                            <button
                                key={value}
                                disabled={!available}
                                onClick={() =>
                                    selectOption(optionIndex, option.name, value)
                                }
                                className={`rounded border px-4 py-2 text-sm ${active
                                        ? "bg-black text-white"
                                        : !available
                                            ? "cursor-not-allowed opacity-30"
                                            : ""
                                    }`}
                            >
                                {value}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="md:flex md:h-[calc(100vh-4rem)] md:min-h-0 md:h-screen">
            {/* Image column — 50vw on desktop, scrolls independently */}
            <div className="md:h-screen md:w-[50vw] md:overflow-y-auto">
                {galleryImages.length > 0 ? (
                    galleryImages.map((img, i) => (
                        <div
                            key={img.id ?? i}
                            className="relative aspect-square w-full bg-gray-100"
                        >
                            <Image
                                src={img.url_large}
                                alt=""
                                fill
                                sizes="(max-width: 768px) 100vw, 50vw"
                                className="object-cover"
                                priority={i === 0}
                            />
                        </div>
                    ))
                ) : (
                    <div className="flex aspect-square w-full items-center justify-center bg-gray-100 text-sm text-gray-400">
                        No image
                    </div>
                )}
            </div>

            {/* Details column — 30vw on desktop, centered content */}
            <div className="flex flex-col justify-center gap-6 px-8 py-10 md:h-screen md:w-[30vw]">
                <p className="text-sm tracking-wide text-gray-500">
                    {product.category}
                </p>

                <h1 className="text-3xl font-bold">{product.product_name}</h1>

                <p className="text-lg">
                    {selectedVariant
                        ? formatPrice(
                            selectedVariant.priceVND,
                            selectedVariant.priceUSD,
                            currency
                        )
                        : "Select options"}
                </p>

                {product.description && (
                    <p className="text-sm text-gray-600">{product.description}</p>
                )}

                <div className="mt-2 w-full">
                    {selectedVariant ? (
                        <>
                            <p className="mb-3 text-xs text-gray-500">
                                {selectedVariant.stock > 0
                                    ? `${selectedVariant.stock} in stock`
                                    : "Out of stock"}
                            </p>

                            <button
                                className="w-full rounded border px-4 py-3 disabled:cursor-not-allowed disabled:opacity-30"
                                disabled={selectedVariant.stock === 0}
                                onClick={() => {
                                    addToCart(selectedVariant.id);
                                    alert("Added to cart");
                                }}
                            >
                                {selectedVariant.stock === 0
                                    ? "Out of Stock"
                                    : "Add to Cart"}
                            </button>
                        </>
                    ) : (
                        <p className="text-sm">Please select all options.</p>
                    )}
                </div>

                {sizeOption && renderOptionGroup(sizeOption)}

                {/* TODO: wire up real shipping data once available */}
                <p className="text-xs text-gray-500">
                    Free shipping · Ships within 2–3 business days
                </p>

                {otherOptions.map((option) => {
                    if (/color/i.test(option.name) && option.values.length === 1) {
                        return null;
                    }

                    return renderOptionGroup(option);
                })}
            </div>
        </div>
    );
}