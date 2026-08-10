"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCart } from "@/lib/cart";
import CountrySelector from "@/components/CountrySelector";

const navLinks = [
  { href: "/products", label: "All Products" },
  { href: "/collections", label: "Collections" },
  { href: "/categories", label: "Categories" },
];

export default function Header() {
  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function updateCount() {
      const cart = getCart();
      setCartCount(cart.reduce((sum, item) => sum + item.quantity, 0));
    }

    updateCount();

    window.addEventListener("cart-change", updateCount);
    return () => window.removeEventListener("cart-change", updateCount);
  }, []);

  const cartLabel = `Cart${cartCount > 0 ? ` (${cartCount})` : ""}`;

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 border-b bg-white md:inset-y-0 md:right-auto md:h-screen md:w-[20vw] md:border-b-0 md:border-r">
      {/* Mobile top bar */}
      <div className="flex h-16 items-center justify-between px-4 md:hidden">
        <Link href="/" className="text-xl font-bold" onClick={() => setMenuOpen(false)}>
          Ngài
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          className="rounded border px-3 py-1.5 text-sm"
        >
          Menu
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <nav
          id="mobile-menu"
          className="absolute inset-x-0 top-16 flex flex-col gap-1 border-b bg-white px-4 py-3 text-sm md:hidden"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="py-2 hover:underline"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/cart" className="py-2 hover:underline" onClick={() => setMenuOpen(false)}>
            {cartLabel}
          </Link>
          <div className="pt-2">
            <CountrySelector />
          </div>
        </nav>
      )}

      {/* Desktop column */}
      <div className="hidden h-full flex-col px-6 py-8 md:flex">
        <Link href="/" className="text-xl font-bold">
          Ngài
        </Link>

        <nav className="mt-10 flex flex-col gap-4 text-sm">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:underline">
              {link.label}
            </Link>
          ))}
          <Link href="/cart" className="hover:underline">
            {cartLabel}
          </Link>
        </nav>

        <div className="mt-auto pt-6">
          <CountrySelector />
        </div>
      </div>
    </header>
  );
}