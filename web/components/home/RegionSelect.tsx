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

    return COUNTRY_CODES.map((code) => ({
        code,
        name: displayNames.of(code) ?? code,
    })).sort((a, b) => a.name.localeCompare(b.name));
}

export default function RegionSelect({ className = "" }: { className?: string }) {
    const [countries, setCountries] = useState<Country[]>([]);
    const [country, setCountry] = useState("");

    useEffect(() => {
        async function init() {
            setCountries(buildCountryList());

            const saved = localStorage.getItem("country");

            if (saved) {
                setCountry(saved);
                setCurrency(getCurrencyFromCountry(saved));
                return;
            }

            try {
                const geoRes = await fetch("/api/country");
                const geo = (await geoRes.json()) as { country: string };

                setCountry(geo.country);
                localStorage.setItem("country", geo.country);
                setCurrency(getCurrencyFromCountry(geo.country));
            } catch (err) {
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
        <div className="flex w-full flex-row flex-nowrap items-center">
        <span className="w-[20%] shrink-0 sm:hidden">REGION: </span>
        <select
            value={country}
            onChange={(e) => changeCountry(e.target.value)}
            className={`block w-[80%] min-w-0 max-w-full truncate overflow-hidden bg-transparent text-left text-sm uppercase tracking-wide outline-none sm:w-full ${className} cursor-pointer`}
        >
            <option value="" disabled>
                select region
            </option>
            {countries.map((c) => (
                <option key={c.code} value={c.code}>
                    {c.name}
                </option>
            ))}
        </select>
    </div>
    );
}