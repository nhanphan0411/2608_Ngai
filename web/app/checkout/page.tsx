"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrency } from "@/lib/currency";
import { getCountry } from "@/lib/country";
import { isVietnam } from "@/lib/countries";
import CountrySelector from "@/components/CountrySelector";

export default function CheckoutPage() {
    const router = useRouter();
    const [idempotencyKey] = useState(() => crypto.randomUUID());
    const [items, setItems] = useState<any[]>([]);
    const [currency, setCurrencyState] = useState<"VND" | "USD">("VND");
    const [country, setCountryState] = useState("");
    const [loading, setLoading] = useState(true);
    const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
    const [shippingFee, setShippingFee] = useState(0);

    // Country drives shipping fee (Vietnam flat fee vs. international flat
    // fee) — this is the SAME country the shared selector below writes to,
    // so it stays correct no matter which page the shopper last touched it
    // on, including this form.
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
                setPaymentMethods(
                    s.payment_methods
                        .split(",")
                        .map((m: string) => m.trim())
                        .filter(Boolean)
                );

                setShippingFee(
                    isVietnam(country)
                        ? s.shipping_fee_vnd
                        : s.shipping_fee_usd
                );
            });
    }, [country]);

    async function loadCart() {
        const cart = JSON.parse(
            localStorage.getItem("cart") || "[]"
        );

        const currentCurrency = getCurrency();

        setCurrencyState(currentCurrency);

        if (cart.length === 0) {
            router.replace("/cart");
            return;
        }

        const res = await fetch("/api/cart", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                cart,
                currency: currentCurrency,
            }),
        });

        const data = (await res.json()) as any;

        setItems(data);
        setLoading(false);
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

    function formatMoney(amount: number) {
        return new Intl.NumberFormat(currency === "USD" ? "en-US" : "vi-VN", {
            style: "currency",
            currency: currency === "USD" ? "USD" : "VND",
            maximumFractionDigits: currency === "USD" ? 2 : 0,
        }).format(amount);
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-[#F2F2F2] px-4 py-24 md:px-10 md:py-12">
                <div className="mx-auto max-w-5xl text-sm">
                    Loading…
                </div>
            </main>
        );
    }

    const today = new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(new Date());

    return (
        <main className="min-h-screen bg-[#F2F2F2] px-4 py-24 md:px-10 md:py-12">
            <div className="mx-auto w-full max-w-5xl border border-black bg-white">

                {/* Logo */}
                <div className="flex justify-center border-b border-dotted border-black px-6 pb-6 pt-6">
                    <img
                        src="https://pub-6dc4b85e0fa049fe813176c2b710444c.r2.dev/Homepage/ngailogo-cursive-s.png"
                        alt="Ngài"
                        className="w-[150px]"
                    />
                </div>

                {/* Two columns */}
                <div className="grid md:grid-cols-2">

                    {/* ================================================= */}
                    {/* LEFT — CART */}
                    {/* ================================================= */}

                    <section className="border-b border-black md:border-b-0 md:border-r">

                        {/* Cart heading */}
                        <div className="flex items-end justify-between border-b border-dotted border-black px-6 py-5">
                            <h1 className="text-sm font-medium uppercase tracking-wide">
                                {" "}
                                <span className="text-gray-500">
                                    {items.reduce(
                                        (total, item) =>
                                            total + item.quantity,
                                        0
                                    )} Items
                                </span>
                            </h1>

                            <p className="text-xs text-gray-500">
                                {today}
                            </p>
                        </div>

                        {/* Table */}
                        <div className="px-6">

                            {/* Table header */}
                            <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-dotted border-black py-3 text-[10px] font-medium uppercase tracking-wide">
                                <div>
                                    Item
                                </div>

                                <div className="w-24 text-center">
                                    Quantity
                                </div>

                                <div className="w-24 text-right">
                                    Amount
                                </div>
                            </div>

                            {/* Items */}
                            {items.map((item) => (
                                <div
                                    key={item.variant_id}
                                    className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-dotted border-black py-4"
                                >
                                    {/* Item */}
                                    <div className="flex min-w-0 items-center gap-3">

                                        {item.image ? (
                                            <div className="relative h-16 w-16 shrink-0 bg-gray-100">
                                                <img
                                                    src={item.image}
                                                    alt={
                                                        item.product
                                                            ?.product_name ||
                                                        ""
                                                    }
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="h-16 w-16 shrink-0 bg-gray-100" />
                                        )}

                                        <div className="min-w-0">
                                            <p className="text-sm font-medium">
                                                {item.product?.product_name}
                                            </p>

                                            <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                                                {item.variant?.variant1 &&
                                                    item.variant?.value1 && (
                                                        <p>
                                                            {
                                                                item.variant
                                                                    .variant1
                                                            }
                                                            :{" "}
                                                            {
                                                                item.variant
                                                                    .value1
                                                            }
                                                        </p>
                                                    )}

                                                {item.variant?.variant2 &&
                                                    item.variant?.value2 && (
                                                        <p>
                                                            {
                                                                item.variant
                                                                    .variant2
                                                            }
                                                            :{" "}
                                                            {
                                                                item.variant
                                                                    .value2
                                                            }
                                                        </p>
                                                    )}

                                                {item.variant?.variant3 &&
                                                    item.variant?.value3 && (
                                                        <p>
                                                            {
                                                                item.variant
                                                                    .variant3
                                                            }
                                                            :{" "}
                                                            {
                                                                item.variant
                                                                    .value3
                                                            }
                                                        </p>
                                                    )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quantity */}
                                    <div className="flex w-24 items-center justify-center text-xs">
                                        <span>
                                            {item.quantity}
                                        </span>
                                    </div>

                                    {/* Amount */}
                                    <div className="w-24 text-right text-sm">
                                        {formatMoney(item.unit_price * item.quantity)}
                                    </div>
                                </div>
                            ))}

                            {/* Subtotal */}
                            <div className="flex items-center justify-between border-b border-dotted border-black py-4">
                                <span className="text-sm font-medium uppercase tracking-wide">
                                    Subtotal
                                </span>

                                <span className="text-sm font-medium">
                                    {formatMoney(subtotal)}
                                </span>
                            </div>

                            {/* Shipping */}
                            <div className="flex items-center justify-between py-4 text-gray-500">
                                <span className="text-sm uppercase tracking-wide">
                                    Shipping
                                </span>

                                <span className="text-sm">
                                    {shippingFee === 0 ? "Free" : formatMoney(shippingFee)}
                                </span>
                            </div>

                            {/* Total */}
                            <div className="flex items-center justify-between py-5">
                                <span className="text-sm font-medium uppercase tracking-wide">
                                    Total
                                </span>

                                <span className="text-sm font-medium">
                                    {formatMoney(subtotal + shippingFee)}
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* ================================================= */}
                    {/* RIGHT — FORM */}
                    {/* ================================================= */}

                    <section>

                        {/* Form heading */}
                        <div className="border-b border-dotted border-black px-6 py-5">
                            <h2 className="text-sm font-medium uppercase tracking-wide">
                                Customer Information
                            </h2>
                        </div>

                        <form
                            className="px-6 py-2"
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

                                // The country code comes from the shared
                                // CountrySelector below — the same control
                                // and the same stored value as the footer's
                                // and the nav's, so it can't be switched to
                                // a different one just for this submission.
                                const countryCode = formData.get("country") as string;

                                const countryName =
                                    new Intl.DisplayNames(["en"], { type: "region" }).of(
                                        countryCode
                                    ) ?? countryCode;

                                const res = await fetch("/api/orders", {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                        customerName:
                                            formData.get("customerName"),
                                        email:
                                            formData.get("email"),
                                        phone:
                                            formData.get("phone"),
                                        address: [
                                            formData.get("addressLine1"),
                                            formData.get("addressLine2"),
                                            formData.get("city"),
                                            formData.get("state"),
                                            formData.get("postalCode"),
                                            countryName,
                                        ]
                                            .filter(Boolean)
                                            .join(", "),
                                        country: countryCode,
                                        notes:
                                            formData.get("notes"),
                                        paymentMethod:
                                            formData.get("paymentMethod"),
                                        cart,
                                        idempotencyKey,
                                    }),
                                });

                                const result =
                                    (await res.json()) as any;

                                if (!result.success) {
                                    alert(
                                        result.error ||
                                        "Something went wrong placing your order."
                                    );
                                    return;
                                }

                                localStorage.removeItem("cart");

                                window.location.href =
                                    `/order/${result.publicId}`;
                            }}
                        >

                            {/* Customer Name */}
                            <div className="border-b border-dotted border-black py-4">
                                <label className="mb-2 block text-[10px] font-medium uppercase tracking-wide text-gray-500">
                                    Customer Name
                                </label>

                                <input
                                    name="customerName"
                                    placeholder="Your name"
                                    className="w-full border border-black bg-white px-3 py-3 text-sm outline-none placeholder:text-gray-400 focus:bg-gray-50"
                                    required
                                />
                            </div>

                            {/* Email */}
                            <div className="border-b border-dotted border-black py-4">
                                <label className="mb-2 block text-[10px] font-medium uppercase tracking-wide text-gray-500">
                                    Email
                                </label>

                                <input
                                    name="email"
                                    placeholder="Email address"
                                    className="w-full border border-black bg-white px-3 py-3 text-sm outline-none placeholder:text-gray-400 focus:bg-gray-50"
                                />
                            </div>

                            {/* Phone */}
                            <div className="border-b border-dotted border-black py-4">
                                <label className="mb-2 block text-[10px] font-medium uppercase tracking-wide text-gray-500">
                                    Phone
                                </label>

                                <input
                                    name="phone"
                                    placeholder="Phone number"
                                    className="w-full border border-black bg-white px-3 py-3 text-sm outline-none placeholder:text-gray-400 focus:bg-gray-50"
                                />
                            </div>

                            {/* Shipping Address */}
                            <div className="border-b border-dotted border-black py-4">
                                <label className="mb-4 block text-[10px] font-medium uppercase tracking-wide text-gray-500">
                                    Shipping Address
                                </label>

                                <div className="space-y-3">

                                    {/* Address Line 1 */}
                                    <input
                                        name="addressLine1"
                                        placeholder="Address Line 1"
                                        required
                                        className="w-full border border-black bg-white px-3 py-3 text-sm outline-none placeholder:text-gray-400 focus:bg-gray-50"
                                    />

                                    {/* Address Line 2 */}
                                    <input
                                        name="addressLine2"
                                        placeholder="Address Line 2 (optional)"
                                        className="w-full border border-black bg-white px-3 py-3 text-sm outline-none placeholder:text-gray-400 focus:bg-gray-50"
                                    />

                                    {/* City + State */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            name="city"
                                            placeholder="City"
                                            required
                                            className="w-full border border-black bg-white px-3 py-3 text-sm outline-none placeholder:text-gray-400 focus:bg-gray-50"
                                        />

                                        <input
                                            name="state"
                                            placeholder="State / Province"
                                            className="w-full border border-black bg-white px-3 py-3 text-sm outline-none placeholder:text-gray-400 focus:bg-gray-50"
                                        />
                                    </div>

                                    {/* Postal + Country */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            name="postalCode"
                                            placeholder="Postal / ZIP Code"
                                            className="w-full border border-black bg-white px-3 py-3 text-sm outline-none placeholder:text-gray-400 focus:bg-gray-50"
                                        />

                                        <CountrySelector variant="checkout" />
                                    </div>

                                </div>
                            </div>

                            {/* Notes */}
                            <div className="border-b border-dotted border-black py-4">
                                <label className="mb-2 block text-[10px] font-medium uppercase tracking-wide text-gray-500">
                                    Notes
                                </label>

                                <textarea
                                    name="notes"
                                    placeholder="Additional notes"
                                    rows={3}
                                    className="w-full resize-none border border-black bg-white px-3 py-3 text-sm outline-none placeholder:text-gray-400 focus:bg-gray-50"
                                />
                            </div>

                            {/* Payment */}
                            <div className="py-4">
                                <label className="mb-2 block text-[10px] font-medium uppercase tracking-wide text-gray-500">
                                    Payment Method
                                </label>

                                <select
                                    name="paymentMethod"
                                    className="w-full appearance-none border border-black bg-white px-3 py-3 text-sm outline-none focus:bg-gray-50"
                                >
                                    {paymentMethods.map((m) => (
                                        <option key={m}>
                                            {m}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Place Order */}
                            <button
                                type="submit"
                                className="mt-2 mb-6 block w-full bg-black px-4 py-4 text-center text-sm font-medium uppercase tracking-wide text-white transition hover:bg-gray-800"
                            >
                                Place Order
                            </button>
                        </form>
                    </section>
                </div>
            </div>
        </main>
    );
}