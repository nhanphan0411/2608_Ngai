"use client";

import { useEffect, useState } from "react";

const emptySettings = {
  store_name: "",
  store_description: "",
  contact_email: "",
  contact_phone: "",
  default_currency: "VND",
  shipping_fee_vnd: 0,
  shipping_fee_usd: 0,
  payment_methods: "",
};

export default function SettingsPage() {
  const [form, setForm] = useState(emptySettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [methodInput, setMethodInput] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => (res.json() as any))
      .then((data) => setForm(data));
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);

    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSaving(false);
    setSaved(true);
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "block text-xs font-medium text-gray-500 mb-1";

  const methods = form.payment_methods
    ? form.payment_methods.split(",").map((m) => m.trim()).filter(Boolean)
    : [];

  function addMethod() {
    const value = methodInput.trim();
    if (!value || methods.includes(value)) {
      setMethodInput("");
      return;
    }
    setForm({ ...form, payment_methods: [...methods, value].join(", ") });
    setMethodInput("");
  }

  function removeMethod(m: string) {
    setForm({
      ...form,
      payment_methods: methods.filter((x) => x !== m).join(", "),
    });
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Settings</h1>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">Store info</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>Store name</label>
            <input
              className={inputClass}
              value={form.store_name}
              onChange={(e) => setForm({ ...form, store_name: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Default currency</label>
            <select
              className={inputClass}
              value={form.default_currency}
              onChange={(e) => setForm({ ...form, default_currency: e.target.value })}
            >
              <option value="VND">VND</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className={labelClass}>Description</label>
          <textarea
            className={inputClass}
            rows={3}
            value={form.store_description ?? ""}
            onChange={(e) => setForm({ ...form, store_description: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Contact email</label>
            <input
              className={inputClass}
              value={form.contact_email ?? ""}
              onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Contact phone</label>
            <input
              className={inputClass}
              value={form.contact_phone ?? ""}
              onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">Shipping</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Flat shipping fee (VND)</label>
            <input
              type="number"
              className={inputClass}
              value={form.shipping_fee_vnd}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setForm({ ...form, shipping_fee_vnd: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className={labelClass}>Flat shipping fee (USD)</label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={form.shipping_fee_usd}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setForm({ ...form, shipping_fee_usd: Number(e.target.value) })}
            />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Applied as a flat fee added to every order at checkout. Set to 0 for free shipping.
        </p>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">Payment methods</h2>

        <div className="rounded-lg border border-gray-300 px-3 py-2 flex flex-wrap gap-2 items-center">
          {methods.map((m) => (
            <span
              key={m}
              className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 px-2.5 py-1 text-xs font-medium"
            >
              {m}
              <button onClick={() => removeMethod(m)} className="text-blue-500 hover:text-blue-800">
                ✕
              </button>
            </span>
          ))}
          <input
            className="flex-1 min-w-[140px] text-sm outline-none py-0.5"
            placeholder={methods.length === 0 ? "Type a payment method, press Enter" : "Add another…"}
            value={methodInput}
            onChange={(e) => setMethodInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addMethod();
              }
            }}
            onBlur={addMethod}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          These show up as options on the checkout page, in this order.
        </p>
      </section>

      <div className="flex items-center gap-4">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
        {saved && <span className="text-sm text-green-600">Saved.</span>}
      </div>
    </div>
  );
}