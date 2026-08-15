"use client";

import { useEffect, useState } from "react";
import CountrySelector from "@/components/CountrySelector";

export default function Footer() {
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings);
  }, []);

  if (!settings) return null;

  return (
    <footer className="border-t py-10 text-sm text-gray-500">
      <div className="max-w-6xl mx-auto px-6 space-y-2">
        <p className="font-semibold text-gray-800">{settings.store_name}</p>
        {settings.store_description && <p>{settings.store_description}</p>}
        <div className="flex gap-4 pt-2">
          {settings.contact_email && <span>{settings.contact_email}</span>}
          {settings.contact_phone && <span>{settings.contact_phone}</span>}
        </div>
        <div className="w-[300px] pt-3">
          <CountrySelector />
        </div>
      </div>
      
    </footer>
  );
}