"use client";

import { useEffect, useState } from "react";
import { CATEGORIES } from "@/lib/categories";

export default function ProductsPage() {
  const [collections, setCollections] = useState<any[]>([]);
  const [collectionId, setCollectionId] = useState<number | "">("");
  const [products, setProducts] = useState<any[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const emptyForm = {
    id: undefined as number | undefined,
    collection_id: undefined as number | undefined,
    product_name: "",
    product_slug: "",
    category: "",
    status: "Draft",
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
    setIsEditorOpen(false);

    if (!collectionId) return;

    loadProducts();
  }, [collectionId]);

  async function loadProducts() {
    const res = await fetch(
      `/api/admin/products?collection=${collectionId}`
    );

    const data = (await res.json()) as any[];
    setProducts(data);
  }

  function editProduct(product: any) {
    setForm({
      ...emptyForm,
      ...product,
    });

    setIsEditorOpen(true);
  }

  function newProduct() {
    setForm({
      ...emptyForm,
      collection_id: collectionId || undefined,
    });

    setIsEditorOpen(true);
  }

  function closeEditor() {
    setIsEditorOpen(false);
    setForm({
      ...emptyForm,
      collection_id: collectionId || undefined,
    });
  }

  async function saveProduct() {
    const method = form.id ? "PUT" : "POST";

    await fetch("/api/admin/products", {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...form,
        collection_id: collectionId,
      }),
    });

    await loadProducts();
    closeEditor();
  }

  async function deleteProductRow(id: number) {
    if (
      !confirm(
        "Delete this product? This also removes its variants and images."
      )
    ) {
      return;
    }

    await fetch("/api/admin/products", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });

    await loadProducts();

    if (form.id === id) {
      closeEditor();
    }
  }

  const selectClass =
    "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400";

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  const labelClass = "mb-1 block text-xs font-medium text-gray-500";

  const selectedCollectionName = collections.find(
    (c) => c.id === collectionId
  )?.collection_name;

  return (
    <div className="w-full max-w-5xl">
      {/* ================= PAGE HEADER ================= */}

      <div className="mb-5 flex items-center justify-between gap-3 sm:mb-6">
        <h1 className="text-xl font-semibold text-gray-900">
          Products
        </h1>

        {collectionId && (
          <button
            onClick={newProduct}
            className="rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-green-700 sm:px-4 sm:text-sm"
          >
            + New Product
          </button>
        )}
      </div>

      {/* ================= COLLECTION PICKER ================= */}

      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:mb-8 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex w-full flex-col sm:w-auto">
          <label className={labelClass}>Collection</label>

          <select
            className={selectClass + " w-full sm:w-auto"}
            value={collectionId}
            onChange={(e) => setCollectionId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Select collection</option>

            {collections.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.collection_name}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* ================= NO COLLECTION ================= */}

      {!collectionId && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500 sm:p-10">
          Select a collection above to manage its products.
        </div>
      )}

      {collectionId && (
        <>
          {/* ================= PRODUCTS ================= */}

          <section className="mb-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

            {products.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                No products in this collection yet.
              </div>
            ) : (
              <>
                {/* ================= DESKTOP TABLE ================= */}

                <div className="hidden sm:block">
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
                          ? p.category
                            .split(",")
                            .map((c: string) => c.trim())
                            .filter(Boolean)
                          : [];

                        return (
                          <tr
                            key={p.id}
                            className="border-t border-gray-100 transition hover:bg-gray-50"
                          >
                            <td className="p-3 text-gray-500">
                              {p.id}
                            </td>

                            <td className="p-3 font-medium text-gray-800">
                              {p.product_name}
                            </td>

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

                            <td className="max-w-[160px] truncate p-3 text-gray-500">
                              {p.shipping || (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>

                            <td className="max-w-[160px] truncate p-3 text-gray-500">
                              {p.sizeGuide || (
                                <span className="text-gray-300">—</span>
                              )}
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
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => editProduct(p)}
                                  className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
                                >
                                  Edit
                                </button>

                                <button
                                  onClick={() => deleteProductRow(p.id)}
                                  className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-100 hover:text-red-700"
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
                </div>

                {/* ================= MOBILE LIST ================= */}

                <div className="divide-y divide-gray-100 sm:hidden">
                  {products.map((p: any) => {
                    const cats = p.category
                      ? p.category
                        .split(",")
                        .map((c: string) => c.trim())
                        .filter(Boolean)
                      : [];

                    return (
                      <div key={p.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="truncate font-medium text-gray-900">
                                {p.product_name}
                              </h3>

                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${p.status === "Active"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-500"
                                  }`}
                              >
                                {p.status}
                              </span>
                            </div>

                            <p className="mt-1 truncate text-xs text-gray-500">
                              /{p.product_slug}
                            </p>
                          </div>

                          <div className="flex shrink-0 gap-2">
                            <button
                              onClick={() => editProduct(p)}
                              className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => deleteProductRow(p.id)}
                              className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-100"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-3 border-t border-gray-100 pt-3">
                          <div className="min-w-0">
                            {cats.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1">
                                {cats.map((c: string) => (
                                  <span
                                    key={c}
                                    className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                                  >
                                    {c}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wide text-gray-400">
                              Shipping
                            </p>

                            <p className="mt-0.5 truncate text-xs text-gray-600">
                              {p.shipping || "—"}
                            </p>
                          </div>

                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wide text-gray-400">
                              Size guide
                            </p>

                            <p className="mt-0.5 truncate text-xs text-gray-600">
                              {p.sizeGuide || "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </>
      )}

      {/* ========================================================= */}
      {/* ================= PRODUCT EDITOR MODAL ================== */}
      {/* ========================================================= */}

      {isEditorOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-0 sm:p-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeEditor();
            }
          }}
        >
          <div
            className="flex h-full w-full flex-col bg-white sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:rounded-xl sm:shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* ================= MODAL HEADER ================= */}

            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4">
              <div className="min-w-0">
                <p className="text-xs text-gray-400">
                  {selectedCollectionName}
                </p>

                <h2 className="truncate text-base font-semibold text-gray-900 sm:text-lg">
                  {form.id
                    ? `Edit: ${form.product_name || "Product"}`
                    : "New Product"}
                </h2>
              </div>

              <button
                onClick={closeEditor}
                className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xl leading-none text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* ================= MODAL BODY ================= */}

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
              {/* Product name + slug */}
              <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Product Name
                  </label>

                  <input
                    autoFocus
                    className={inputClass}
                    value={form.product_name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        product_name: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Slug
                  </label>

                  <input
                    className={inputClass}
                    value={form.product_slug}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        product_slug: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* Category */}
              <div className="mb-4">
                <label className={labelClass}>
                  Category
                </label>

                <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-lg border border-gray-300 px-3 py-3">
                  {CATEGORIES.map((cat) => {
                    const selected = form.category
                      ? form.category
                        .split(",")
                        .map((c) => c.trim())
                        .includes(cat.name)
                      : false;

                    return (
                      <label
                        key={cat.slug}
                        className="inline-flex cursor-pointer items-center gap-1.5 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(e) => {
                            const current = form.category
                              ? form.category
                                .split(",")
                                .map((c) => c.trim())
                                .filter(Boolean)
                              : [];

                            const next = e.target.checked
                              ? [...current, cat.name]
                              : current.filter(
                                (c) => c !== cat.name
                              );

                            setForm({
                              ...form,
                              category: next.join(", "),
                            });
                          }}
                        />

                        {cat.name}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className={labelClass}>
                  Description
                </label>

                <textarea
                  className={inputClass}
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              {/* Shipping + Size guide */}
              <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Shipping info
                  </label>

                  <textarea
                    className={inputClass}
                    rows={3}
                    value={form.shipping}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        shipping: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Size guide
                  </label>

                  <textarea
                    className={inputClass}
                    rows={3}
                    value={form.sizeGuide}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        sizeGuide: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* Notes + Status */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Notes
                  </label>

                  <textarea
                    className={inputClass}
                    rows={3}
                    value={form.notes}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        notes: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Status
                  </label>

                  <select
                    className={selectClass + " w-full"}
                    value={form.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status: e.target.value,
                      })
                    }
                  >
                    <option>Active</option>
                    <option>Draft</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ================= MODAL FOOTER ================= */}

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-gray-200 bg-white px-4 py-3 sm:flex-row sm:justify-end sm:px-6 sm:py-4">
              <button
                onClick={closeEditor}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50 sm:w-auto"
              >
                Cancel
              </button>

              <button
                onClick={saveProduct}
                className="w-full rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-green-700 sm:w-auto"
              >
                {form.id ? "Save Changes" : "Create Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}