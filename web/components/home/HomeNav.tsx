"use client";

import Link from "next/link";
import { useState } from "react";
import RegionSelect from "./RegionSelect";

const navLinkClass =
  "flex items-center justify-start bg-[#F2F2F2]  px-3 py-1 text-sm uppercase tracking-wide leading-none text-left";

export function DesktopNav() {
  return (
    <nav className="grid w-full grid-cols-4 gap-2 ">
      <Link href="/products" className={navLinkClass}>
        shop
      </Link>

      <Link href="/collections" className={navLinkClass}>
        discover
      </Link>

      <Link href="/about" className={navLinkClass}>
        about
      </Link>

      <div className="flex min-w-0 items-center justify-start px-3 py-0 bg-[#F2F2F2] ">
        <RegionSelect className="w-full min-w-0 text-left" />
      </div>
    </nav>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);

  const itemClass =
    "block border-b border-black px-3 py-2 text-left text-sm uppercase tracking-wide hover:bg-gray-100";

  return (
    <div className="relative w-full">
      {/* Menu */}
      <div
        className={`
    absolute bottom-full left-0 z-40 w-full
    origin-bottom
    transition-all duration-300 ease-in-out
    ${open
            ? "scale-y-100 opacity-100 pointer-events-auto"
            : "scale-y-0 opacity-0 pointer-events-none"
          }
  `}
      >
        <nav className="w-full border-x border-t border-black bg-[#F2F2F2]">
          <Link
            href="/collections"
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            Shop
          </Link>

          <Link
            href="/categories"
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            Discover
          </Link>

          <Link
            href="/about"
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            About
          </Link>

          <div className="px-3 py-2 text-sm">
            <RegionSelect className="w-full min-w-0 text-left" />
          </div>
        </nav>
      </div>

      {/* ENTER SITE — stays fixed in this position */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="relative z-50 w-full border border-black bg-[#F2F2F2] px-3 py-1.5 text-left text-sm uppercase tracking-wide"
      >
        ENTER SITE
      </button>
    </div>
  );
}