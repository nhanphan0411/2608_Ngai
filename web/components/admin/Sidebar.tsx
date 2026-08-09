"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    title: "Collections",
    href: "/admin/collections",
  },
  
  {
    title: "Products",
    href: "/admin/products",
  },
  {
    title: "Inventory",
    href: "/admin/inventory",
  },
  {
    title: "Orders",
    href: "/admin/orders",
  },
  {
    title: "Settings",
    href: "/admin/settings",
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-white">
      <div className="border-b p-6">
        <h1 className="text-xl font-bold">
          Ngai Store
        </h1>

        <p className="text-sm text-gray-500">
          Admin Dashboard
        </p>
      </div>

      <nav className="p-3 space-y-1">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-4 py-3 transition
                ${
                  active
                    ? "bg-black text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
            >
              {item.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}