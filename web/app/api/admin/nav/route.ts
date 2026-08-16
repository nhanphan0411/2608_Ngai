import { NextRequest, NextResponse } from "next/server";
import { getNavTree, saveNavTree } from "@/lib/db/nav";

export async function GET() {
  return NextResponse.json(await getNavTree());
}

export async function PUT(req: NextRequest) {
  const body = await (req.json() as any);
  await saveNavTree(body);
  return NextResponse.json({ success: true });
}