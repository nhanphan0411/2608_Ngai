"use client";

import { useEffect, useState } from "react";
import { CATEGORIES } from "@/lib/categories";

export default function ProductsPage() {
  
  const [collections, setCollections] = useState<any[]>([]);
  const [collectionSlug, setCollectionSlug] = useState("");
  const [products, setProducts] = useState<any[]>([]);

  const emptyForm = {
    id: undefined as number | undefined,
    collection_slug: "",
    product_name: "",
    product_slug: "",
    category: "",
    status: "Active",
    description: "",
    shipping: "",
    sizeGuide: "",
    notes: "",
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetch("/api/admin/collections")
      .then((res) => res.json())
      .then((data) => setCollections(data as any[]));
  }, []);

  useEffect(() => {
    setProducts([]);
    setForm(emptyForm);

    if (!collectionSlug) return;

    loadProducts();
  }, [collectionSlug]);

  async function loadProducts() {
    const res = await fetch(`/api/admin/products?collection=${collectionSlug}`);
    const data = (await res.json()) as any[];
    setProducts(data);
  }

  function editProduct(product: any) {
    setForm(product);
  }

  function newProduct() {
    setForm({ ...emptyForm, collection_slug: collectionSlug });
  }

  async function saveProduct() {
    const method = form.id ? "PUT" : "POST";

    await fetch("/api/admin/products", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, collection_slug: collectionSlug }),
    });

    await loadProducts();
    newProduct();
  }

  async function deleteProductRow(id: number) {
    if (!confirm("Delete this product? This also removes its variants and images.")) return;

    await fetch("/api/admin/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    await loadProducts();

    if (form.id === id) newProduct();
  }


  const selectClass =
    "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400";
  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "block text-xs font-medium text-gray-500 mb-1";

  const selectedCollectionName = collections.find(
    (c) => c.collection_slug === collectionSlug
  )?.collection_name;

  return (
    <div className="max-w-5xl">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Products</h1>

      {/* Picker bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 mb-8 shadow-sm">
        <div className="flex flex-col">
          <label className={labelClass}>Collection</label>
          <select
            className={selectClass}
            value={collectionSlug}
            onChange={(e) => setCollectionSlug(e.target.value)}
          >
            <option value="">Select collection</option>
            {collections.map((c: any) => (
              <option key={c.collection_slug} value={c.collection_slug}>
                {c.collection_name}
              </option>
            ))}
          </select>
        </div>

        {collectionSlug && (
          <div className="ml-auto text-sm text-gray-400">
            <span className="font-medium text-gray-700">
              {selectedCollectionName}
            </span>
          </div>
        )}
      </div>

      {!collectionSlug && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-500">
          Select a collection above to manage its products.
        </div>
      )}

      {collectionSlug && (
        <>
          {/* ============ PRODUCTS TABLE ============ */}

          <section className="rounded-xl border border-gray-200 bg-white shadow-sm mb-8 overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Products</h2>
            </div>

            {products.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                No products in this collection yet — add one below.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="p-3">ID</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Shipping</th>
                    <th className="p-3">Guide</th>
                    <th className="p-3">Status</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p: any) => {
                    const cats = p.category
                      ? p.category.split(",").map((c: string) => c.trim()).filter(Boolean)
                      : [];

                    return (
                      <tr
                        key={p.id}
                        className={`border-t border-gray-100 hover:bg-gray-50 transition ${form.id === p.id ? "bg-blue-50" : ""
                          }`}
                      >
                        <td className="p-3 text-gray-500">{p.id}</td>
                        <td className="p-3 font-medium text-gray-800">{p.product_name}</td>
                        <td className="p-3">
                          {cats.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {cats.map((c: string) => (
                                <span
                                  key={c}
                                  className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="p-3 text-gray-500 max-w-[160px] truncate">
                          {p.shipping || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="p-3 text-gray-500 max-w-[160px] truncate">
                          {p.sizeGuide || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${p.status === "Active"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                              }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => editProduct(p)}
                              className="text-sm text-gray-600 hover:text-gray-900"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteProductRow(p.id)}
                              className="text-sm text-red-500 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          {/* ============ PRODUCT FORM ============ */}

          <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 mb-12">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-gray-900">
                {form.id ? "Edit Product" : "New Product"}
              </h2>
              {form.id && (
                <button
                  onClick={newProduct}
                  className="text-sm text-gray-500 hover:text-gray-800"
                >
                  Cancel edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelClass}>Product Name</label>
                <input
                  className={inputClass}
                  value={form.product_name}
                  onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                />
              </div>

              <div>
                <label className={labelClass}>Slug</label>
                <input
                  className={inputClass}
                  value={form.product_slug}
                  onChange={(e) => setForm({ ...form, product_slug: e.target.value })}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className={labelClass}>Category</label>
              <div className="flex flex-wrap gap-3 rounded-lg border border-gray-300 px-3 py-3">
                {CATEGORIES.map((cat) => {
                  const selected = form.category
                    ? form.category.split(",").map((c) => c.trim()).includes(cat.name)
                    : false;

                  return (
                    <label
                      key={cat.slug}
                      className="inline-flex items-center gap-1.5 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(e) => {
                          const current = form.category
                            ? form.category.split(",").map((c) => c.trim()).filter(Boolean)
                            : [];

                          const next = e.target.checked
                            ? [...current, cat.name]
                            : current.filter((c) => c !== cat.name);

                          setForm({ ...form, category: next.join(", ") });
                        }}
                      />
                      {cat.name}
                    </label>
                  );
                })}
              </div>

            </div>

            <div className="mb-4">
              <label className={labelClass}>Description</label>
              <textarea
                className={inputClass}
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelClass}>Shipping info</label>
                <textarea
                  className={inputClass}
                  rows={2}
                  value={form.shipping}
                  onChange={(e) => setForm({ ...form, shipping: e.target.value })}
                />
              </div>

              <div>
                <label className={labelClass}>Size guide</label>
                <textarea
                  className={inputClass}
                  rows={2}
                  value={form.sizeGuide}
                  onChange={(e) => setForm({ ...form, sizeGuide: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelClass}>Notes</label>
                <textarea
                  className={inputClass}
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <div>
                <label className={labelClass}>Status</label>
                <select
                  className={selectClass + " w-full"}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option>Active</option>
                  <option>Draft</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={saveProduct}
                className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition"
              >
                {form.id ? "Update Product" : "Create Product"}
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}