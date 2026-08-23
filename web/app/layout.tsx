import type { Metadata } from "next";
import { Google_Sans_Code} from "next/font/google";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";
import Toast from "@/components/Toast";

const google_sans_code = Google_Sans_Code({
  variable: "--font-google-sans-code",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  adjustFontFallback: false
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
    <html lang="vi" className={`${google_sans_code.variable} h-full antialiased`}>
      <body className="min-h-full font-[family-name:var(--font-google-sans-code)]">
        <SiteChrome>{children}</SiteChrome>
        <Toast />
      </body>
    </html>
  );
}