"use client";

import { useEffect, useState } from "react";

const emptySettings = {
  store_name: "",
  store_description: "",
  contact_info: "",
  default_currency: "VND",
  shipping_fee_vnd: 0,
  shipping_fee_usd: 0,
  payment_methods: "",
  stock_list: "",
};

export default function SettingsPage() {
  const [sizeGuides, setSizeGuides] = useState<any[]>([]);
  const [newGuideName, setNewGuideName] = useState("");
  const [newGuideFile, setNewGuideFile] = useState<File | null>(null);
  const [uploadingGuide, setUploadingGuide] = useState(false);
  const [form, setForm] = useState(emptySettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [methodInput, setMethodInput] = useState("");
  useEffect(() => {
    fetch("/api/admin/size-guides").then(r => (r.json() as any)).then(setSizeGuides);
  }, []);

  async function uploadSizeGuide() {
    if (!newGuideFile || !newGuideName.trim()) {
      alert("Enter a name and choose an image.");
      return;
    }
    setUploadingGuide(true);

    const formData = new FormData();
    formData.append("file", newGuideFile);
    formData.append("name", newGuideName.trim());

    const res = await fetch("/api/admin/size-guides", { method: "POST", body: formData });
    if (res.ok) {
      const guide = await res.json();
      setSizeGuides(prev => [...prev, guide].sort((a, b) => a.name.localeCompare(b.name)));
      setNewGuideName("");
      setNewGuideFile(null);
    } else {
      alert("Upload failed.");
    }
    setUploadingGuide(false);
  }

  async function deleteSizeGuide(id: number) {
    if (!confirm("Delete this size guide?")) return;
    await fetch("/api/admin/size-guides", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setSizeGuides(prev => prev.filter(g => g.id !== id));
  }

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
    "w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
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
    <div className="w-full">
      <h1 className="text-3xl max-sm:text-right  font-bold mb-6 text-gray-900">Settings</h1>

      <section className="flex sm:flex-row flex-col border border-gray-200 bg-white shadow-sm p-6 mb-8">
        <h2 className="sm:w-[20%] w-full text-lg font-semibold text-gray-900 mb-5">Store info</h2>
        <div className="sm:w-[80%] w-full">
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

          <div className="mb-4">
            <label className={labelClass}>Contact (one method per line, as &quot;Contact method: Value&quot;)</label>
            <textarea
              className={inputClass}
              rows={3}
              placeholder={"Email: hello@ngai.vn\nPhone: 090 123 4567\nInstagram: @ngai.official"}
              value={form.contact_info ?? ""}
              onChange={(e) => setForm({ ...form, contact_info: e.target.value })}
            />
          </div>

          <div>
            <label className={labelClass}>Stock list (one store per line, as &quot;Store name: Address&quot;)</label>
            <textarea
              className={inputClass}
              rows={4}
              placeholder={"Ngài Đà Lạt: 12 Trần Phú, Đà Lạt\nNgài Sài Gòn: 45 Lê Lợi, Quận 1, TP.HCM"}
              value={form.stock_list ?? ""}
              onChange={(e) => setForm({ ...form, stock_list: e.target.value })}
            />
          </div>
        </div>
      </section>

      <section className="flex sm:flex-row flex-col border border-gray-200 bg-white shadow-sm p-6 mb-8">
        <h2 className="sm:w-[20%] w-full text-lg font-semibold text-gray-900 mb-5">Shipping</h2>

        <div className="sm:w-[80%] w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Vietnam flat shipping fee (VND)</label>
              <input
                type="number"
                className={inputClass}
                value={form.shipping_fee_vnd}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setForm({ ...form, shipping_fee_vnd: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className={labelClass}>International flat shipping fee (USD)</label>
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
            Applied based on the shipping country selected at checkout: Vietnam gets the VND fee,
            every other country gets the USD fee. Set to 0 for free shipping.
          </p>
        </div>
      </section>

      <section className="flex sm:flex-row flex-col  border border-gray-200 bg-white shadow-sm p-6 mb-8">
        <h2 className="sm:w-[20%] w-full text-lg font-semibold text-gray-900 mb-5">Size Guides</h2>

        <div className="sm:w-[80%] w-full">
        {sizeGuides.length === 0 ? (
          <p className="text-sm text-gray-400 mb-4">No size guides yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {sizeGuides.map((g) => (
              <div key={g.id} className="border border-gray-200 overflow-hidden">
                <img src={g.url} alt={g.name} className="w-full h-32 object-cover" />
                <div className="p-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700 truncate">{g.name}</span>
                  <button onClick={() => deleteSizeGuide(g.id)} className="text-xs text-red-500 hover:text-red-700">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className={labelClass}>Name</label>
            <input className={inputClass} placeholder="Top Guide" value={newGuideName} onChange={(e) => setNewGuideName(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Image</label>
            <input type="file" accept="image/*" onChange={(e) => setNewGuideFile(e.target.files?.[0] ?? null)} />
          </div>
          <button
            onClick={uploadSizeGuide}
            disabled={uploadingGuide}
            className="bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {uploadingGuide ? "Uploading…" : "Upload"}
          </button>
        </div>
        </div>
      </section>

      {/* <section className="flex sm:flex-row flex-col  border border-gray-200 bg-white shadow-sm p-6 mb-8">
        <h2 className="sm:w-[20%] w-full text-lg font-semibold text-gray-900 mb-5">Payment methods</h2>
        <div className="sm:w-[80%] w-full">
        <div className="border border-gray-300 px-3 py-2 flex flex-wrap gap-2 items-center">
          {methods.map((m) => (
            <span
              key={m}
              className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2.5 py-1 text-xs font-medium"
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
        </div>
      </section> */}

      <div className="flex items-center gap-4">
        <button
          onClick={save}
          disabled={saving}
          className="bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
        {saved && <span className="text-sm text-green-600">Saved.</span>}
      </div>
    </div>
  );
}