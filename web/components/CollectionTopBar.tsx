"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type CollectionLink = { collection_name: string; collection_slug: string };

/**
 * Sits above the editorial photos on a collection page. Left half is
 * the current collection name with a slide-down list of every other
 * live collection (same grid-rows accordion technique + link styling
 * as the site's common nav in Header.tsx, so it feels consistent);
 * right half smooth-scrolls down to the product grid
 * (id="shop-this-collection", set on that section in the page).
 */
export default function CollectionTopBar({
    current,
    others,
}: {
    current: CollectionLink;
    others: CollectionLink[];
}) {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    function scrollToProducts(e: React.MouseEvent) {
        e.preventDefault();
        document.getElementById("shop-this-collection")?.scrollIntoView({ behavior: "smooth" });
    }

    return (
        <div
            id="collection-top-bar"
            className="sticky top-16 md:top-0 z-40 bg-[#F2F2F2] border-b border-black"
        >
            <div className="flex flex-row w-full items-stretch">
                <div ref={wrapperRef} className="w-1/2 relative border-r border-black px-2 py-2">
                    <button
                        type="button"
                        onClick={() => setOpen((o) => !o)}
                        aria-expanded={open}
                        className="flex items-center gap-2 text-sm uppercase tracking-wide cursor-pointer"
                    >
                        {current.collection_name}
                        {others.length > 0 && (
                            <span
                                className={`inline-block h-0 w-0
                border-l-4 border-r-4
                border-l-transparent border-r-transparent
                border-t-[6px] border-t-black
                transition-transform duration-300 ease-in-out
                ${open ? "rotate-180" : "rotate-0"}
              `}
                            />
                        )}
                    </button>

                    {others.length > 0 && (
                        // Always mounted; grid-rows animates 0fr <-> 1fr for a smooth
                        // slide-down/up, spanning the full width of this left half —
                        // same technique and link styling as Header.tsx's nav groups.
                        <div
                            className={`absolute left-0 right-0 top-full z-20 sm:w-[100.2%] w-[201.2%] grid border-r transition-[grid-template-rows] duration-300 ease-in-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                                }`}
                        >
                            <div className="overflow-hidden border-t border-black">
                                {others.map((c) => {
                                    const href = `/collections/${c.collection_slug}`;
                                    const isActive = pathname === href || pathname.startsWith(`${href}/`);

                                    return (
                                        <Link
                                            key={c.collection_slug}
                                            href={href}
                                            onClick={() => setOpen(false)}
                                            className={`block border-b border-black px-2 py-1 text-sm ${isActive ? "bg-black text-white" : "hover:bg-gray-100 cursor-pointer"
                                                }`}
                                        >
                                            {c.collection_name}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="w-1/2 pl-4 py-2">
                    <a
                        href="#shop-this-collection"
                        onClick={scrollToProducts}
                        className="block text-sm uppercase text-start tracking-wide underline-offset-4"
                    >
                        Shop This Collection
                    </a>
                </div>
            </div>
        </div>
    );
}