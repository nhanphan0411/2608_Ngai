import { NextRequest, NextResponse } from "next/server";
import { updateOrderStatus } from "@/lib/db/orders";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await req.json()) as { payment_status: string };

  await updateOrderStatus(Number(id), body.payment_status);

  return NextResponse.json({ success: true });
}