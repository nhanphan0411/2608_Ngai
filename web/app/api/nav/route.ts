import { NextResponse } from "next/server";
import { getNavTree } from "@/lib/db/nav";

export async function GET() {
  const nav = await getNavTree();
  return NextResponse.json(nav);
}