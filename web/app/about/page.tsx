export const dynamic = "force-dynamic";

import { getSettings } from "@/lib/db/settings";

function parseLines(raw: string | null) {
  return (raw ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split(":");
      return {
        label: label.trim(),
        value: rest.join(":").trim(),
      };
    });
}

function contactHref(label: string, value: string) {
  const key = label.toLowerCase();
  if (key.includes("email")) return `mailto:${value}`;
  if (key.includes("phone")) return `tel:${value}`;
  return null;
}

export default async function AboutPage() {
  const settings = await getSettings();

  const contacts = parseLines(settings.contact_info);
  const stores = parseLines(settings.stock_list).map((s) => ({
    name: s.label,
    address: s.value,
  }));

  const labelClass = "border-r border-black p-6 align-top sm:text-right text-start";
  const contentClass = "p-6 align-top text-sm leading-relaxed";

  return (
    <main className="w-full h-full">
      <div className="grid grid-cols-1 sm:grid-cols-[400px_1fr] sm:border-b">
        {/* Row 1 — About */}
        <div className={`${labelClass} sm:border-b`}>ABOUT</div>
        <div className={`${contentClass} border-b border-black`}>
          {settings.store_description && (
            <p className="whitespace-pre-line">{settings.store_description}</p>
          )}
        </div>

        {/* Row 2 — Contact */}
        <div className={`${labelClass} sm:border-b`}>CONTACT</div>
        <div className={`${contentClass} border-b border-black space-y-1`}>
          {contacts.length > 0 ? (
            contacts.map((c, i) => {
              const href = contactHref(c.label, c.value);
              return (
                <p key={i}>
                  {c.label}:{" "}
                  {href ? (
                    <a href={href} className="underline hover:no-underline">
                      {c.value}
                    </a>
                  ) : (
                    c.value
                  )}
                </p>
              );
            })
          ) : (
            <p className="text-gray-400">No contact info yet.</p>
          )}
        </div>

        {/* Row 3 — Stock list */}
        <div className={labelClass}>STOCKLIST</div>
        <div className={`${contentClass} space-y-3`}>
          {stores.length > 0 ? (
            stores.map((store, i) => (
              <div key={i}>
                <p className="font-bold">{store.name}</p>
                {store.address && <p>{store.address}</p>}
              </div>
            ))
          ) : (
            <p className="text-gray-400">No stores listed yet.</p>
          )}
        </div>
      </div>
    </main>
  );
}