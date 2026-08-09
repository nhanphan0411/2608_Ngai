"use client";

import { useEffect, useMemo, useState } from "react";
import { processImage } from "@/lib/imageProcessing";

type StagedImage =
  | { kind: "existing"; id: number; url: string }
  | { kind: "new"; tempId: string; file: File; previewUrl: string };

type SizeRow = {
  id?: number;
  variant3: string;
  value3: string;
  stock: number;
  priceVND: number;
  priceUSD: number;
  status: string;
};

type Group = {
  key: string;
  variant1: string;
  value1: string;
  variant2: string;
  value2: string;
  rows: SizeRow[];
};

function groupKey(value1: string, value2: string) {
  return `${value1}||${value2}`;
}

export default function InventoryPage() {
  // ---- shared pickers ----
  const [collections, setCollections] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [collectionSlug, setCollectionSlug] = useState("");
  const [productSlug, setProductSlug] = useState("");

  // ---- raw data for the current product ----
  const [variants, setVariants] = useState<any[]>([]);
  const [allImages, setAllImages] = useState<any[]>([]);

  // ---- new color/style group form (creates the group's first size) ----
  const emptyNewGroup = {
    variant1: "Color",
    value1: "",
    variant2: "",
    value2: "",
    variant3: "Size",
    value3: "",
    stock: 0,
    priceVND: 0,
    priceUSD: 0,
    status: "Active",
  };
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroup, setNewGroup] = useState(emptyNewGroup);

  // ---- image editor — one group's images open for editing at a time ----
  const [activeImageGroupKey, setActiveImageGroupKey] = useState<string | null>(null);
  const [staged, setStaged] = useState<StagedImage[]>([]);
  const [originalIds, setOriginalIds] = useState<number[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState({ done: 0, total: 0 });
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // ---- group header rename (value1/value2) — one group at a time ----
  const [renamingGroupKey, setRenamingGroupKey] = useState<string | null>(null);
  const [renameValue1, setRenameValue1] = useState("");
  const [renameValue2, setRenameValue2] = useState("");

  // ---- inline size-row edits, keyed by variant id ("new:<groupKey>" for the add-row) ----
  const [rowEdits, setRowEdits] = useState<Record<string, SizeRow>>({});
  const [savingRowKey, setSavingRowKey] = useState<string | null>(null);

  // ---------------- shared pickers ----------------

  useEffect(() => {
    fetch("/api/admin/collections")
      .then((res) => res.json())
      .then((data) => setCollections(data as any[]));
  }, []);

  useEffect(() => {
    setProducts([]);
    setProductSlug("");
    resetProductState();

    if (!collectionSlug) return;

    fetch(`/api/admin/products?collection=${collectionSlug}`)
      .then((res) => res.json())
      .then((data) => setProducts(data as any[]));
  }, [collectionSlug]);

  useEffect(() => {
    resetProductState();

    if (!productSlug) return;

    loadVariants();
    loadAllImages();
  }, [productSlug]);

  function resetProductState() {
    setVariants([]);
    setAllImages([]);
    setShowNewGroup(false);
    setNewGroup(emptyNewGroup);
    closeImageEditor();
    setRenamingGroupKey(null);
    setRowEdits({});
  }

  // ---------------- data loading ----------------

  async function loadVariants() {
    const res = await fetch(`/api/admin/inventory?product=${productSlug}`);
    setVariants((await res.json()) as any[]);
  }

  // No value1 param → the existing GET route returns every image for the
  // product in one call (see app/api/admin/images/route.ts). We group them
  // client-side instead of re-fetching per group.
  async function loadAllImages() {
    const res = await fetch(`/api/admin/images?product_slug=${productSlug}`);
    setAllImages((await res.json()) as any[]);
  }

  // ---------------- grouping: variants → color/style groups ----------------

  const groups: Group[] = useMemo(() => {
    const map = new Map<string, Group>();

    for (const v of variants) {
      const key = groupKey(v.value1 ?? "", v.value2 ?? "");

      if (!map.has(key)) {
        map.set(key, {
          key,
          variant1: v.variant1 ?? "Color",
          value1: v.value1 ?? "",
          variant2: v.variant2 ?? "",
          value2: v.value2 ?? "",
          rows: [],
        });
      }

      map.get(key)!.rows.push({
        id: v.id,
        variant3: v.variant3 ?? "Size",
        value3: v.value3 ?? "",
        stock: v.stock ?? 0,
        priceVND: v.priceVND ?? 0,
        priceUSD: v.priceUSD ?? 0,
        status: v.status ?? "Active",
      });
    }

    return [...map.values()];
  }, [variants]);

  function imagesForGroup(group: Group) {
    return allImages.filter(
      (img) => img.value1 === group.value1 && (img.value2 ?? "") === group.value2
    );
  }

  // ---------------- image editor (same sync mechanics as before, scoped to one group) ----------------

  function closeImageEditor() {
    setActiveImageGroupKey(null);
    setStaged([]);
    setOriginalIds([]);
    setDirty(false);
  }

  function openImageEditor(group: Group) {
    setActiveImageGroupKey(group.key);

    const imgs = imagesForGroup(group);

    setStaged(
      imgs.map((img) => ({
        kind: "existing" as const,
        id: img.id,
        url: img.url_thumb ?? img.url,
      }))
    );
    setOriginalIds(imgs.map((img) => img.id));
    setDirty(false);
  }

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

  async function syncImages(group: Group) {
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
    formData.append("value1", group.value1);
    if (group.value2) formData.append("value2", group.value2);
    formData.append("deleteIds", JSON.stringify(deleteIds));
    formData.append("order", JSON.stringify(order));

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

    await loadAllImages();
    setDirty(false);
    setSyncing(false);
    closeImageEditor();
  }

  // ---------------- group rename (value1/value2 for every size in the group) ----------------

  function startRename(group: Group) {
    setRenamingGroupKey(group.key);
    setRenameValue1(group.value1);
    setRenameValue2(group.value2);
  }

  async function saveRename(group: Group) {
    const newValue1 = renameValue1.trim() || "original";
    const newValue2 = renameValue2.trim();

    if (newValue1 !== group.value1 || newValue2 !== group.value2) {
      // Every size in the group shares value1/value2, so renaming the group
      // means updating every row — then repointing its images so they
      // follow instead of getting orphaned under the old key.
      for (const row of group.rows) {
        await fetch("/api/admin/inventory", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: row.id,
            collection_slug: collectionSlug,
            product_slug: productSlug,
            variant1: group.variant1,
            value1: newValue1,
            variant2: group.variant2,
            value2: newValue2,
            variant3: row.variant3,
            value3: row.value3,
            stock: row.stock,
            priceVND: row.priceVND,
            priceUSD: row.priceUSD,
            status: row.status,
          }),
        });
      }

      await fetch("/api/admin/images/repoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_slug: productSlug,
          old_value1: group.value1,
          old_value2: group.value2 || null,
          new_value1: newValue1,
          new_value2: newValue2 || null,
        }),
      });

      await loadVariants();
      await loadAllImages();
    }

    setRenamingGroupKey(null);
  }

  // ---------------- size rows (no image controls anywhere in here) ----------------

  function rowKey(group: Group, id: number | undefined) {
    return id !== undefined ? `row:${id}` : `new:${group.key}`;
  }

  function getRowEdit(group: Group, row: SizeRow): SizeRow {
    return rowEdits[rowKey(group, row.id)] ?? row;
  }

  function updateRowEdit(group: Group, row: SizeRow, patch: Partial<SizeRow>) {
    const key = rowKey(group, row.id);
    setRowEdits((prev) => ({
      ...prev,
      [key]: { ...getRowEdit(group, row), ...patch },
    }));
  }

  async function saveRow(group: Group, row: SizeRow) {
    const edited = getRowEdit(group, row);
    const key = rowKey(group, row.id);
    setSavingRowKey(key);

    const method = row.id ? "PUT" : "POST";

    await fetch("/api/admin/inventory", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: row.id,
        collection_slug: collectionSlug,
        product_slug: productSlug,
        variant1: group.variant1,
        value1: group.value1,
        variant2: group.variant2,
        value2: group.value2,
        variant3: edited.variant3 || "Size",
        value3: edited.value3,
        stock: edited.stock,
        priceVND: edited.priceVND,
        priceUSD: edited.priceUSD,
        status: edited.status,
      }),
    });

    setRowEdits((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    setSavingRowKey(null);
    await loadVariants();
  }

  async function deleteRow(id: number) {
    if (!confirm("Delete this size?")) return;

    await fetch("/api/admin/inventory", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    await loadVariants();
    await loadAllImages();
  }

  // ---------------- new group ----------------

  async function createGroup() {
    if (!newGroup.value1.trim()) {
      alert("Enter a value for Color (e.g. Red)");
      return;
    }

    await fetch("/api/admin/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        collection_slug: collectionSlug,
        product_slug: productSlug,
        variant1: newGroup.variant1 || "Color",
        value1: newGroup.value1,
        variant2: newGroup.variant2 || null,
        value2: newGroup.variant2 ? newGroup.value2 : null,
        variant3: newGroup.variant3 || "Size",
        value3: newGroup.value3,
        stock: newGroup.stock,
        priceVND: newGroup.priceVND,
        priceUSD: newGroup.priceUSD,
        status: newGroup.status,
      }),
    });

    setNewGroup(emptyNewGroup);
    setShowNewGroup(false);
    await loadVariants();
  }

  // ---------------- shared styles ----------------

  const selectClass =
    "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400";

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  const labelClass = "block text-xs font-medium text-gray-500 mb-1";

  const cellInputClass =
    "w-full rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";

  const selectedProductName = products.find(
    (p) => p.product_slug === productSlug
  )?.product_name;

  const selectedCollectionName = collections.find(
    (c) => c.collection_slug === collectionSlug
  )?.collection_name;

  // ---------------- render ----------------

  return (
    <div className="w-full max-w-5xl">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Inventory</h1>

      {/* Picker bar */}
      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex w-full flex-col sm:w-auto">
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

        <div className="flex w-full flex-col sm:w-auto">
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
          <div className="w-full text-xs text-gray-400 sm:ml-auto sm:w-auto sm:text-sm">
            {selectedCollectionName}{" "}
            <span className="mx-1 text-gray-300">/</span>
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
          {/* ============ GROUPS ============ */}

          {groups.length === 0 && !showNewGroup && (
            <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              No color/style groups yet — add one below.
            </div>
          )}

          {groups.map((group) => {
            const groupImages = imagesForGroup(group);
            const isRenaming = renamingGroupKey === group.key;
            const isEditingImages = activeImageGroupKey === group.key;
            const addRowTemplate: SizeRow = {
              id: undefined,
              variant3: group.rows[0]?.variant3 ?? "Size",
              value3: "",
              stock: 0,
              priceVND: 0,
              priceUSD: 0,
              status: "Active",
            };
            const addRowEdit = getRowEdit(group, addRowTemplate);
            const addRowKey = rowKey(group, undefined);

            return (
              <section
                key={group.key}
                className="rounded-xl border border-gray-200 bg-white shadow-sm mb-8 overflow-hidden"
              >
                {/* ---- group header ---- */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3 sm:px-5 sm:py-4">
                  {isRenaming ? (
                    <div className="flex flex-wrap items-end gap-3">
                      <div>
                        <label className={labelClass}>{group.variant1}</label>
                        <input
                          className={inputClass}
                          value={renameValue1}
                          onChange={(e) => setRenameValue1(e.target.value)}
                        />
                      </div>
                      {group.variant2 && (
                        <div>
                          <label className={labelClass}>{group.variant2}</label>
                          <input
                            className={inputClass}
                            value={renameValue2}
                            onChange={(e) => setRenameValue2(e.target.value)}
                          />
                        </div>
                      )}
                      <button
                        onClick={() => saveRename(group)}
                        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setRenamingGroupKey(null)}
                        className="text-sm text-gray-500 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {group.value1}
                        {group.value2 ? ` / ${group.value2}` : ""}
                      </h2>
                      <button
                        onClick={() => startRename(group)}
                        className="text-xs text-gray-400 hover:text-gray-700"
                      >
                        Rename
                      </button>
                    </div>
                  )}

                  <span className="text-xs text-gray-400">
                    {group.rows.length} size{group.rows.length === 1 ? "" : "s"}
                  </span>
                </div>

                {/* ---- images (managed once per group) ---- */}
                <div className="border-b border-gray-100 px-4 py-4 sm:px-5 sm:py-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Images
                    </h3>
                    {!isEditingImages && (<button onClick={() => openImageEditor(group)} className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 transition" >
                      Edit </button>)}
                  </div>

                  {!isEditingImages ? (
                    groupImages.length === 0 ? (
                      <p className="text-sm text-gray-400">
                        No images yet — shared across every size in this
                        group.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {groupImages.map((img) => (
                          <div
                            key={img.id}
                            className="h-16 w-16 overflow-hidden rounded-lg border border-gray-200 sm:h-20 sm:w-20"
                          >
                            <img
                              src={img.url_thumb ?? img.url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <div className="flex flex-wrap items-center gap-4 mb-4">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
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
                            Unsaved changes
                          </span>
                        )}
                      </div>

                      {staged.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-400 mb-4">
                          No images yet — choose files above.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {staged.map((img, index) => (
                            <div
                              key={img.kind === "existing" ? img.id : img.tempId}
                              draggable
                              onDragStart={() => setDraggedIndex(index)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => handleDrop(index)}
                              className="group relative h-20 w-20 cursor-grab overflow-hidden rounded-lg border border-gray-200 shadow-sm active:cursor-grabbing sm:h-24 sm:w-24"
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

                      {processing && (
                        <div className="mb-4">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Processing images…</span>
                            <span>
                              {processProgress.done}/{processProgress.total}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 transition-all"
                              style={{
                                width: `${(processProgress.done /
                                  Math.max(processProgress.total, 1)) *
                                  100
                                  }%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end gap-4">
                        <button
                          onClick={closeImageEditor}
                          className="text-sm text-gray-500 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => syncImages(group)}
                          disabled={syncing || !dirty}
                          className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 transition disabled:opacity-50"
                        >
                          {processing
                            ? "Processing images…"
                            : syncing
                              ? "Saving…"
                              : "Save images"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ---- sizes (no image controls in here at all) ---- */}
                <div className="px-4 py-4 sm:px-5 sm:py-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Sizes
                  </h3>

                  <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                  <table className="min-w-[720px] w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                        <th className="p-2">{group.rows[0]?.variant3 ?? "Size"}</th>
                        <th className="p-2">Stock</th>
                        <th className="p-2">Price VND</th>
                        <th className="p-2">Price USD</th>
                        <th className="p-2">Status</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((row) => {
                        const key = rowKey(group, row.id);
                        const edited = getRowEdit(group, row);

                        return (
                          <tr key={key} className="border-t border-gray-100">
                            <td className="p-2">
                              <input
                                className={cellInputClass}
                                value={edited.value3}
                                onChange={(e) =>
                                  updateRowEdit(group, row, {
                                    value3: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                className={cellInputClass}
                                value={edited.stock}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) =>
                                  updateRowEdit(group, row, {
                                    stock: Number(e.target.value),
                                  })
                                }
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                className={cellInputClass}
                                value={edited.priceVND}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) =>
                                  updateRowEdit(group, row, {
                                    priceVND: Number(e.target.value),
                                  })
                                }
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                className={cellInputClass}
                                value={edited.priceUSD}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) =>
                                  updateRowEdit(group, row, {
                                    priceUSD: Number(e.target.value),
                                  })
                                }
                              />
                            </td>
                            <td className="p-2">
                              <select
                                className={selectClass}
                                value={edited.status}
                                onChange={(e) =>
                                  updateRowEdit(group, row, {
                                    status: e.target.value,
                                  })
                                }
                              >
                                <option>Active</option>
                                <option>Draft</option>
                              </select>
                            </td>
                            <td className="p-2">
                              <div className="flex justify-end gap-3">
                                <button
                                  onClick={() => saveRow(group, row)}
                                  disabled={savingRowKey === key}
                                  className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100 hover:text-blue-800 disabled:opacity-50 transition"
                                >
                                  {savingRowKey === key ? "Saving…" : "Save"}
                                </button>
                                <button
                                  onClick={() => deleteRow(row.id!)}
                                  className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-100 hover:text-red-700 transition"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {/* ---- add-size row ---- */}
                      <tr className="border-t border-gray-100 bg-gray-50">
                        <td className="p-2">
                          <input
                            className={cellInputClass}
                            placeholder="e.g. M"
                            value={addRowEdit.value3}
                            onChange={(e) =>
                              updateRowEdit(group, addRowTemplate, {
                                value3: e.target.value,
                              })
                            }
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            className={cellInputClass}
                            value={addRowEdit.stock}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) =>
                              updateRowEdit(group, addRowTemplate, {
                                stock: Number(e.target.value),
                              })
                            }
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            className={cellInputClass}
                            value={addRowEdit.priceVND}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) =>
                              updateRowEdit(group, addRowTemplate, {
                                priceVND: Number(e.target.value),
                              })
                            }
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            className={cellInputClass}
                            value={addRowEdit.priceUSD}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) =>
                              updateRowEdit(group, addRowTemplate, {
                                priceUSD: Number(e.target.value),
                              })
                            }
                          />
                        </td>
                        <td className="p-2">
                          <select
                            className={selectClass}
                            value={addRowEdit.status}
                            onChange={(e) =>
                              updateRowEdit(group, addRowTemplate, {
                                status: e.target.value,
                              })
                            }
                          >
                            <option>Active</option>
                            <option>Draft</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <button
                            onClick={() => saveRow(group, addRowTemplate)}
                            disabled={
                              savingRowKey === addRowKey || !addRowEdit.value3.trim()
                            }
                            className="text-sm text-green-600 hover:text-green-800 disabled:opacity-50"
                          >
                            {savingRowKey === addRowKey ? "Adding…" : "+ Add size"}
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  </div>
                </div>
              </section>
            );
          })}

          {/* ============ NEW GROUP ============ */}

          {!showNewGroup ? (
            <button
              onClick={() => setShowNewGroup(true)}
              className="mb-12 rounded-lg border border-dashed border-gray-300 px-5 py-3 text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-900"
            >
              + New color/style group
            </button>
          ) : (
            <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 mb-12">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-semibold text-gray-900">
                  New color/style group
                </h2>
                <button
                  onClick={() => {
                    setShowNewGroup(false);
                    setNewGroup(emptyNewGroup);
                  }}
                  className="text-sm text-gray-500 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>

              <p className="text-xs text-gray-400 mb-4">
                Leave Color blank if this product has no color/style split —
                it'll default to a single shared group. This creates the
                group's first size; add more sizes from the group's table
                once it's created.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelClass}>Color</label>
                  <input
                    className={inputClass}
                    placeholder="Red"
                    value={newGroup.value1}
                    onChange={(e) =>
                      setNewGroup({ ...newGroup, value1: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Material (optional)</label>
                  <input
                    className={inputClass}
                    placeholder="Silk"
                    value={newGroup.value2}
                    onChange={(e) =>
                      setNewGroup({
                        ...newGroup,
                        variant2: e.target.value ? "Material" : "",
                        value2: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <label className={labelClass}>Size</label>
                  <input
                    className={inputClass}
                    placeholder="S"
                    value={newGroup.value3}
                    onChange={(e) =>
                      setNewGroup({ ...newGroup, value3: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Stock</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={newGroup.stock}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) =>
                      setNewGroup({
                        ...newGroup,
                        stock: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Price (VND)</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={newGroup.priceVND}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) =>
                      setNewGroup({
                        ...newGroup,
                        priceVND: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Price (USD)</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={newGroup.priceUSD}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) =>
                      setNewGroup({
                        ...newGroup,
                        priceUSD: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select
                    className={selectClass + " w-full"}
                    value={newGroup.status}
                    onChange={(e) =>
                      setNewGroup({ ...newGroup, status: e.target.value })
                    }
                  >
                    <option>Active</option>
                    <option>Draft</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={createGroup}
                  className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition"
                >
                  Create group
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}