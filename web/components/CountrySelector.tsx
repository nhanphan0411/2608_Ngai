"use client";

import { useEffect, useState } from "react";
import { setCurrency } from "@/lib/currency";
import { COUNTRY_CODES, getCurrencyFromCountry } from "@/lib/countries";

type Country = {
    code: string;
    name: string;
};

function buildCountryList(): Country[] {
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" });

    return COUNTRY_CODES
        .map((code) => ({
            code,
            name: displayNames.of(code) ?? code,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

export default function CountrySelector() {
    const [countries, setCountries] = useState<Country[]>([]);
    const [country, setCountry] = useState("");

    useEffect(() => {
        async function init() {
            // Country name list — generated locally, no network call
            setCountries(buildCountryList());

            const saved = localStorage.getItem("country");

            if (saved) {
                setCountry(saved);
                setCurrency(getCurrencyFromCountry(saved));
                return;
            }

            // No saved preference yet — ask the server for IP-based geo
            try {
                const geoRes = await fetch("/api/country");
                const geo = await (geoRes.json() as any);

                setCountry(geo.country);
                localStorage.setItem("country", geo.country);
                setCurrency(getCurrencyFromCountry(geo.country));
            } catch (err) {
                // Geo lookup failed — fall back to a safe default instead of crashing
                console.error("Country geo-lookup failed, defaulting to VN:", err);
                setCountry("VN");
                localStorage.setItem("country", "VN");
                setCurrency(getCurrencyFromCountry("VN"));
            }
        }

        init();
    }, []);

    function changeCountry(code: string) {
        setCountry(code);
        localStorage.setItem("country", code);
        setCurrency(getCurrencyFromCountry(code));
    }

    return (
        <select
            value={country}
            onChange={(e) => changeCountry(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
        >
            {countries.map((c) => (
                <option key={c.code} value={c.code}>
                    {c.name}
                </option>
            ))}
        </select>
    );
}