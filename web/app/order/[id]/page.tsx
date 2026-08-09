export const dynamic = "force-dynamic";

import OrderItems from "@/components/orders/OrderItems";
import { getOrderWithItems } from "@/lib/db/orders";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await getOrderWithItems(id);

  if (!order) {
    return <main className="p-10">Order not found.</main>;
  }

  return (
    <main className="max-w-5xl mx-auto p-10">

      <h1 className="text-4xl font-bold">
        Thank you!
      </h1>

      <p className="mt-4">
        Order #{order.public_id.slice(0, 8).toUpperCase()}
      </p>

      <p>{order.customer_name}</p>

      <p>{order.email}</p>

      <p>{order.payment_method}</p>

      <div className="mt-10">

        <OrderItems
          items={order.items}
          subtotal={order.subtotal}
          currency={order.currency}
          shippingFee={order.shipping_fee}
        />

      </div>

    </main>
  );
}