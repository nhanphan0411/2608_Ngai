import type { Metadata } from "next";
import { Spline_Sans_Mono} from "next/font/google";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";
import Toast from "@/components/Toast";

const spline_san_mono = Spline_Sans_Mono({
  variable: "--font-spline_san_mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Ngài",
  description: "Ngài Web Store",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${spline_san_mono.variable} h-full antialiased`}>
      <body className="min-h-full font-[family-name:var(--font-be-vietnam-pro)]">
        <SiteChrome>{children}</SiteChrome>
        <Toast />
      </body>
    </html>
  );
}