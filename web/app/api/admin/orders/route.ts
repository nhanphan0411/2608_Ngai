import { NextResponse } from "next/server";
import { getAllOrdersAdmin } from "@/lib/db/orders";

export async function GET() {
  return NextResponse.json(await getAllOrdersAdmin());
}