"use client";

import Link from "next/link";

type Props = {
  items: any[];
  editable?: boolean;

  onIncrease?: (variantId: number) => void;
  onDecrease?: (variantId: number) => void;
  onRemove?: (variantId: number) => void;

  subtotal?: number;
  showCheckout?: boolean;
  currency?: string;
  shippingFee?: number;
};

export default function OrderItems({
  items,
  editable = false,
  onIncrease,
  onDecrease,
  onRemove,
  subtotal,
  showCheckout = false,
  currency = "VND",
  shippingFee,
}: Props) {
  function formatMoney(amount: number) {
    return currency === "USD"
      ? `$${amount.toFixed(2)}`
      : `${amount.toLocaleString()} VND`;
  }

  return (
    <div className="w-full">

      {/* ================================================= */}
      {/* TABLE HEADER */}
      {/* ================================================= */}

      <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-dotted border-black py-3 text-[10px] font-medium uppercase tracking-wide">
        <div>Item</div>

        <div className="w-24 text-center">
          Quantity
        </div>

        <div className="w-24 text-right">
          Amount
        </div>
      </div>

      {/* ================================================= */}
      {/* ITEMS */}
      {/* ================================================= */}

      {items.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500">
          Your cart is empty.
        </div>
      ) : (
        items.map((item) => (
          <div
            key={item.variant?.id ?? item.variant_id}
            className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-dotted border-black py-4"
          >
            {/* ============================================= */}
            {/* ITEM */}
            {/* ============================================= */}

            {!item.available ||
            !item.product ||
            !item.variant ? (
              <div className="col-span-3 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  This item is no longer available
                </p>

                {editable && (
                  <button
                    type="button"
                    onClick={() =>
                      onRemove?.(item.variant_id)
                    }
                    className="text-xs underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="flex min-w-0 items-center gap-3">

                  {/* Image */}
                  <div className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden bg-gray-100">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.product.product_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                        No image
                      </div>
                    )}
                  </div>

                  {/* Product information */}
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-medium">
                      {item.product.product_name}
                    </h2>

                    <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                      {item.variant.variant1 &&
                        item.variant.value1 && (
                          <p>
                            {item.variant.variant1}:{" "}
                            {item.variant.value1}
                          </p>
                        )}

                      {item.variant.variant2 &&
                        item.variant.value2 && (
                          <p>
                            {item.variant.variant2}:{" "}
                            {item.variant.value2}
                          </p>
                        )}

                      {item.variant.variant3 &&
                        item.variant.value3 && (
                          <p>
                            {item.variant.variant3}:{" "}
                            {item.variant.value3}
                          </p>
                        )}
                    </div>

                    

                    {editable && (
                      <button
                        type="button"
                        onClick={() =>
                          onRemove?.(item.variant_id)
                        }
                        className="mt-2 text-xs underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* ========================================= */}
                {/* QUANTITY */}
                {/* ========================================= */}

                <div className="flex w-24 items-center justify-center">
                  {editable ? (
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() =>
                          onDecrease?.(item.variant_id)
                        }
                        className="flex h-7 w-7 items-center justify-center border border-black text-sm"
                      >
                        −
                      </button>

                      <span className="flex h-7 w-8 items-center justify-center text-xs">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        disabled={
                          item.quantity >=
                          item.variant.stock
                        }
                        onClick={() =>
                          onIncrease?.(item.variant_id)
                        }
                        className={`flex h-7 w-7 items-center justify-center border border-black text-sm ${
                          item.quantity >=
                          item.variant.stock
                            ? "cursor-not-allowed opacity-30"
                            : ""
                        }`}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs">
                      {item.quantity}
                    </span>
                  )}
                </div>

                {/* ========================================= */}
                {/* AMOUNT */}
                {/* ========================================= */}

                <div className="w-24 text-right text-sm">
                  {formatMoney(
                    item.unit_price * item.quantity
                  )}
                </div>
              </>
            )}
          </div>
        ))
      )}

      {/* ================================================= */}
      {/* SUMMARY */}
      {/* ================================================= */}

      {subtotal !== undefined && (
        <div className="space-y-2 py-5">

          {/* Subtotal */}
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium uppercase tracking-wide">
              Subtotal
            </span>

            <span>
              {formatMoney(subtotal)}
            </span>
          </div>

          {/* Shipping */}
          {shippingFee !== undefined && (
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span className="uppercase tracking-wide">
                Shipping
              </span>

              <span>
                {shippingFee === 0
                  ? "Free"
                  : formatMoney(shippingFee)}
              </span>
            </div>
          )}

          {/* Total */}
          {shippingFee !== undefined && (
            <div className="flex items-center justify-between border-t border-black border-dotted pt-4 text-sm font-medium">
              <span className="uppercase tracking-wide">
                Total
              </span>

              <span>
                {formatMoney(
                  subtotal + shippingFee
                )}
              </span>
            </div>
          )}

          {/* Checkout */}
          {showCheckout && (
            <Link
              href="/checkout"
              className="mt-5 block w-full bg-black px-4 py-4 text-center text-sm font-medium uppercase tracking-wide text-white transition hover:bg-gray-800"
            >
              Checkout
            </Link>
          )}
        </div>
      )}
    </div>
  );
}