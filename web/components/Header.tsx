"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCart } from "@/lib/cart";
import CountrySelector from "@/components/CountrySelector";

export default function Header() {
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    function updateCount() {
      const cart = getCart();
      setCartCount(cart.reduce((sum, item) => sum + item.quantity, 0));
    }

    updateCount();

    window.addEventListener("cart-change", updateCount);
    return () => window.removeEventListener("cart-change", updateCount);
  }, []);

  return (
    <header className="border-b">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl">
          Ngài
        </Link>

        <nav className="flex items-center gap-6 text-sm">
          <Link href="/products" className="hover:underline">
            All Products
          </Link>
          <Link href="/collections" className="hover:underline">
            Collections
          </Link>
          <Link href="/categories" className="hover:underline">
            Categories
          </Link>
          <Link href="/cart" className="hover:underline">
            Cart{cartCount > 0 ? ` (${cartCount})` : ""}
          </Link>
          <CountrySelector />
        </nav>
      </div>
    </header>
  );
}