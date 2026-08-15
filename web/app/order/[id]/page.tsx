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
    return (
      <main className="min-h-screen bg-[#F2F2F2] px-4 py-24 md:px-10 md:py-12">
        <div className="mx-auto w-full max-w-5xl border border-black bg-white p-10 text-sm">
          Order not found.
        </div>
      </main>
    );
  }

  const orderNumber = order.public_id
    .slice(0, 8)
    .toUpperCase();

  const today = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  return (
    <main className="min-h-screen bg-[#F2F2F2] px-4 py-24 md:px-10 md:py-12">
      <div className="mx-auto w-full max-w-xl border border-black bg-white">

        {/* ================================================= */}
        {/* LOGO */}
        {/* ================================================= */}

        <div className="flex justify-center border-b border-dotted border-black px-6 pb-6 pt-6">
          <img
            src="https://pub-6dc4b85e0fa049fe813176c2b710444c.r2.dev/Homepage/ngailogo-cursive-s.png"
            alt="Ngài"
            className="w-[150px]"
          />
        </div>

        {/* ================================================= */}
        {/* THANK YOU */}
        {/* ================================================= */}

        <div className="border-b border-dotted border-black px-6 py-8">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                Order Confirmed
              </p>

              <h1 className="mt-2 text-2xl font-medium">
                Thank you!
              </h1>

            </div>

            <p className="text-xs text-gray-500">
              {today}
            </p>
          </div>
        </div>

        {/* ================================================= */}
        {/* CUSTOMER INFORMATION */}
        {/* ================================================= */}

        <section className="border-b border-black">

          <div className="border-b border-dotted border-black px-6 py-4">
            <h2 className="text-[10px] font-medium uppercase tracking-wide">
              Customer Information
            </h2>
          </div>

          <div className="grid md:grid-cols-2">

            {/* Customer */}
            <div className="border-b border-dotted border-black px-6 py-5 md:border-r">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                Customer
              </p>

              <p className="mt-2 text-sm">
                {order.customer_name}
              </p>
            </div>

            {/* Email */}
            <div className="border-b border-dotted border-black px-6 py-5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                Email
              </p>

              <p className="mt-2 break-words text-sm">
                {order.email}
              </p>
            </div>

            {/* Payment */}
            <div className="px-6 py-5 md:border-r border-dotted">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                Payment Method
              </p>

              <p className="mt-2 text-sm">
                {order.payment_method}
              </p>
            </div>

            {/* Order */}
            <div className="px-6 py-5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                Order Number
              </p>

              <p className="mt-2 text-sm">
                #{orderNumber}
              </p>
            </div>

          </div>
        </section>

        {/* ================================================= */}
        {/* ORDER ITEMS */}
        {/* ================================================= */}

        <section>
          <div className="border-b border-dotted border-black px-6 py-5">
            <h2 className="text-sm font-medium uppercase tracking-wide">
              Your Order
            </h2>
          </div>

          <div className="px-6">
            <OrderItems
              items={order.items}
              subtotal={order.subtotal}
              currency={order.currency}
              shippingFee={order.shipping_fee}
            />
          </div>
        </section>

        {/* ================================================= */}
        {/* FOOTER MESSAGE */}
        {/* ================================================= */}

        <div className="border-t border-black px-6 py-8 text-center">
          <p className="text-xs text-gray-500">
            Thank you for shopping with Ngài.
          </p>
        </div>

      </div>
    </main>
  );
}