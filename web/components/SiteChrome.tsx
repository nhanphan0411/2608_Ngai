"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function SiteChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideChrome =
    pathname === "/" || pathname === "/home" || pathname.startsWith("/admin");

  return (
    <>
      {!hideChrome && <Header />}

      <div
        className={`flex min-h-screen flex-col ${hideChrome ? "" : "pt-16 md:ml-62 md:pt-0"
          }`}
      >
        <div className="flex-1">{children}</div>

        {!hideChrome && <Footer />}
      </div>
    </>
  );
}