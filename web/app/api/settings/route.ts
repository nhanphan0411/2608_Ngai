import { NextResponse } from "next/server";
import { getSettings } from "@/lib/db/settings";

export async function GET() {
  return NextResponse.json(await getSettings());
}