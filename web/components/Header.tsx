"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCart } from "@/lib/cart";

const navLinks = [
  { href: "/products", label: "All Products" },
  { href: "/collections", label: "Collections" },
  { href: "/categories", label: "Categories" },
];

export default function Header() {
  const pathname = usePathname();

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

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* ================= MOBILE HEADER ================= */}
      <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-black bg-white md:hidden">
        <div className="flex h-full items-center justify-between px-4">
          {/* Logo */}
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
          >
            <img
              src="https://pub-6dc4b85e0fa049fe813176c2b710444c.r2.dev/Homepage/logo_dark.png"
              alt="Ngài"
              className="w-[100px]"
            />
          </Link>

          {/* Menu button */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            className="border border-black px-3 py-1.5 text-sm"
          >
            Menu
          </button>
        </div>

        {/* Mobile navigation */}
        {menuOpen && (
          <nav className="border-b border-black bg-white">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block border-b border-black px-4 py-3 text-sm last:border-b-0 ${
                  isActive(link.href)
                    ? "bg-black text-white"
                    : "hover:bg-gray-100"
                }`}
              >
                {link.label}
              </Link>
            ))}

            <Link
              href="/cart"
              onClick={() => setMenuOpen(false)}
              className={`block px-4 py-3 text-sm ${
                pathname === "/cart"
                  ? "bg-black text-white"
                  : "hover:bg-gray-100"
              }`}
            >
              {cartLabel}
            </Link>
          </nav>
        )}
      </header>

      {/* ================= DESKTOP SIDEBAR ================= */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r border-black bg-white md:block">
        {/* Vertical logo */}
        <Link href="/" className="absolute left-20 top-5">
          <img
            src="https://pub-6dc4b85e0fa049fe813176c2b710444c.r2.dev/Homepage/logo_dark.png"
            alt="Ngài"
            className="w-[140px] origin-top-left rotate-90"
          />
        </Link>

        {/* Centered navigation */}
        <nav className="absolute left-4 top-1/2 w-[calc(100%-2rem)] -translate-y-1/2 border border-black">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block border-b border-black px-4 py-3 text-sm last:border-b-0 ${
                isActive(link.href)
                  ? "bg-black text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {link.label}
            </Link>
          ))}

          <Link
            href="/cart"
            className={`block px-4 py-3 text-sm ${
              pathname === "/cart"
                ? "bg-black text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {cartLabel}
          </Link>
        </nav>
      </aside>
    </>
  );
}