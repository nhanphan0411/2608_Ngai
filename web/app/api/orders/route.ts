import { NextRequest, NextResponse } from "next/server";
import { createOrderWithDetails } from "@/lib/db/orders";
import { getSettings } from "@/lib/db/settings";
import { COUNTRY_CODES, getCurrencyFromCountry, isVietnam } from "@/lib/countries";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as any;

  try {
    const country = typeof body.country === "string" ? body.country.toUpperCase() : "";

    if (!(COUNTRY_CODES as readonly string[]).includes(country)) {
      return NextResponse.json(
        { success: false, error: "A valid shipping country is required." },
        { status: 400 }
      );
    }

    const settings = await getSettings();

    // Currency and shipping fee are both derived from the shopper's one
    // unified country selection — never trusted from a client-sent
    // `currency` field — so switching the selector on a different page
    // can't be used to get a cheaper price than the shipping destination
    // actually warrants.
    const currency = getCurrencyFromCountry(country);
    const shippingFee = isVietnam(country) ? settings.shipping_fee_vnd : settings.shipping_fee_usd;

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
        country,
      },
      body.cart
    );
    return NextResponse.json({ success: true, publicId });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}