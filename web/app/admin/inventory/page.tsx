"use client";

import { useEffect, useState } from "react";
import { processImage } from "@/lib/imageProcessing";

type StagedImage =
  | { kind: "existing"; id: number; url: string }
  | { kind: "new"; tempId: string; file: File; previewUrl: string };

export default function InventoryPage() {
  // ---- shared pickers ----
  const [collections, setCollections] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [collectionSlug, setCollectionSlug] = useState("");
  const [productSlug, setProductSlug] = useState("");

  // ---- inventory (variants) ----
  const [variants, setVariants] = useState<any[]>([]);

  const emptyForm = {
    id: undefined as number | undefined,
    collection_slug: "",
    product_slug: "",
    variant1: "",
    value1: "",
    variant2: "",
    value2: "",
    variant3: "",
    value3: "",
    stock: 0,
    priceVND: 0,
    priceUSD: 0,
    status: "Active",
  };

  const [form, setForm] = useState(emptyForm);

  // ---- image manager (driven by the form's own value1/value2, not a separate picker) ----
  const [imgKeyValue1, setImgKeyValue1] = useState("");
  const [imgKeyValue2, setImgKeyValue2] = useState("");

  const [staged, setStaged] = useState<StagedImage[]>([]);
  const [originalIds, setOriginalIds] = useState<number[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState({ done: 0, total: 0 });
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // ---------------- shared pickers ----------------

  useEffect(() => {
    fetch("/api/admin/collections")
      .then((res) => res.json())
      .then((data) => setCollections(data as any[]));
  }, []);

  useEffect(() => {
    setProducts([]);
    setProductSlug("");
    setVariants([]);
    setForm(emptyForm);
    setImgKeyValue1("");
    setImgKeyValue2("");
    setStaged([]);
    setOriginalIds([]);
    setDirty(false);

    if (!collectionSlug) return;

    fetch(`/api/admin/products?collection=${collectionSlug}`)
      .then((res) => res.json())
      .then((data) => setProducts(data as any[]));
  }, [collectionSlug]);

  useEffect(() => {
    setVariants([]);
    setForm(emptyForm);
    setImgKeyValue1("");
    setImgKeyValue2("");
    setStaged([]);
    setOriginalIds([]);
    setDirty(false);

    if (!productSlug) return;

    loadVariants();
  }, [productSlug]);

  // ---------------- inventory logic ----------------

  async function loadVariants() {
    const res = await fetch(`/api/admin/inventory?product=${productSlug}`);
    const data = await (res.json()) as any;
    setVariants(data);
  }

  async function editVariant(v: any) {
    setForm(v);

    const value1 = v.value1 ?? "";
    const value2 = v.variant2 ? (v.value2 ?? "") : "";

    setImgKeyValue1(value1);
    setImgKeyValue2(value2);
    setDirty(false);

    const params = new URLSearchParams({ product_slug: productSlug, value1 });
    if (value2) params.set("value2", value2);

    const res = await fetch(`/api/admin/images?${params.toString()}`);
    const imgs = (await res.json()) as any[];

    setStaged(
      imgs.map((img) => ({
        kind: "existing" as const,
        id: img.id,
        url: img.url_thumb,
      }))
    );
    setOriginalIds(imgs.map((img) => img.id));
  }

  function newVariant() {
    setForm({
      ...emptyForm,
      collection_slug: collectionSlug,
      product_slug: productSlug,
    });
    setImgKeyValue1("");
    setImgKeyValue2("");
  }

  async function saveVariant() {
    const method = form.id ? "PUT" : "POST";

    const newValue1 = form.value1?.trim() ?? "";
    const newValue2 = form.variant2 ? (form.value2?.trim() ?? "") : "";

    await fetch("/api/admin/inventory", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        collection_slug: collectionSlug,
        product_slug: productSlug,
      }),
    });

    // If this was an existing variant and its value1/value2 changed,
    // move its images over instead of leaving them orphaned.
    if (
      form.id &&
      imgKeyValue1 &&
      (imgKeyValue1 !== newValue1 || imgKeyValue2 !== newValue2)
    ) {
      await fetch("/api/admin/images/repoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_slug: productSlug,
          old_value1: imgKeyValue1,
          old_value2: imgKeyValue2 || null,
          new_value1: newValue1,
          new_value2: newValue2 || null,
        }),
      });

      setImgKeyValue1(newValue1);
      setImgKeyValue2(newValue2);
    }

    if (newValue1 && dirty) {
      await syncImages(newValue1, newValue2);
    }

    await loadVariants();
    newVariant();
  }

  async function deleteVariantRow(id: number) {
    if (!confirm("Delete this variant?")) return;

    await fetch("/api/admin/inventory", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    await loadVariants();

    if (form.id === id) {
      newVariant();
    }
  }

  // ---------------- image manager logic ----------------

  const needsValue2 = !!form.variant2?.trim();
  const liveValue1 = form.value1?.trim() ?? "";
  const liveValue2 = needsValue2 ? (form.value2?.trim() ?? "") : "";
  const canManageImages = form.id
    ? true // editing an existing variant — images stay visible no matter what's mid-typing
    : !!liveValue1 && (!needsValue2 || !!liveValue2);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: StagedImage[] = Array.from(files).map((file) => ({
      kind: "new",
      tempId: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setStaged((prev) => [...prev, ...newItems]);
    setDirty(true);
    e.target.value = "";
  }

  function handleRemove(index: number) {
    setStaged((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  }

  function handleDrop(targetIndex: number) {
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    setStaged((prev) => {
      const reordered = [...prev];
      const [moved] = reordered.splice(draggedIndex, 1);
      reordered.splice(targetIndex, 0, moved);
      return reordered;
    });

    setDirty(true);
    setDraggedIndex(null);
  }

  async function syncImages(value1: string, value2: string) {
    setSyncing(true);

    const stagedExistingIds = staged
      .filter(
        (s): s is Extract<StagedImage, { kind: "existing" }> =>
          s.kind === "existing"
      )
      .map((s) => s.id);

    const deleteIds = originalIds.filter(
      (id) => !stagedExistingIds.includes(id)
    );

    const newFiles = staged.filter(
      (s): s is Extract<StagedImage, { kind: "new" }> => s.kind === "new"
    );

    const order = staged.map((s) =>
      s.kind === "existing"
        ? { type: "existing", id: s.id }
        : {
          type: "new",
          fileIndex: newFiles.findIndex((f) => f.tempId === s.tempId),
        }
    );

    const formData = new FormData();
    formData.append("product_slug", productSlug);
    formData.append("value1", value1);
    if (value2) formData.append("value2", value2);
    formData.append("deleteIds", JSON.stringify(deleteIds));
    formData.append("order", JSON.stringify(order));

    // Process each new file into 3 WebP sizes, right here, before upload.
    if (newFiles.length > 0) {
      setProcessing(true);
      setProcessProgress({ done: 0, total: newFiles.length });

      for (let i = 0; i < newFiles.length; i++) {
        const { thumb, mid, large } = await processImage(newFiles[i].file);

        formData.append(`new_thumb_${i}`, thumb, `thumb-${i}.webp`);
        formData.append(`new_mid_${i}`, mid, `mid-${i}.webp`);
        formData.append(`new_large_${i}`, large, `large-${i}.webp`);

        setProcessProgress({ done: i + 1, total: newFiles.length });
      }

      setProcessing(false);
    }

    const res = await fetch("/api/admin/images/sync", {
      method: "POST",
      body: formData,
    });

    const data = (await res.json()) as {
      images?: any[];
      failures?: string[];
      error?: string;
    };

    if (!res.ok) {
      alert(data.error || "Image sync failed");
      setSyncing(false);
      return;
    }

    if (data.failures?.length) {
      alert(`Some changes couldn't be completed:\n${data.failures.join("\n")}`);
    }

    const images = data.images ?? [];

    setStaged(
      images.map((img: any) => ({
        kind: "existing",
        id: img.id,
        url: img.url_thumb, // grid preview uses the thumb size
      }))
    );

    setOriginalIds(images.map((img: any) => img.id));

    setDirty(false);
    setSyncing(false);
  }

  const selectClass =
    "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400";

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  const labelClass = "block text-xs font-medium text-gray-500 mb-1";

  const selectedProductName = products.find(
    (p) => p.product_slug === productSlug
  )?.product_name;

  const selectedCollectionName = collections.find(
    (c) => c.collection_slug === collectionSlug
  )?.collection_name;

  // ---------------- render ----------------

  return (
    <div className="max-w-5xl">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Inventory</h1>

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

        <div className="flex flex-col">
          <label className={labelClass}>Product</label>
          <select
            className={selectClass}
            value={productSlug}
            onChange={(e) => setProductSlug(e.target.value)}
            disabled={!collectionSlug}
          >
            <option value="">Select product</option>
            {products.map((p: any) => (
              <option key={p.product_slug} value={p.product_slug}>
                {p.product_name}
              </option>
            ))}
          </select>
        </div>

        {productSlug && (
          <div className="ml-auto text-sm text-gray-400">
            {selectedCollectionName}{" "}
            <span className="mx-1 text-gray-300">/</span>{" "}
            <span className="font-medium text-gray-700">
              {selectedProductName}
            </span>
          </div>
        )}
      </div>

      {!productSlug && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-500">
          Select a collection and product above to manage its variants and
          images.
        </div>
      )}

      {productSlug && (
        <>
          {/* ============ VARIANTS ============ */}

          <section className="rounded-xl border border-gray-200 bg-white shadow-sm mb-8 overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                Variants
              </h2>
            </div>

            {variants.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                No variants yet — add one below.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="p-3">Variant 1</th>
                    <th className="p-3">Variant 2</th>
                    <th className="p-3">Variant 3</th>
                    <th className="p-3">Stock</th>
                    <th className="p-3">Price VND</th>
                    <th className="p-3">Price USD</th>
                    <th className="p-3">Status</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v: any) => (
                    <tr
                      key={v.id}
                      className={`border-t border-gray-100 hover:bg-gray-50 transition ${form.id === v.id ? "bg-blue-50" : ""
                        }`}
                    >
                      <td className="p-3">
                        {v.variant1 ? (
                          <>
                            <span className="text-gray-400">
                              {v.variant1}:
                            </span>{" "}
                            {v.value1}
                          </>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        {v.variant2 ? (
                          <>
                            <span className="text-gray-400">
                              {v.variant2}:
                            </span>{" "}
                            {v.value2}
                          </>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        {v.variant3 ? (
                          <>
                            <span className="text-gray-400">
                              {v.variant3}:
                            </span>{" "}
                            {v.value3}
                          </>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={
                            v.stock === 0
                              ? "text-red-500 font-medium"
                              : "text-gray-700"
                          }
                        >
                          {v.stock}
                        </span>
                      </td>
                      <td className="p-3 text-gray-700">
                        {v.priceVND?.toLocaleString()}
                      </td>
                      <td className="p-3 text-gray-700">
                        {v.priceUSD != null ? `$${v.priceUSD.toLocaleString()}` : "—"}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${v.status === "Active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                            }`}
                        >
                          {v.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => editVariant(v)}
                            className="text-sm text-gray-600 hover:text-gray-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteVariantRow(v.id)}
                            className="text-sm text-red-500 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* ============ VARIANT FORM + IMAGES ============ */}

          <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 mb-12">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-gray-900">
                {form.id ? "Edit Variant" : "New Variant"}
              </h2>
              {form.id && (
                <button
                  onClick={newVariant}
                  className="text-sm text-gray-500 hover:text-gray-800"
                >
                  Cancel edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              {([1, 2, 3] as const).map((n) => (
                <div
                  key={n}
                  className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                >
                  <p className="text-xs font-semibold text-gray-400 mb-2">
                    Variant {n}
                    {n > 1 && (
                      <span className="font-normal"> · optional</span>
                    )}
                  </p>
                  <div className="space-y-2">
                    <div>
                      <label className={labelClass}>Name</label>
                      <input
                        className={inputClass}
                        placeholder={
                          n === 1 ? "Color" : n === 2 ? "Material" : "Size"
                        }
                        value={(form as any)[`variant${n}`]}
                        onChange={(e) =>
                          setForm({ ...form, [`variant${n}`]: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Value</label>
                      <input
                        className={inputClass}
                        placeholder={
                          n === 1 ? "Red" : n === 2 ? "Silk" : "S"
                        }
                        value={(form as any)[`value${n}`]}
                        onChange={(e) =>
                          setForm({ ...form, [`value${n}`]: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>Stock (quantity)</label>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="0"
                  value={form.stock}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    setForm({ ...form, stock: Number(e.target.value) })
                  }
                />
              </div>

              <div>
                <label className={labelClass}>Price (VND)</label>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="0"
                  value={form.priceVND}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    setForm({ ...form, priceVND: Number(e.target.value) })
                  }
                />
              </div>

              <div>
                <label className={labelClass}>Price (USD)</label>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="0"
                  value={form.priceUSD}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    setForm({ ...form, priceUSD: Number(e.target.value) })
                  }
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

            {/* ---- Images, embedded, driven by the form above ---- */}

            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Images</h3>
                  {canManageImages && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Shared across all sizes for{" "}
                      <span className="font-medium text-gray-600">
                        {imgKeyValue1}
                        {imgKeyValue2 ? ` / ${imgKeyValue2}` : ""}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {!canManageImages ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-400">
                  Fill in Variant 1{needsValue2 ? " and Variant 2" : ""} above
                  (then click away from the field) to manage images for this
                  combination.
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-4 mb-5">

                    <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition">
                      Choose files
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>

                    {dirty && (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                        Image changes will save with the variant
                      </span>
                    )}
                  </div>

                  {staged.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-400">
                      No images yet for this combination — choose files above.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-4">
                      {staged.map((img, index) => (
                        <div
                          key={img.kind === "existing" ? img.id : img.tempId}
                          draggable
                          onDragStart={() => setDraggedIndex(index)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleDrop(index)}
                          className="group relative w-28 h-28 rounded-lg overflow-hidden border border-gray-200 shadow-sm cursor-grab active:cursor-grabbing"
                        >
                          <img
                            src={
                              img.kind === "existing"
                                ? img.url
                                : img.previewUrl
                            }
                            alt=""
                            className={`w-full h-full object-cover ${img.kind === "new" ? "opacity-70" : ""
                              }`}
                          />

                          {img.kind === "new" && (
                            <span className="absolute bottom-1 left-1 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              NEW
                            </span>
                          )}

                          <button
                            onClick={() => handleRemove(index)}
                            className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white text-xs opacity-0 group-hover:opacity-100 transition"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {staged.length > 1 && (
                    <p className="mt-3 text-xs text-gray-400">
                      Drag images to reorder them.
                    </p>
                  )}
                </>
              )}
            </div>
            {processing && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Processing images…</span>
                  <span>{processProgress.done}/{processProgress.total}</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{
                      width: `${(processProgress.done / Math.max(processProgress.total, 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={saveVariant}
                disabled={syncing}
                className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition disabled:opacity-50"
              >
                {processing ? "Processing images…" : syncing ? "Saving…" : form.id ? "Update Variant" : "Create Variant"}
              </button>
            </div>

          </section>
        </>
      )}
    </div>
  );
}