import { NextRequest, NextResponse } from "next/server";
import { updateSortOrders } from "@/lib/db/images";

export async function PATCH(req: NextRequest) {
  const { order } = (await req.json()) as any;

  if (!Array.isArray(order)) {
    return NextResponse.json({ error: "order array required" }, { status: 400 });
  }

  await updateSortOrders(order);
  return NextResponse.json({ success: true });
}