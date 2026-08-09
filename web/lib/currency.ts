export type Currency = "VND" | "USD";

const STORAGE_KEY = "currency";

export function getCurrency(): Currency {
  if (typeof window === "undefined") return "VND";

  const saved = localStorage.getItem(STORAGE_KEY);

  return saved === "VND" ? "VND" : "USD";
}

export function setCurrency(currency: Currency) {
  localStorage.setItem(STORAGE_KEY, currency);

  window.dispatchEvent(new Event("currency-change"));
}

export function formatPrice(
  priceVND: number | null,
  priceUSD: number | null,
  currency: Currency
) {
  if (currency === "USD" && (priceUSD === null || priceUSD === undefined || priceUSD === 0)) {
    // No USD price set — fall back to VND rather than showing a misleading $0.00
    return `${(priceVND ?? 0).toLocaleString()} VND`;
  }

  if (currency === "VND") {
    return `${(priceVND ?? 0).toLocaleString()} VND`;
  }

  return `$${(priceUSD ?? 0).toFixed(2)}`;
}