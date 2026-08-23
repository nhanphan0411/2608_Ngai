"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STATUS_OPTIONS = ["Pending", "Paid", "Shipped", "Cancelled"];

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    const res = await fetch("/api/admin/orders");
    const data = (await res.json()) as any[];
    setOrders(data);
  }

  async function updateStatus(id: number, payment_status: string) {
    // Optimistic update so the dropdown feels instant
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, payment_status } : o))
    );

    await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_status }),
    });
  }

  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl max-sm:text-right  font-bold mb-6 text-gray-900">
        Orders
      </h1>

      <section className="border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Order History
          </h2>

          <div className="text-sm text-gray-400">
            {orders.length} orders
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            No orders yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="p-3">ID</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Date</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Total</th>
                <th className="p-3"></th>
              </tr>
            </thead>

            <tbody>
              {orders.map((o: any) => (
                <tr
                  key={o.id}
                  className="border-t border-gray-100 hover:bg-gray-50 transition"
                >
                  <td className="p-3 text-gray-500">
                    #{o.id}
                  </td>

                  <td className="p-3">
                    <div className="font-medium text-gray-800">
                      {o.customer_name}
                    </div>

                    <div className="text-xs text-gray-400">
                      {o.email}
                    </div>
                  </td>

                  <td className="p-3 text-gray-500">
                    {new Date(o.created_at).toLocaleDateString()}
                  </td>

                  <td className="p-3">
                    <select
                      value={o.payment_status}
                      onChange={(e) => updateStatus(o.id, e.target.value)}
                      className={`px-2.5 py-0.5 text-xs font-medium border-0 ${o.payment_status === "Paid"
                          ? "bg-green-100 text-green-700"
                          : o.payment_status === "Shipped"
                            ? "bg-blue-100 text-blue-700"
                            : o.payment_status === "Cancelled"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                        }`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="p-3 font-medium text-gray-800">
                    {o.currency === "USD"
                      ? `$${(Number(o.subtotal) + Number(o.shipping_fee)).toFixed(2)}`
                      : `${(Number(o.subtotal) + Number(o.shipping_fee)).toLocaleString()} VND`}
                  </td>

                  <td className="p-3">
                    <div className="flex items-center">
                      <Link
                        href={`/order/${o.public_id}`}
                        className="text-sm text-gray-600 hover:text-gray-900"
                        target="_blank"
                      >
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}