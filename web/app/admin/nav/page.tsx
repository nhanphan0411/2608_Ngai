"use client";

import { useEffect, useState } from "react";

type Child = { label: string; href: string | null };
type NavItem = { label: string; href: string | null; children: Child[] };

export default function NavAdminPage() {
  const [items, setItems] = useState<NavItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/nav")
      .then((r) => r.json())
      .then((data) => setItems(data as NavItem[]));
  }, []);

  function addTopLevel() {
    setItems((prev) => [...prev, { label: "", href: "", children: [] }]);
  }

  function updateTopLevel(index: number, patch: Partial<NavItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function removeTopLevel(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function addChild(parentIndex: number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === parentIndex ? { ...item, children: [...item.children, { label: "", href: "" }] } : item
      )
    );
  }

  function updateChild(parentIndex: number, childIndex: number, patch: Partial<Child>) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === parentIndex
          ? {
              ...item,
              children: item.children.map((c, ci) => (ci === childIndex ? { ...c, ...patch } : c)),
            }
          : item
      )
    );
  }

  function removeChild(parentIndex: number, childIndex: number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === parentIndex ? { ...item, children: item.children.filter((_, ci) => ci !== childIndex) } : item
      )
    );
  }

  function move<T>(arr: T[], from: number, to: number): T[] {
    if (to < 0 || to >= arr.length) return arr;
    const next = [...arr];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  }

  function moveTopLevel(index: number, direction: -1 | 1) {
    setItems((prev) => move(prev, index, index + direction));
  }

  function moveChild(parentIndex: number, childIndex: number, direction: -1 | 1) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === parentIndex ? { ...item, children: move(item.children, childIndex, childIndex + direction) } : item
      )
    );
  }

  async function saveAll() {
    setSaving(true);
    const cleaned = items
      .filter((item) => item.label.trim())
      .map((item) => ({
        label: item.label.trim(),
        href: item.href?.trim() || null,
        children: item.children
          .filter((c) => c.label.trim())
          .map((c) => ({ label: c.label.trim(), href: c.href?.trim() || null })),
      }));

    await fetch("/api/admin/nav", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cleaned),
    });

    setItems(cleaned);
    setSaving(false);
  }

  const inputClass =
    "rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Navigation</h1>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 mb-6">
        {items.length === 0 && (
          <p className="text-sm text-gray-400 mb-4">No nav items yet — add one below.</p>
        )}

        <div className="space-y-6">
          {items.map((item, index) => (
            <div key={index} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <input
                  className={inputClass + " flex-1"}
                  placeholder="SHOP"
                  value={item.label}
                  onChange={(e) => updateTopLevel(index, { label: e.target.value })}
                />
                <input
                  className={inputClass + " flex-1"}
                  placeholder="/products (optional if just a dropdown label)"
                  value={item.href ?? ""}
                  onChange={(e) => updateTopLevel(index, { href: e.target.value })}
                />
                <button onClick={() => moveTopLevel(index, -1)} className="text-gray-400 hover:text-gray-800 px-1">↑</button>
                <button onClick={() => moveTopLevel(index, 1)} className="text-gray-400 hover:text-gray-800 px-1">↓</button>
                <button onClick={() => removeTopLevel(index)} className="text-red-500 hover:text-red-700 text-xs px-2">Delete</button>
              </div>

              <div className="ml-6 space-y-2">
                {item.children.map((child, childIndex) => (
                  <div key={childIndex} className="flex items-center gap-2">
                    <span className="text-gray-300 text-xs">└</span>
                    <input
                      className={inputClass + " flex-1"}
                      placeholder="ALL"
                      value={child.label}
                      onChange={(e) => updateChild(index, childIndex, { label: e.target.value })}
                    />
                    <input
                      className={inputClass + " flex-1"}
                      placeholder="/products"
                      value={child.href ?? ""}
                      onChange={(e) => updateChild(index, childIndex, { href: e.target.value })}
                    />
                    <button onClick={() => moveChild(index, childIndex, -1)} className="text-gray-400 hover:text-gray-800 px-1">↑</button>
                    <button onClick={() => moveChild(index, childIndex, 1)} className="text-gray-400 hover:text-gray-800 px-1">↓</button>
                    <button onClick={() => removeChild(index, childIndex)} className="text-red-500 hover:text-red-700 text-xs px-2">Delete</button>
                  </div>
                ))}

                <button onClick={() => addChild(index)} className="text-xs text-blue-600 hover:text-blue-800">
                  + Add sub-item
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addTopLevel}
          className="mt-4 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900"
        >
          + Add top-level item
        </button>
      </section>

      <button
        onClick={saveAll}
        disabled={saving}
        className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save navigation"}
      </button>
    </div>
  );
}