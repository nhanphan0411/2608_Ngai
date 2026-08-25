"use client";

import { useEffect, useState } from "react";
import {
    buildCountryList,
    getCountry,
    initCountry,
    setCountry,
    type CountryOption,
} from "@/lib/country";

type Variant = "footer" | "nav" | "checkout";

// One control, one source of truth (see lib/country.ts) — the display
// differs per page via `variant`, but selecting a country here changes it
// everywhere else it's shown, including the checkout form. That's what
// makes shipping-fee calculation trustworthy: whichever country the
// shopper picked is the same one the order form submits.
export default function CountrySelector({
    variant = "footer",
    className = "",
}: {
    variant?: Variant;
    className?: string;
}) {
    const [countries, setCountries] = useState<CountryOption[]>([]);
    const [country, setCountryState] = useState("");

    useEffect(() => {
        setCountries(buildCountryList());

        const saved = getCountry();

        if (saved) {
            setCountryState(saved);
        } else {
            initCountry().then(setCountryState);
        }

        function onCountryChange() {
            setCountryState(getCountry());
        }

        window.addEventListener("country-change", onCountryChange);
        return () => window.removeEventListener("country-change", onCountryChange);
    }, []);

    function handleChange(code: string) {
        setCountry(code);
        setCountryState(code);
    }

    if (variant === "nav") {
        return (
            <div className="flex w-full flex-row flex-nowrap items-center">
                <span className="max-sm:w-[50%] shrink-0 sm:hidden">DELIVER TO: </span>
                <select
                    value={country}
                    onChange={(e) => handleChange(e.target.value)}
                    className={`block max-sm:w-[50%] min-w-0 max-w-full truncate overflow-hidden bg-transparent text-left text-sm uppercase tracking-wide outline-none sm:w-full ${className} cursor-pointer`}
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

    if (variant === "checkout") {
        return (
            <select
                name="country"
                required
                value={country}
                onChange={(e) => handleChange(e.target.value)}
                className={`w-full appearance-none border border-black bg-white px-3 py-3 text-sm outline-none focus:bg-gray-50 ${className}`}
            >
                <option value="" disabled>
                    Country
                </option>
                {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                        {c.name}
                    </option>
                ))}
            </select>
        );
    }

    // "footer" (default)
    return (
        <select
            value={country}
            onChange={(e) => handleChange(e.target.value)}
            className={`block truncate px-2 py-0 text-sm max-w-[100px] border rounded border-dotted ${className}`}
        >
            {countries.map((c) => (
                <option key={c.code} value={c.code}>
                    {c.name}
                </option>
            ))}
        </select>
    );
}
