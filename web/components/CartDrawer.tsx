"use client";

import { useEffect, useState } from "react";
import { getCart, increaseQuantity, decreaseQuantity } from "@/lib/cart";
import { getCurrency, formatPrice } from "@/lib/currency";
import Image from "next/image";
import Link from "next/link";

type CartItem = {
    variant_id: number; quantity: number; unit_price: number; total_price: number; available: boolean; image: string | null;
    product: { id: number; product_name: string } | null;
    variant: { id: number; variant1: string | null; value1: string | null; variant2: string | null; value2: string | null; variant3: string | null; value3: string | null; stock: number } | null;
};

export default function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [currency, setCurrencyState] = useState<"VND" | "USD">("VND");

    async function loadCart() {
        const cart = getCart(), currentCurrency = getCurrency();
        setCurrencyState(currentCurrency);
        const response = await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cart, currency: currentCurrency }) });
        setItems((await response.json()) as CartItem[]);
    }

    useEffect(() => { if (open) loadCart(); }, [open]);

    useEffect(() => {
        function update() { if (open) loadCart(); }
        window.addEventListener("cart-change", update);
        window.addEventListener("currency-change", update);
        return () => { window.removeEventListener("cart-change", update); window.removeEventListener("currency-change", update); };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = previousOverflow; };
    }, [open]);

    if (!open) return null;

    const validItems = items.filter((item) => item.available);
    const subtotal = validItems.reduce((total, item) => total + item.unit_price * item.quantity, 0);
    const totalQuantity = validItems.reduce((total, item) => total + item.quantity, 0);
    const today = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" }).format(new Date());

    function getVariations(item: CartItem) {
        if (!item.variant) return "";
        const v = item.variant;
        return [[v.variant1, v.value1], [v.variant2, v.value2], [v.variant3, v.value3]]
            .filter(([name, value]) => name && value && !(name.toLowerCase() === "color" && value.toLowerCase() === "original"))
            .map(([name, value]) => `${name}: ${value}`).join(" · ");
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
            <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden border border-black bg-white" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={onClose} aria-label="Close cart" className="absolute right-4 top-4 z-10 flex h-8 w-8 cursor-pointer items-center justify-center text-2xl leading-none">×</button>

                <div className="flex justify-center px-6 pb-5 pt-6">
                    <Link href="/" onClick={onClose}>
                        <img src="https://pub-6dc4b85e0fa049fe813176c2b710444c.r2.dev/Homepage/ngailogo-cursive-s.png" alt="Ngài" className="w-[150px]" />
                    </Link>
                </div>

                <div className="flex items-end justify-between border-b border-dotted border-black px-6 pb-4">
                    <h2 className="text-sm font-medium uppercase tracking-wide">Your Cart <span className="text-gray-500">[{totalQuantity}]</span></h2>
                    <p className="text-xs text-gray-500">{today}</p>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-dotted border-black py-3 px-6 text-[10px] font-medium uppercase tracking-wide">
                        <div>ITEMS</div><div className="w-28 text-center">QUANTITY</div><div className="w-24 text-right">AMOUNT</div>
                    </div>

                    {items.length === 0 ? (
                        <div className="py-12 px-6 text-center text-sm text-gray-500">Your cart is empty.</div>
                    ) : (
                        items.map((item) => (
                            <div key={item.variant_id} className="border-b border-dotted border-black py-4 px-6">
                                <div className="mb-3 min-w-0">
                                    <p className="text-sm font-medium uppercase">{item.product?.product_name ?? "Unavailable item"}</p>
                                    {getVariations(item) && <p className="mt-1 text-xs text-gray-500 uppercase">{getVariations(item)}</p>}
                                    {!item.available && <p className="mt-1 text-xs text-red-500">Unavailable</p>}
                                </div>

                                <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4">
                                    <div className="relative h-20 w-20 shrink-0 bg-gray-100">
                                        {item.image ? <Image src={item.image} alt={item.product?.product_name ?? ""} fill sizes="80px" className="object-cover" /> : null}
                                    </div>

                                    <div className="flex w-28 items-center justify-center">
                                        <button type="button" onClick={() => { decreaseQuantity(item.variant_id); loadCart(); }} className="flex h-7 w-7 cursor-pointer items-center justify-center text-sm">−</button>
                                        <span className="flex h-7 w-8 items-center justify-center text-xs">{item.quantity}</span>
                                        <button type="button" onClick={() => { increaseQuantity(item.variant_id); loadCart(); }} className="flex h-7 w-7 cursor-pointer items-center justify-center text-sm">+</button>
                                    </div>

                                    <div className="w-24 text-right text-xs">{formatPrice(item.unit_price * item.quantity, item.unit_price * item.quantity, currency)}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="px-6 py-5">
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-medium uppercase tracking-wide">Subtotal</span>
                        <span className="font-medium">{formatPrice(subtotal, subtotal, currency)}</span>
                    </div>
                    <Link href="/checkout" onClick={onClose} className="mt-5 block w-full bg-black px-4 py-3 text-center text-sm font-medium uppercase tracking-wide text-white">Checkout</Link>
                </div>
            </div>
        </div>
    );
}