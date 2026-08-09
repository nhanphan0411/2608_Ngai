import { NextRequest, NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/db/settings";

export async function GET() {
  return NextResponse.json(await getSettings());
}

export async function PUT(req: NextRequest) {
  const body = await (req.json() as any);
  await updateSettings(body);
  return NextResponse.json({ success: true });
}