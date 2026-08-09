import { NextRequest, NextResponse } from "next/server";
import { createOrderWithDetails } from "@/lib/db/orders";
import { getSettings } from "@/lib/db/settings";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as any;

  try {
    const settings = await getSettings();
    const currency = body.currency ?? "VND";
    const shippingFee = currency === "USD" ? settings.shipping_fee_usd : settings.shipping_fee_vnd;

    const publicId = await createOrderWithDetails(
      {
        created_at: new Date().toISOString(),
        payment_status: "Pending",
        payment_method: body.paymentMethod,
        customer_name: body.customerName,
        email: body.email,
        phone: body.phone,
        address: body.address,
        notes: body.notes,
        currency,
        idempotency_key: body.idempotencyKey ?? null,
        shipping_fee: shippingFee,
      },
      body.cart
    );
    return NextResponse.json({ success: true, publicId });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}