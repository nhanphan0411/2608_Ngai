import { NextRequest, NextResponse } from "next/server";

import { getVariantsForCart } from "@/lib/db/inventory";
import type { CartItem, Inventory, Product } from "@/types/db";

type CartLine = CartItem & {
  available: boolean;
  unit_price: number;
  total_price: number;
  variant: Inventory | null;
  product: Product | null;
  image: string | null;
};

function unavailableLine(item: CartItem): CartLine {
  return {
    ...item,
    available: false,
    unit_price: 0,
    total_price: 0,
    variant: null,
    product: null,
    image: null,
  };
}

export async function POST(req: NextRequest) {
  const { cart, currency } = (await req.json()) as {
    cart: CartItem[];
    currency?: "VND" | "USD";
  };

  const isUSD = currency === "USD";

  // One batched lookup for the whole cart instead of 3 sequential queries
  // per line — fires on every /cart and /checkout load and after every
  // cart mutation, so this is the hottest read path in the app.
  const uniqueIds = [...new Set(cart.map((item) => item.variant_id))];
  const rows = await getVariantsForCart(uniqueIds);
  const byVariantId = new Map(rows.map((row) => [row.variant.id, row]));

  const items: CartLine[] = cart.map((item): CartLine => {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return unavailableLine(item);
    }

    const row = byVariantId.get(item.variant_id);
    if (!row) return unavailableLine(item);

    const { variant, product, imageUrl } = row;
    const price = isUSD && variant.priceUSD ? variant.priceUSD : (variant.priceVND ?? 0);

    return {
      ...item,
      available: true,
      quantity: item.quantity,
      unit_price: price,
      total_price: price * item.quantity,
      image: imageUrl,
      product,
      variant,
    };
  });

  return NextResponse.json(items);
}
