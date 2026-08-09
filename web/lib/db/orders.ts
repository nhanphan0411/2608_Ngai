import { getDB } from "@/lib/d1";
import {
  Order,
  OrderDetail,
  Inventory,
  CartItem,
  NewOrder,
} from "@/types/db";
import { getVariantById } from "./inventory";

export async function createOrderWithDetails(
  order: NewOrder,
  cart: CartItem[]
): Promise<string> {
  const db = await getDB();
  const publicId = crypto.randomUUID();

  // Prevent duplicate submissions
  if (order.idempotency_key) {
    const existing = await db
      .prepare(`SELECT public_id FROM orders WHERE idempotency_key = ?`)
      .bind(order.idempotency_key)
      .first<{ public_id: string }>();

    if (existing) return existing.public_id;
  }

  let subtotal = 0;

  const lines: Omit<OrderDetail, "id" | "order_id">[] = [];

  for (const item of cart) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error(`Invalid quantity for variant ${item.variant_id}`);
    }

    const variant = (await getVariantById(
      item.variant_id
    )) as Inventory | null;


    if (!variant || variant.status !== "Active") {
      throw new Error(`Variant ${item.variant_id} is not available`);
    }

    if ((variant.stock ?? 0) < item.quantity) {
      throw new Error(`Not enough stock for variant ${item.variant_id}`);
    }

    const isUSD = order.currency === "USD";
    const price = isUSD && variant.priceUSD ? variant.priceUSD : (variant.priceVND ?? 0);

    subtotal += price * item.quantity;

    lines.push({
      variant_id: item.variant_id,
      quantity: item.quantity,
      unit_price: price,
      total_price: price * item.quantity,
    });
  }

  // Insert the order first, on its own — we need its id before we can
  // build the order_details/decrement statements.
  const orderResult = await db
    .prepare(`
      INSERT INTO orders (
        public_id,
        created_at,
        payment_status,
        payment_method,
        customer_name,
        email,
        phone,
        address,
        notes,
        subtotal,
        currency,
        idempotency_key,
        shipping_fee
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      publicId,
      order.created_at,
      order.payment_status,
      order.payment_method,
      order.customer_name,
      order.email,
      order.phone,
      order.address,
      order.notes,
      subtotal,
      order.currency,
      order.idempotency_key ?? null,
      order.shipping_fee ?? 0
    )
    .run();
  const orderId = Number(orderResult.meta.last_row_id);

  if (lines.length === 0) {
    return publicId;
  }

  // Build one batch containing: all order_details inserts + all stock
  // decrements. D1 batches run as a single transaction, but only rolls
  // back on a thrown error — a decrement matching 0 rows (stock ran out
  // between our check above and now) succeeds silently with changes: 0.
  // So we check that ourselves afterward and manually compensate.
  const insertDetailStmt = db.prepare(`
    INSERT INTO order_details
    (order_id, variant_id, quantity, unit_price, total_price)
    VALUES (?, ?, ?, ?, ?)
  `);

  const decrementStmt = db.prepare(`
    UPDATE inventory
    SET stock = stock - ?
    WHERE id = ? AND stock >= ?
  `);

  const batchStatements = [
    ...lines.map((line) =>
      insertDetailStmt.bind(
        orderId,
        line.variant_id,
        line.quantity,
        line.unit_price,
        line.total_price
      )
    ),
    ...lines.map((line) =>
      decrementStmt.bind(line.quantity, line.variant_id, line.quantity)
    ),
  ];

  const batchResults = await db.batch(batchStatements);

  // The decrement results are the second half of batchResults, in the
  // same order as `lines`.
  const decrementResults = batchResults.slice(lines.length);

  const failedLines = lines.filter(
    (_, i) => (decrementResults[i].meta.changes ?? 0) === 0
  );

  if (failedLines.length > 0) {
    // Stock ran out for at least one item after our initial check
    // (race condition). Undo everything: delete the order (cascades to
    // order_details via ON DELETE CASCADE) and restore stock for any
    // lines that DID successfully decrement.
    const succeededLines = lines.filter(
      (_, i) => (decrementResults[i].meta.changes ?? 0) > 0
    );

    const restoreStmt = db.prepare(`
      UPDATE inventory SET stock = stock + ? WHERE id = ?
    `);

    await db.batch([
      db.prepare(`DELETE FROM orders WHERE id = ?`).bind(orderId),
      ...succeededLines.map((line) =>
        restoreStmt.bind(line.quantity, line.variant_id)
      ),
    ]);

    const names = failedLines.map((l) => l.variant_id).join(", ");
    throw new Error(`Not enough stock for variant(s): ${names}`);
  }

  return publicId;
}

export async function getOrder(id: number): Promise<Order | null> {
  const db = await getDB();

  return (await db
    .prepare(`SELECT * FROM orders WHERE public_id = ?`)
    .bind(id)
    .first()) as Order | null;
}

export async function getOrderWithItems(publicId: string) {
  const db = await getDB();

  const order = await db
    .prepare(`SELECT * FROM orders WHERE public_id = ?`)
    .bind(publicId)
    .first<Order>();

  if (!order) return null;

  const { results } = await db
    .prepare(`
SELECT
  od.id,
  od.quantity,
  od.unit_price,
  od.total_price,

  i.id                AS variant_id,
  i.variant1,
  i.value1,
  i.variant2,
  i.value2,
  i.variant3,
  i.value3,
  i.stock,
  i.priceVND,
  i.priceUSD,
  i.status,

  p.id                AS product_id,
  p.product_name,
  p.product_slug,
  p.description,
  p.shipping,
  p.sizeGuide,
  p.notes,

  (
    SELECT url_thumb
    FROM images img
    WHERE img.product_slug = i.product_slug
      AND (
        img.value1 IS NULL
        OR img.value1 = i.value1
      )
      AND (
        img.value2 IS NULL
        OR img.value2 = i.value2
      )
    ORDER BY sort_order
    LIMIT 1
  ) AS image

FROM order_details od

JOIN inventory i
ON od.variant_id = i.id

JOIN products p
ON p.product_slug = i.product_slug

WHERE od.order_id = ?

ORDER BY od.id
`)
    .bind(order.id)
    .all();

  const items = (results as any[]).map((row) => ({
    available: true,

    quantity: row.quantity,
    unit_price: row.unit_price,
    total_price: row.total_price,

    image: row.image,

    product: {
      id: row.product_id,
      product_name: row.product_name,
      product_slug: row.product_slug,
      description: row.description,
      shipping: row.shipping,
      sizeGuide: row.sizeGuide,
      notes: row.notes,
    },

    variant: {
      id: row.variant_id,
      variant1: row.variant1,
      value1: row.value1,
      variant2: row.variant2,
      value2: row.value2,
      variant3: row.variant3,
      value3: row.value3,
      stock: row.stock,
      priceVND: row.priceVND,
      priceUSD: row.priceUSD,
      status: row.status,
    },
  }));

  return {
    ...order,
    items,
  };
}

export async function getAllOrdersAdmin(): Promise<Order[]> {
  const db = await getDB();
  const { results } = await db
    .prepare(`SELECT * FROM orders ORDER BY id DESC`)
    .all();
  return results as unknown as Order[];
}

export async function updateOrderStatus(
  id: number,
  paymentStatus: string
): Promise<void> {
  const db = await getDB();

  await db
    .prepare(`UPDATE orders SET payment_status = ? WHERE id = ?`)
    .bind(paymentStatus, id)
    .run();
}