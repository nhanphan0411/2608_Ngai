import { NextRequest, NextResponse } from "next/server";

import { getVariantById } from "@/lib/db/inventory";
import { getProduct } from "@/lib/db/products";
import type { CartItem, Inventory, Product } from "@/types/db";
import { getFirstImage } from "@/lib/db/images";

type CartLine = CartItem & {
  available: boolean;
  unit_price: number;
  total_price: number;
  variant: Inventory | null;
  product: Product | null;
  image: string | null;
};

export async function POST(req: NextRequest) {
  const { cart, currency } = (await req.json()) as {
    cart: CartItem[];
    currency?: "VND" | "USD";
  };

  const isUSD = currency === "USD";

  const items: CartLine[] = await Promise.all(
    cart.map(async (item): Promise<CartLine> => {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
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
      const variant = await getVariantById(item.variant_id);

      if (!variant) {
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

      const product = await getProduct(variant.product_slug);

      const image = await getFirstImage(
        variant.product_slug,
        variant.value1,
        variant.value2
      );

      const price = isUSD && variant.priceUSD ? variant.priceUSD : (variant.priceVND ?? 0);

      return {
        ...item,
        available: true,
        quantity: item.quantity,
        unit_price: price,
        total_price: price * item.quantity,
        image: image?.url_thumb ?? null,
        product,
        variant,
      };
    })
  );

  return NextResponse.json(items);
}