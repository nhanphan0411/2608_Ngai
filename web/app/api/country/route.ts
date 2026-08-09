import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const h = await headers();

  const country =
    h.get("cf-ipcountry") || // Cloudflare
    h.get("x-vercel-ip-country") || // Vercel
    "VN";

  return NextResponse.json({
    country,
    currency: country === "VN" ? "VND" : "USD",
  });
}