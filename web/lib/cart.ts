export interface CartItem {
  variant_id: number;
  quantity: number;
}

const CART_KEY = "cart";

export function getCart(): CartItem[] {
  const cart = localStorage.getItem(CART_KEY);

  if (!cart) {
    return [];
  }

  return JSON.parse(cart);
}

export function saveCart(cart: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event("cart-change"));
}

export function addToCart(variantId: number) {
  const cart = getCart();

  const item = cart.find(
    (item) => item.variant_id === variantId
  );

  if (item) {
    item.quantity++;
  } else {
    cart.push({
      variant_id: variantId,
      quantity: 1,
    });
  }

  saveCart(cart);
}

export function updateQuantity(
  variantId: number,
  quantity: number
) {
  const cart = getCart();

  const item = cart.find(
    (item) => item.variant_id === variantId
  );

  if (!item) return;

  item.quantity = quantity;

  saveCart(cart);
}

export function removeFromCart(variantId: number) {
  const cart = getCart().filter(
    (item) => item.variant_id !== variantId
  );

  saveCart(cart);
}

export function clearCart() {
  localStorage.removeItem(CART_KEY);
}

export function increaseQuantity(variantId: number) {
  const cart = getCart();

  const item = cart.find(
    (item) => item.variant_id === variantId
  );

  if (!item) return;

  item.quantity++;

  saveCart(cart);
}

export function decreaseQuantity(variantId: number) {
  const cart = getCart();

  const item = cart.find(
    (item) => item.variant_id === variantId
  );

  if (!item) return;

  item.quantity--;

  if (item.quantity <= 0) {
    removeFromCart(variantId);
    return;
  }

  saveCart(cart);
}