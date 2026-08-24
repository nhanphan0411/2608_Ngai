"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import RegionSelect from "./RegionSelect";

const navLinkClass =
  "flex items-center justify-start bg-[#F2F2F2]  px-3 py-1 text-sm uppercase tracking-wide leading-none text-left";

type NavItem = { label: string; href: string | null; children: { label: string; href: string | null }[] };

// Fallback destinations, used until the admin-configured nav loads (or if
// a given item hasn't been set up in admin yet).
const DEFAULT_HREFS: Record<string, string> = {
  shop: "/products",
  discover: "/collections",
  about: "/about",
};

/** Pulls the current href for a given home-nav slot out of the admin-configured
 * nav tree (see /admin/nav), matching by label, case-insensitively. Falls back
 * to the slot's default route if that label hasn't been configured. */
function useHomeNavLinks() {
  const [navTree, setNavTree] = useState<NavItem[]>([]);

  useEffect(() => {
    fetch("/api/nav")
      .then((r) => r.json() as Promise<NavItem[]>)
      .then(setNavTree)
      .catch(() => {});
  }, []);

  function hrefFor(label: keyof typeof DEFAULT_HREFS) {
    const match = navTree.find((item) => item.label.trim().toLowerCase() === label);
    return match?.href?.trim() || DEFAULT_HREFS[label];
  }

  return { shop: hrefFor("shop"), discover: hrefFor("discover"), about: hrefFor("about") };
}

export function DesktopNav() {
  const links = useHomeNavLinks();

  return (
    <nav className="grid w-full grid-cols-4 gap-2 ">
      <Link href={links.shop} className={navLinkClass}>
        shop
      </Link>

      <Link href={links.discover} className={navLinkClass}>
        discover
      </Link>

      <Link href={links.about} className={navLinkClass}>
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
  const links = useHomeNavLinks();

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
            href={links.shop}
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            Shop
          </Link>

          <Link
            href={links.discover}
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            Discover
          </Link>

          <Link
            href={links.about}
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