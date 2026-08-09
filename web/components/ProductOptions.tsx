"use client";

import { useState, useEffect } from "react";
import { addToCart } from "@/lib/cart";
import { formatPrice } from "@/lib/currency";
import { getCurrency } from "@/lib/currency";
import Image from "next/image";

export default function ProductOptions({
    options,
    variants,
    images,
}: {
    options: {
        name: string;
        values: string[];
    }[];
    variants: any[];
    images: any[];
}) {
    const [selected, setSelected] = useState<Record<string, string>>(() => {
        const first = variants[0];

        const initial: Record<string, string> = {};

        if (first.variant1) initial[first.variant1] = first.value1;
        if (first.variant2) initial[first.variant2] = first.value2;
        if (first.variant3) initial[first.variant3] = first.value3;

        return initial;
    });

    const [imgIndex, setImgIndex] = useState(0);

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

        setImgIndex(0);
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

    const currentImage = galleryImages[imgIndex] ?? galleryImages[0];

    return (
        <div className="space-y-6">
            <div className="aspect-square bg-gray-100 relative mb-6">
                {currentImage ? (
                    <Image
                        src={currentImage.url_mid}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className="object-cover"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                        No image
                    </div>
                )}

                {galleryImages.length > 1 && (
                    <>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                setImgIndex(
                                    (i) =>
                                        (i - 1 + galleryImages.length) %
                                        galleryImages.length
                                );
                            }}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/70 rounded-full w-8 h-8"
                        >
                            ‹
                        </button>

                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                setImgIndex(
                                    (i) => (i + 1) % galleryImages.length
                                );
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/70 rounded-full w-8 h-8"
                        >
                            ›
                        </button>
                    </>
                )}
            </div>

            {options.map((option, optionIndex) => (
                <div key={option.name}>
                    <h2 className="font-bold mb-2">
                        {option.name}
                    </h2>

                    <div className="flex gap-2 flex-wrap">
                        {option.values.map((value) => {
                            const active =
                                selected[option.name] === value;

                            const available =
                                isOptionValueAvailable(
                                    optionIndex,
                                    option.name,
                                    value
                                );

                            return (
                                <button
                                    key={value}
                                    disabled={!available}
                                    onClick={() =>
                                        selectOption(
                                            optionIndex,
                                            option.name,
                                            value
                                        )
                                    }
                                    className={`border rounded px-4 py-2 ${active
                                            ? "bg-black text-white"
                                            : !available
                                                ? "opacity-30 cursor-not-allowed"
                                                : ""
                                        }`}
                                >
                                    {value}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}

            <div className="border rounded p-4">
                <h2 className="font-bold mb-4">
                    Selected Variant
                </h2>

                {selectedVariant ? (
                    <>
                        <p>
                            Stock: {selectedVariant.stock}
                        </p>

                        <p>
                            Price:{" "}
                            {formatPrice(
                                selectedVariant.priceVND,
                                selectedVariant.priceUSD,
                                currency
                            )}
                        </p>

                        <button
                            className="mt-6 border rounded px-4 py-2 disabled:opacity-30 disabled:cursor-not-allowed"
                            disabled={
                                selectedVariant.stock === 0
                            }
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
                    <p>Please select all options.</p>
                )}
            </div>
        </div>
    );
}