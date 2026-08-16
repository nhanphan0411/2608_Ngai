"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCart } from "@/lib/cart";
import CartDrawer from "@/components/CartDrawer";

type Child = { label: string; href: string | null };
type NavItem = { label: string; href: string | null; children: Child[] };

export default function Header() {
  const pathname = usePathname();

  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [navTree, setNavTree] = useState<NavItem[]>([]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  function toggleGroup(label: string) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  useEffect(() => {
    fetch("/api/nav")
      .then((r) => r.json() as Promise<NavItem[]>)
      .then(setNavTree);
  }, []);

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

  const isActive = (href: string | null) =>
    !!href && (pathname === href || pathname.startsWith(`${href}/`));

  // Renders a top-level item; if it has children, it's a collapsible toggle
  // Renders a top-level item; if it has children, it's a collapsible toggle
  function renderNavGroup(item: NavItem, onNavigate: () => void) {
    const hasChildren = item.children.length > 0;
    const isOpen = !!openGroups[item.label];

    if (!hasChildren) {
      return (
        <Link
          key={item.label}
          href={item.href ?? "#"}
          onClick={onNavigate}
          className={`block border-b border-black px-4 py-3 text-sm ${isActive(item.href) ? "bg-black text-white" : "hover:bg-gray-100"
            }`}
        >
          {item.label}
        </Link>
      );
    }

    return (
      <div key={item.label}>
        <button
          type="button"
          onClick={() => toggleGroup(item.label)}
          aria-expanded={isOpen}
          className={`flex w-full items-center justify-between border-b border-black px-4 py-3 text-left text-sm ${isActive(item.href) ? "bg-black text-white" : "hover:bg-gray-100"
            }`}
        >
          <span>{item.label}</span>
          <span
            className={`transition-transform duration-300 ease-in-out ${isOpen ? "rotate-45" : "rotate-0"
              }`}
          >
            +
          </span>
        </button>

        {/* Always mounted; grid-rows animates 0fr <-> 1fr for a smooth height transition */}
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
        >
          <div className="overflow-hidden">
            {item.children.map((child) => (
              <Link
                key={child.label}
                href={child.href ?? "#"}
                onClick={onNavigate}
                className={`block border-b border-black py-3 pl-8 pr-4 text-sm ${isActive(child.href) ? "bg-black text-white" : "text-gray-700 hover:bg-gray-100"
                  }`}
              >
                {child.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ================= MOBILE HEADER ================= */}
      <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-black bg-[#F2F2F2] md:hidden">
        <div className="flex h-full items-center justify-between px-4">

          {/* Logo */}
          <Link href="/" onClick={() => setMenuOpen(false)}>
            <img
              src="https://pub-6dc4b85e0fa049fe813176c2b710444c.r2.dev/Homepage/logo_dark.png"
              alt="Ngài"
              className="w-[100px]"
            />
          </Link>

          {/* Cart + Menu */}
          <div className="flex items-center gap-2">

            {/* Cart */}
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label={`Open cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}
              className="relative flex h-9 items-center justify-center border border-black px-2.5"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437m0 0L6.75 14.25h10.5l2.25-9H5.106ZM6.75 14.25l-.75 3h12.75M9 20.25h.008M18 20.25h.008"
                />
              </svg>

              {cartCount > 0 && <span className="ml-1 text-xs">{cartCount}</span>}
            </button>

            {/* Menu */}
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              className="border border-black px-3 py-1.5 text-sm"
            >
              Menu
            </button>

          </div>
        </div>

        {/* Mobile navigation */}
        {menuOpen && (
          <nav className="border-b border-black bg-white">
            {navTree.map((item) => renderNavGroup(item, () => setMenuOpen(false)))}
          </nav>
        )}
      </header>

      {/* ================= DESKTOP SIDEBAR ================= */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r border-black md:block">
        {/* Vertical logo */}
        <Link href="/" className="absolute left-20 top-5">
          <img
            src="https://pub-6dc4b85e0fa049fe813176c2b710444c.r2.dev/Homepage/logo_dark.png"
            alt="Ngài"
            className="w-[140px] origin-top-left rotate-90"
          />
        </Link>

        {/* Centered navigation */}
        <nav className="absolute left-4 top-1/2 w-[calc(100%-2rem)] -translate-y-1/2 border border-black cursor-pointer">
          {navTree.map((item) => renderNavGroup(item, () => { }))}

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={`Open cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}
            className="relative flex h-9 items-center justify-center px-4 py-3 cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437m0 0L6.75 14.25h10.5l2.25-9H5.106ZM6.75 14.25l-.75 3h12.75M9 20.25h.008M18 20.25h.008"
              />
            </svg>

            {cartCount > 0 && <span className="ml-1 text-xs">{cartCount}</span>}
          </button>
        </nav>
      </aside>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}