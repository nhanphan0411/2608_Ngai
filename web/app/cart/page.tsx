"use client";

import { useEffect, useState } from "react";
import {
    getCart,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
} from "@/lib/cart";
import { getCurrency } from "@/lib/currency";
import { getCountry } from "@/lib/country";
import { isVietnam } from "@/lib/countries";
import OrderItems from "@/components/orders/OrderItems";

export default function CartPage() {
    const [items, setItems] = useState<any[]>([]);
    const [currency, setCurrencyState] = useState<"VND" | "USD">("VND");
    const [country, setCountryState] = useState("");
    const [shippingFee, setShippingFee] = useState(0);

    // Country drives shipping fee (Vietnam flat fee vs. international flat
    // fee) — the same country the shared selector persists everywhere else.
    useEffect(() => {
        function syncCountry() {
            setCountryState(getCountry());
        }

        syncCountry();

        window.addEventListener("country-change", syncCountry);
        return () => window.removeEventListener("country-change", syncCountry);
    }, []);

    useEffect(() => {
        if (!country) return;

        fetch("/api/settings")
            .then((r) => (r.json()) as any)
            .then((s) => {
                setShippingFee(isVietnam(country) ? s.shipping_fee_vnd : s.shipping_fee_usd);
            });
    }, [country]);

    async function loadCart() {
        const cart = getCart();
        const currentCurrency = getCurrency();
        setCurrencyState(currentCurrency);

        const response = await fetch("/api/cart", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ cart, currency: currentCurrency }),
        });

        const items = (await response.json()) as any;

        setItems(items);
    }

    useEffect(() => {
        loadCart();

        window.addEventListener("currency-change", loadCart);
        return () => window.removeEventListener("currency-change", loadCart);
    }, []);

    const subtotal = items.reduce((total, item) => {
        if (!item.available) return total;
        return total + item.unit_price * item.quantity;
    }, 0);

    return (
        <main className="max-w-5xl mx-auto p-10">

            <h1 className="text-4xl font-bold mb-8">
                Cart
            </h1>

            <OrderItems
                items={items}
                editable
                subtotal={subtotal}
                currency={currency}
                shippingFee={shippingFee}
                showCheckout
                onIncrease={(id) => {
                    increaseQuantity(id);
                    loadCart();
                }}
                onDecrease={(id) => {
                    decreaseQuantity(id);
                    loadCart();
                }}
                onRemove={(id) => {
                    removeFromCart(id);
                    loadCart();
                }}
            />

        </main>
    );
}