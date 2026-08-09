"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrency } from "@/lib/currency";
import OrderItems from "@/components/orders/OrderItems";

export default function CheckoutPage() {
    const router = useRouter();
    const [idempotencyKey] = useState(() => crypto.randomUUID());
    const [items, setItems] = useState<any[]>([]);
    const [currency, setCurrencyState] = useState<"VND" | "USD">("VND");
    const [loading, setLoading] = useState(true);
    const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
    const [shippingFee, setShippingFee] = useState(0);

    useEffect(() => {
        fetch("/api/settings")
            .then((r) => (r.json()) as any)
            .then((s) => {
                setPaymentMethods(
                    s.payment_methods.split(",").map((m: string) => m.trim()).filter(Boolean)
                );
                setShippingFee(currency === "USD" ? s.shipping_fee_usd : s.shipping_fee_vnd);
            });
    }, [currency]);

    useEffect(() => {
        async function loadCart() {
            const cart = JSON.parse(localStorage.getItem("cart") || "[]");
            const currentCurrency = getCurrency();
            setCurrencyState(currentCurrency);

            if (cart.length === 0) {
                router.replace("/cart");
                return;
            }

            const res = await fetch("/api/cart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cart, currency: currentCurrency }),
            });

            const data = await (res.json() as any);
            setItems(data);
            setLoading(false);
        }

        loadCart();
    }, [router]);

    const subtotal = items.reduce((total, item) => {
        if (!item.available) return total;
        return total + item.unit_price * item.quantity;
    }, 0);

    if (loading) {
        return <main className="max-w-3xl mx-auto p-10">Loading…</main>;
    }

    return (
        <main className="max-w-3xl mx-auto p-10">

            <h1 className="text-4xl font-bold mb-8">
                Checkout
            </h1>

            <div className="mb-10">
                <OrderItems items={items}
                    subtotal={subtotal}
                    currency={currency}
                    shippingFee={shippingFee} />
            </div>

            <form
                className="space-y-4"
                onSubmit={async (e) => {

                    e.preventDefault();

                    const form = e.currentTarget;

                    const formData = new FormData(form);

                    const cart = JSON.parse(
                        localStorage.getItem("cart") || "[]"
                    );

                    if (cart.length === 0) {
                        router.replace("/cart");
                        return;
                    }

                    const res = await fetch("/api/orders", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            customerName: formData.get("customerName"),
                            email: formData.get("email"),
                            phone: formData.get("phone"),
                            address: formData.get("address"),
                            notes: formData.get("notes"),
                            paymentMethod: formData.get("paymentMethod"),
                            cart,
                            idempotencyKey,
                            currency: getCurrency(),
                        }),
                    });

                    const result = await (res.json()) as any;

                    if (!result.success) {
                        alert(result.error || "Something went wrong placing your order.");
                        return;
                    }

                    localStorage.removeItem("cart");
                    window.location.href = `/order/${result.publicId}`;

                }}
            >

                <input
                    name="customerName"
                    placeholder="Customer Name"
                    className="border p-2 w-full"
                    required
                />

                <input
                    name="email"
                    placeholder="Email"
                    className="border p-2 w-full"
                />

                <input
                    name="phone"
                    placeholder="Phone"
                    className="border p-2 w-full"
                />

                <textarea
                    name="address"
                    placeholder="Address"
                    className="border p-2 w-full"
                />

                <textarea
                    name="notes"
                    placeholder="Notes"
                    className="border p-2 w-full"
                />

                <select name="paymentMethod" className="border p-2 w-full">
                    {paymentMethods.map((m) => (
                        <option key={m}>{m}</option>
                    ))}
                </select>

                <button
                    type="submit"
                    className="border px-5 py-2"
                >
                    Place Order
                </button>

            </form>

        </main>
    );
}