"use client";

import { useState, useEffect } from "react";
import { addToCart } from "@/lib/cart";
import { formatPrice, getCurrency } from "@/lib/currency";
import { showToast } from "@/lib/toast";
import Image from "next/image";

export default function ProductOptions({
    product,
    options,
    variants,
    images,
    sizeGuide,
}: {
    product: {
        product_name: string;
        category: string | null;
        description?: string | null;
        note?: string | null;
    };
    options: { name: string; values: string[] }[];
    variants: any[];
    images: any[];
    sizeGuide: { id: number; name: string; url: string } | null;
}) {
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

    const galleryImages = images.filter(
        (img) => img.variant_group_id === selectedVariant?.variant_group_id
    );

    // Size gets its own row; all other options appear underneath.
    const sizeOption = options.find((o) => /size/i.test(o.name));
    const otherOptions = options.filter((o) => o !== sizeOption);

    function renderOptionGroup(
        option: { name: string; values: string[] },
        inline = false
    ) {
        const optionIndex = options.indexOf(option);

        return (
            <div key={option.name}>
                <div className={inline ? "flex items-center gap-3" : "flex flex-col gap-2"}>
                    {/* Variation name */}
                    <h2 className="shrink-0 text-sm uppercase tracking-wide">
                        {option.name}
                    </h2>

                    {/* Variation values */}
                    <div className="flex flex-wrap gap-1.5">
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
                                        selectOption(
                                            optionIndex,
                                            option.name,
                                            value
                                        )
                                    }
                                    className={`border px-2.5 py-1 text-xs uppercase cursor-pointer transition ${active
                                        ? "bg-black text-white"
                                        : !available
                                            ? "cursor-not-allowed opacity-30"
                                            : "hover:bg-gray-100"
                                        }`}
                                >
                                    {value}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="md:flex md:h-screen md:min-h-0">
            {/* Image column */}
            <div
                className="
                flex
                w-full
                snap-x
                snap-mandatory
                overflow-x-auto
                overflow-y-hidden
                md:block
                md:h-screen
                md:w-[60vw]
                md:snap-none
                md:overflow-x-hidden
                md:overflow-y-auto
            "
            >
                {galleryImages.length > 0 ? (
                    galleryImages.map((img, i) => (
                        <div
                            key={img.id ?? i}
                            className="
                relative
                aspect-[3/4]
                w-full
                shrink-0
                snap-center
                bg-gray-100
                md:w-full
                md:shrink
                md:snap-none
                "
                        >
                            <Image
                                src={img.url_large}
                                alt={`${product.product_name} - Image ${i + 1}`}
                                fill
                                sizes="(max-width: 768px) 100vw, 50vw"
                                className="object-cover"
                                priority={i === 0}
                            />
                        </div>
                    ))
                ) : (
                    <div className="flex aspect-[4/3] w-full shrink-0 items-center justify-center bg-gray-100 text-sm text-gray-400">
                        No image
                    </div>
                )}
            </div>

            {/* Details column */}
            <div className="flex flex-col px-8 py-10 md:h-screen md:w-[30vw] md:overflow-y-auto">
                {/* Category */}
                {product.category && (
                    <p className="mb-3 text-xs text-gray-500">
                        {product.category}
                    </p>
                )}

                {/* Product name */}
                <p className="font-bold uppercase">
                    {product.product_name}
                </p>

                {/* Price */}
                <p className="mt-3 text-lg">
                    {selectedVariant
                        ? formatPrice(
                            selectedVariant.priceVND,
                            selectedVariant.priceUSD,
                            currency
                        )
                        : "Select options"}
                </p>

                {/* Description */}
                {product.description && (
                    <div className="mt-4 text-xs leading-6 whitespace-pre-line">
                        {product.description}
                    </div>
                )}

                {/* Options */}
                <div className="mt-5 flex flex-col gap-4">
                    {/* Other options */}
                    {otherOptions.map((option) => {
                        // Hide color visually when there is only one color.
                        if (
                            /color/i.test(option.name) &&
                            option.values.length === 1
                        ) {
                            return null;
                        }

                        return renderOptionGroup(option, true);
                    })}

                    {/* Size */}
                    {sizeOption && (
                        <div>
                            {renderOptionGroup(sizeOption, true)}
                        </div>
                    )}
                </div>

                {/* Add to cart */}
                <div className="mt-6 w-full pb-2">
                    {selectedVariant ? (
                        <>
                            <p className="mb-3 text-xs text-gray-500">
                                {selectedVariant.stock > 0
                                    ? `${selectedVariant.stock} in stock`
                                    : "Out of stock"}
                            </p>

                            <button
                                className="w-full cursor-pointer border border-black bg-black px-4 py-1 text-sm font-medium uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-30"
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
                        <p className="text-sm">
                            Please select all options.
                        </p>
                    )}
                </div>

                <div className="md:mt-5 mt-2">
                    {/* Details */}
                    {product.note && (
                        <details className="mt-4">
                            <summary className="cursor-pointer py-3 text-[10px] font-medium uppercase tracking-wide">
                                DETAILS
                            </summary>
                            <div className="pb-4 text-sm leading-6 text-gray-600 whitespace-pre-line">
                                {product.note}
                            </div>
                        </details>
                    )}

                    {/* Size Guide */}
                    {sizeGuide && (
                        <details className="">
                            <summary className="cursor-pointer py-3 text-sm uppercase tracking-wide">
                                SIZE GUIDE
                            </summary>

                            <div className="max-h-[60vh] overflow-y-auto pb-5 pt-3">
                                <Image
                                    src={sizeGuide.url}
                                    alt={sizeGuide.name}
                                    width={800}
                                    height={1000}
                                    className="h-auto w-full object-contain"
                                />
                            </div>
                        </details>
                    )}

                    {/* Shipping */}
                    <details className="">
                        <summary className="cursor-pointer py-3 text-sm uppercase tracking-wide">
                            SHIPPING
                        </summary>

                        <div className="pb-4 text-sm leading-6 text-gray-600">
                            Free shipping · Ships within 2–3 business days
                        </div>
                    </details>
                </div>
            </div>
        </div>
    );
}