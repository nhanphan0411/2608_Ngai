import { setCurrency } from "@/lib/currency";
import { COUNTRY_CODES, getCurrencyFromCountry } from "@/lib/countries";

const STORAGE_KEY = "country";

export type CountryOption = { code: string; name: string };

export function buildCountryList(): CountryOption[] {
  const displayNames = new Intl.DisplayNames(["en"], { type: "region" });

  return COUNTRY_CODES
    .map((code) => ({
      code,
      name: displayNames.of(code) ?? code,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getCountry(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEY) || "";
}

// The single write path for "the shopper's country" — every selector
// (footer, nav, checkout) and every page that derives pricing/shipping from
// it goes through this, so a change made in any one of them is immediately
// visible everywhere else on the page via the "country-change" event, and
// persists across pages via localStorage.
export function setCountry(code: string) {
  localStorage.setItem(STORAGE_KEY, code);
  setCurrency(getCurrencyFromCountry(code));
  window.dispatchEvent(new Event("country-change"));
}

// Resolves the country on first load: saved preference, else IP geolocation,
// else a safe VN default. Safe to call from multiple mounted selectors on
// the same page — they'll all land on the same persisted value.
export async function initCountry(): Promise<string> {
  const saved = getCountry();

  if (saved) {
    setCurrency(getCurrencyFromCountry(saved));
    return saved;
  }

  try {
    const geoRes = await fetch("/api/country");
    const geo = (await geoRes.json()) as { country: string };

    setCountry(geo.country);
    return geo.country;
  } catch (err) {
    console.error("Country geo-lookup failed, defaulting to VN:", err);
    setCountry("VN");
    return "VN";
  }
}
