"use client";

import { useEffect, useState } from "react";
import {
    getCart,
    increaseQuantity,
    decreaseQuantity,
} from "@/lib/cart";
import { getCurrency, formatPrice } from "@/lib/currency";
import Image from "next/image";
import Link from "next/link";

type CartItem = {
    variant_id: number;
    product_id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    available: boolean;
    image_url?: string | null;

    variant1?: string | null;
    value1?: string | null;
    variant2?: string | null;
    value2?: string | null;
    variant3?: string | null;
    value3?: string | null;
};

export default function CartDrawer({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [currency, setCurrencyState] = useState<"VND" | "USD">("VND");

    async function loadCart() {
        const cart = getCart();
        const currentCurrency = getCurrency();

        setCurrencyState(currentCurrency);

        const response = await fetch("/api/cart", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                cart,
                currency: currentCurrency,
            }),
        });

        const data = await (response.json() as any);

        setItems(data);
    }

    useEffect(() => {
        if (!open) return;

        loadCart();
    }, [open]);

    useEffect(() => {
        function update() {
            if (open) {
                loadCart();
            }
        }

        window.addEventListener("cart-change", update);
        window.addEventListener("currency-change", update);

        return () => {
            window.removeEventListener("cart-change", update);
            window.removeEventListener("currency-change", update);
        };
    }, [open]);

    // Prevent background scrolling while popup is open
    useEffect(() => {
        if (!open) return;

        const previousOverflow = document.body.style.overflow;

        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [open]);

    if (!open) return null;

    const validItems = items.filter((item) => item.available);

    const subtotal = validItems.reduce(
        (total, item) =>
            total + item.unit_price * item.quantity,
        0
    );

    const totalQuantity = validItems.reduce(
        (total, item) =>
            total + item.quantity,
        0
    );

    const today = new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(new Date());

    function getVariations(item: CartItem) {
        return [
            [item.variant1, item.value1],
            [item.variant2, item.value2],
            [item.variant3, item.value3],
        ]
            .filter(([name, value]) => name && value)
            .map(([name, value]) => `${name}: ${value}`)
            .join(" · ");
    }

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
            onClick={onClose}
        >
            {/* Popup */}
            <div
                className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden border border-black bg-white"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close cart"
                    className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center text-2xl leading-none cursor-pointer"
                >
                    ×
                </button>

                {/* Logo */}
                <div className="flex justify-center px-6 pb-5 pt-6">
                    <Link href="/" onClick={onClose}>
                        <img
                            src="https://pub-6dc4b85e0fa049fe813176c2b710444c.r2.dev/Homepage/ngailogo-cursive-s.png"
                            alt="Ngài"
                            className="w-[150px]"
                        />
                    </Link>
                </div>

                {/* Cart heading */}
                <div className="flex items-end justify-between border-b border-dotted border-black px-6 pb-4">
                    <h2 className="text-sm font-medium uppercase tracking-wide">
                        Your Cart{" "}
                        <span className="text-gray-500">
                            [{totalQuantity}]
                        </span>
                    </h2>

                    <p className="text-xs text-gray-500">
                        {today}
                    </p>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto px-6">
                    {/* Table header */}
                    <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-dotted border-black py-3 text-[10px] font-medium uppercase tracking-wide">
                        <div>ITEMS</div>

                        <div className="w-28 text-center">
                            QUANTITY
                        </div>

                        <div className="w-24 text-right">
                            AMOUNT
                        </div>
                    </div>

                    {/* Items */}
                    {items.length === 0 ? (
                        <div className="py-12 text-center text-sm text-gray-500">
                            Your cart is empty.
                        </div>
                    ) : (
                        items.map((item) => (
                            <div
                                key={item.variant_id}
                                className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-dotted border-black py-4"
                            >
                                {/* Item */}
                                <div className="flex min-w-0 items-center gap-4">
                                    <div className="relative h-20 w-20 shrink-0 bg-gray-100">
                                        {item.image_url ? (
                                            <Image
                                                src={item.image_url}
                                                alt={item.product_name}
                                                fill
                                                sizes="80px"
                                                className="object-cover"
                                            />
                                        ) : null}
                                    </div>

                                    <div className="min-w-0">
                                        <p className="text-sm font-medium">
                                            {item.product_name}
                                        </p>

                                        {getVariations(item) && (
                                            <p className="mt-1 text-xs text-gray-500">
                                                {getVariations(item)}
                                            </p>
                                        )}

                                        {!item.available && (
                                            <p className="mt-1 text-xs text-red-500">
                                                Unavailable
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Quantity */}
                                <div className="flex w-28 items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            decreaseQuantity(item.variant_id);
                                            loadCart();
                                        }}
                                        className="flex h-7 w-7 items-center justify-center cursor-pointer border border-black text-sm"
                                    >
                                        −
                                    </button>

                                    <span className="flex h-7 w-8 items-center justify-center text-xs">
                                        {item.quantity}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            increaseQuantity(item.variant_id);
                                            loadCart();
                                        }}
                                        className="flex h-7 w-7 items-center justify-center cursor-pointer border border-black text-sm"
                                    >
                                        +
                                    </button>
                                </div>

                                {/* Amount */}
                                <div className="w-24 text-right text-sm">
                                    {formatPrice(
                                        item.unit_price * item.quantity,
                                        item.unit_price * item.quantity,
                                        currency
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-5">
                    {/* Subtotal */}
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-medium uppercase tracking-wide">
                            Subtotal
                        </span>

                        <span className="font-medium">
                            {formatPrice(
                                subtotal,
                                subtotal,
                                currency
                            )}
                        </span>
                    </div>

                    {/* Checkout */}
                    <Link
                        href="/checkout"
                        onClick={onClose}
                        className="mt-5 block w-full bg-black px-4 py-3 text-center text-sm font-medium uppercase tracking-wide text-white"
                    >
                        Checkout
                    </Link>
                </div>
            </div>
        </div>
    );
}