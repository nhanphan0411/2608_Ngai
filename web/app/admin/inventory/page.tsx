"use client";

import { useEffect, useMemo, useState } from "react";
import { processImage } from "@/lib/imageProcessing";

type StagedImage =
  | { kind: "existing"; id: number; url: string }
  | { kind: "new"; tempId: string; file: File; previewUrl: string };

type SizeRow = { id?: number; variant3: string; value3: string; stock: number; priceVND: number; priceUSD: number; status: string };
type Group = { key: string; variant_group_id: number; variant1: string; value1: string; variant2: string; value2: string; rows: SizeRow[] };
type NewSize = { value3: string; stock: number; priceVND: number; priceUSD: number; status: string };
type StagedNewImage = { tempId: string; file: File; previewUrl: string };

const DEFAULT_VALUE1 = "original";
const groupKey = (v1: string, v2: string) => `${v1}||${v2}`;
const norm = (s: string) => s.trim().toLowerCase();

export default function InventoryPage() {
  // Pickers
  const [collections, setCollections] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [collectionId, setCollectionId] = useState<number | "">("");
  const [productId, setProductId] = useState<number | "">("");

  // Data
  const [variants, setVariants] = useState<any[]>([]);
  const [allImages, setAllImages] = useState<any[]>([]);

  // Edit modal
  const [editingGroupKey, setEditingGroupKey] = useState<string | null>(null);
  const [editingRows, setEditingRows] = useState<SizeRow[]>([]);
  const [deletedRowIds, setDeletedRowIds] = useState<number[]>([]);
  const [renameValue1, setRenameValue1] = useState("");
  const [renameValue2, setRenameValue2] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [deletingGroupKey, setDeletingGroupKey] = useState<string | null>(null);

  // New group
  const emptyNewGroup = { variant1: "Color", value1: "", variant2: "", value2: "", variant3: "Size" };
  const emptySize = (): NewSize => ({ value3: "", stock: 0, priceVND: 0, priceUSD: 0, status: "Draft" });
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroup, setNewGroup] = useState(emptyNewGroup);
  const [newSizes, setNewSizes] = useState<NewSize[]>([emptySize()]);
  const [newGroupImages, setNewGroupImages] = useState<StagedNewImage[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Image editor
  const [staged, setStaged] = useState<StagedImage[]>([]);
  const [originalIds, setOriginalIds] = useState<number[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState({ done: 0, total: 0 });
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => { fetch("/api/admin/collections").then(r => (r.json()) as any).then(setCollections); }, []);

  useEffect(() => {
    setProducts([]); setProductId(""); resetProductState();
    if (!collectionId) return;
    fetch(`/api/admin/products?collection=${collectionId}`).then(r => (r.json()) as any).then(setProducts);
  }, [collectionId]);

  useEffect(() => {
    resetProductState();
    if (!productId) return;
    loadVariants(); loadAllImages();
  }, [productId]);

  function resetProductState() {
    setVariants([]); setAllImages([]); setShowNewGroup(false);
    setNewGroup(emptyNewGroup); setNewSizes([emptySize()]); setNewGroupImages([]);
    closeEditModal();
  }

  async function loadVariants() {
    setVariants(await (await fetch(`/api/admin/inventory?product=${productId}`)).json());
  }
  async function loadAllImages() {
    setAllImages(await (await fetch(`/api/admin/images?product_id=${productId}`)).json());
  }

  // Small helper — every inventory write goes through here so error handling stays in one place.
  async function inventoryReq(method: string, body: any, errMsg: string) {
    const res = await fetch("/api/admin/inventory", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(errMsg);
    return res;
  }

  function rowPayload(group: Group, row: SizeRow, value1 = group.value1, value2 = group.value2) {
    return {
      id: row.id, product_id: productId,
      variant1: group.variant1 || "Color", value1, variant2: group.variant2, value2,
      variant3: row.variant3 || "Size", value3: row.value3,
      stock: row.stock, priceVND: row.priceVND, priceUSD: row.priceUSD, status: row.status,
    };
  }

  const groups: Group[] = useMemo(() => {
    const map = new Map<string, Group>();
    for (const v of variants) {
      const key = groupKey(v.value1 ?? "", v.value2 ?? "");
      if (!map.has(key)) map.set(key, { key, variant_group_id: v.variant_group_id, variant1: v.variant1 ?? "Color", value1: v.value1 ?? "", variant2: v.variant2 ?? "", value2: v.value2 ?? "", rows: [] });
      map.get(key)!.rows.push({ id: v.id, variant3: v.variant3 ?? "Size", value3: v.value3 ?? "", stock: v.stock ?? 0, priceVND: v.priceVND ?? 0, priceUSD: v.priceUSD ?? 0, status: v.status ?? "Active" });
    }
    return [...map.values()];
  }, [variants]);

  const imagesForGroup = (group: Group) => allImages.filter(img => img.variant_group_id === group.variant_group_id);
  const editingGroup = groups.find(g => g.key === editingGroupKey);

  function openEditModal(group: Group) {
    setEditingGroupKey(group.key);
    setEditingRows(group.rows.map(r => ({ ...r })));
    setDeletedRowIds([]);
    setRenameValue1(group.value1);
    setRenameValue2(group.value2);
    const imgs = imagesForGroup(group);
    setStaged(imgs.map(img => ({ kind: "existing" as const, id: img.id, url: img.url_thumb ?? img.url })));
    setOriginalIds(imgs.map(img => img.id));
    setDirty(false);
  }

  function closeEditModal() {
    setEditingGroupKey(null); setEditingRows([]); setDeletedRowIds([]);
    setStaged([]); setOriginalIds([]); setDirty(false); setRenaming(false); setSyncing(false); setProcessing(false);
  }

  // ---- images ----

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    const items: StagedImage[] = Array.from(files).map(file => ({ kind: "new", tempId: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) }));
    setStaged(prev => [...prev, ...items]);
    setDirty(true);
    e.target.value = "";
  }

  function handleRemoveImage(index: number) {
    setStaged(prev => prev.filter((_, i) => i !== index));
    setDirty(true);
  }

  function handleDrop(targetIndex: number) {
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    setStaged(prev => {
      const reordered = [...prev];
      const [moved] = reordered.splice(draggedIndex, 1);
      reordered.splice(targetIndex, 0, moved);
      return reordered;
    });
    setDirty(true);
    setDraggedIndex(null);
  }

  // Uploads/deletes/reorders images for a group by its variant_group_id.
  // Never touches value1/value2 — that's renameGroup()'s job, kept deliberately separate.
  async function syncGroupImages(group: Group) {
    const stagedExistingIds = staged.filter((s): s is Extract<StagedImage, { kind: "existing" }> => s.kind === "existing").map(s => s.id);
    const deleteIds = originalIds.filter(id => !stagedExistingIds.includes(id));
    const newFiles = staged.filter((s): s is Extract<StagedImage, { kind: "new" }> => s.kind === "new");
    const order = staged.map(s => s.kind === "existing" ? { type: "existing", id: s.id } : { type: "new", fileIndex: newFiles.findIndex(f => f.tempId === s.tempId) });

    const formData = new FormData();
    formData.append("variant_group_id", String(group.variant_group_id));
    formData.append("product_slug", selectedProductSlug);
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

    const res = await fetch("/api/admin/images/sync", { method: "POST", body: formData });
    const data = await res.json() as { images?: any[]; failures?: string[]; error?: string };
    if (!res.ok) throw new Error(data.error || "Image sync failed.");
    if (data.failures?.length) throw new Error(`Some image changes couldn't be completed:\n${data.failures.join("\n")}`);
  }

  async function uploadNewGroupImages(variantGroupId: number, value1: string, value2: string) {
    if (newGroupImages.length === 0) return;

    setProcessing(true);
    setProcessProgress({ done: 0, total: newGroupImages.length });

    const formData = new FormData();
    formData.append("variant_group_id", String(variantGroupId));
    formData.append("product_slug", selectedProductSlug);
    formData.append("value1", value1);
    if (value2) formData.append("value2", value2);
    formData.append("deleteIds", JSON.stringify([]));
    formData.append(
      "order",
      JSON.stringify(newGroupImages.map((_, i) => ({ type: "new", fileIndex: i })))
    );

    for (let i = 0; i < newGroupImages.length; i++) {
      const { thumb, mid, large } = await processImage(newGroupImages[i].file);
      formData.append(`new_thumb_${i}`, thumb, `thumb-${i}.webp`);
      formData.append(`new_mid_${i}`, mid, `mid-${i}.webp`);
      formData.append(`new_large_${i}`, large, `large-${i}.webp`);
      setProcessProgress({ done: i + 1, total: newGroupImages.length });
    }

    setProcessing(false);

    const res = await fetch("/api/admin/images/sync", { method: "POST", body: formData });
    const data = await res.json() as { images?: any[]; failures?: string[]; error?: string };
    if (!res.ok) throw new Error(data.error || "Image upload failed.");
    if (data.failures?.length) throw new Error(`Some images couldn't be uploaded:\n${data.failures.join("\n")}`);
  }

  // ---- save (sizes + images only — value1/value2 never change here; see renameGroup) ----

  async function saveAllChanges() {
    if (!editingGroup || processing || syncing || renaming) return;
    if (editingRows.some(r => !r.value3.trim())) { alert("Please enter a size for every size row."); return; }

    setSyncing(true);
    const group = editingGroup;

    try {
      // Images first — if this fails, no size rows have been touched yet, so nothing is inconsistent.
      await syncGroupImages(group);

      for (const id of deletedRowIds) {
        await inventoryReq("DELETE", { id }, "Failed to delete a size.");
      }
      for (const row of editingRows) {
        await inventoryReq(row.id ? "PUT" : "POST", rowPayload(group, row), `Failed to save size "${row.value3}".`);
      }

      await loadVariants();
      await loadAllImages();

      const fresh = (await (await fetch(`/api/admin/inventory?product=${productId}`)).json() as any[])
        .filter(v => v.variant_group_id === group.variant_group_id)
        .map(v => ({ id: v.id, variant3: v.variant3 ?? "Size", value3: v.value3 ?? "", stock: v.stock ?? 0, priceVND: v.priceVND ?? 0, priceUSD: v.priceUSD ?? 0, status: v.status ?? "Active" }));
      setEditingRows(fresh);

      const freshImages = (await (await fetch(`/api/admin/images?product_id=${productId}`)).json() as any[])
        .filter(img => img.variant_group_id === group.variant_group_id);
      setStaged(freshImages.map(img => ({ kind: "existing" as const, id: img.id, url: img.url_thumb ?? img.url })));
      setOriginalIds(freshImages.map(img => img.id));

      setDeletedRowIds([]); setDirty(false);
      alert("All changes saved.");
    } catch (err: any) {
      alert(err.message || "Failed to save changes.");
      await loadVariants(); await loadAllImages();
    } finally {
      setProcessing(false); setSyncing(false);
    }
  }

  // ---- rename — isolated action, own confirm, own collision check ----
  // NOTE: unlike the old slug-based flow, this does NOT support merging into
  // an existing colliding group yet — variant_groups has a UNIQUE(product_id,
  // value1, value2) constraint, so renaming into a name that already exists
  // will fail. The collision warning below is informational only for now.

  async function renameGroup() {
    if (!editingGroup) return;
    const newValue1 = norm(renameValue1) || DEFAULT_VALUE1;
    const newValue2 = norm(renameValue2);
    const oldValue1 = norm(editingGroup.value1);
    const oldValue2 = norm(editingGroup.value2);
    if (newValue1 === oldValue1 && newValue2 === oldValue2) return; // nothing actually changed once normalized

    const collision = groups.find(g => g.key !== editingGroup.key && norm(g.value1) === newValue1 && norm(g.value2) === newValue2);
    const label = `${newValue1}${newValue2 ? " / " + newValue2 : ""}`;
    const confirmMsg = collision
      ? `A group "${label}" already exists with ${collision.rows.length} size(s). Renaming here isn't supported yet — pick a different name, or move sizes manually.`
      : `Rename this group to "${label}"?`;
    if (collision) { alert(confirmMsg); return; }
    if (!confirm(confirmMsg)) return;

    setRenaming(true);
    const group = editingGroup;

    try {
      const res = await fetch("/api/admin/images/repoint", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: group.variant_group_id, value1: newValue1, value2: newValue2 || null }),
      });
      if (!res.ok) throw new Error("Failed to rename group.");

      await loadVariants();
      await loadAllImages();
      setEditingGroupKey(groupKey(newValue1, newValue2));
      setRenameValue1(newValue1);
      setRenameValue2(newValue2);
    } catch (err: any) {
      alert(err.message || "Rename failed.");
      await loadVariants(); await loadAllImages();
    } finally {
      setRenaming(false);
    }
  }

  // ---- delete group ----

  async function deleteGroup(group: Group) {
    const label = `${group.value1}${group.value2 ? " / " + group.value2 : ""}`;
    if (!confirm(`Delete "${label}"?\n\nThis removes every size in this group and its shared images.\n\nThis cannot be undone.`)) return;

    setDeletingGroupKey(group.key);
    try {
      for (const row of group.rows) {
        if (!row.id) continue;
        await inventoryReq("DELETE", { id: row.id }, `Failed to delete size "${row.value3}".`);
      }
      if (editingGroupKey === group.key) closeEditModal();
      await loadVariants(); await loadAllImages();
    } catch (err: any) {
      alert(err.message || "Delete failed.");
      await loadVariants(); await loadAllImages();
    } finally {
      setDeletingGroupKey(null);
    }
  }

  // ---- editing rows within the modal ----

  function updateEditingRow(index: number, patch: Partial<SizeRow>) {
    setEditingRows(prev => prev.map((r, i) => i === index ? { ...r, ...patch } : r));
    setDirty(true);
  }
  function addSizeToEditingGroup() {
    setEditingRows(prev => [...prev, { id: undefined, variant3: editingGroup?.rows[0]?.variant3 || "Size", value3: "", stock: 0, priceVND: 0, priceUSD: 0, status: "Active" }]);
    setDirty(true);
  }
  function deleteEditingSize(row: SizeRow, index: number) {
    if (row.id) setDeletedRowIds(prev => prev.includes(row.id!) ? prev : [...prev, row.id!]);
    setEditingRows(prev => prev.filter((_, i) => i !== index));
    setDirty(true);
  }

  // ---- new group ----

  const addNewSize = () => setNewSizes(prev => [...prev, emptySize()]);
  const updateNewSize = (i: number, patch: Partial<NewSize>) => setNewSizes(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  const removeNewSize = (i: number) => setNewSizes(prev => prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i));
  function handleNewGroupFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    const items: StagedNewImage[] = Array.from(files).map(file => ({
      tempId: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setNewGroupImages(prev => [...prev, ...items]);
    e.target.value = "";
  }

  function removeNewGroupImage(tempId: string) {
    setNewGroupImages(prev => prev.filter(img => img.tempId !== tempId));
  }

  async function createGroup() {
    if (!productId) return;
    const value1 = newGroup.value1.trim() || DEFAULT_VALUE1;
    const value2 = newGroup.value2.trim();
    const validSizes = newSizes.filter(s => s.value3.trim());
    if (validSizes.length === 0) { alert("Please add at least one size."); return; }

    setCreatingGroup(true);

    try {
      // Resolve (or create) the variant_groups row first — both images and
      // size rows need a real variant_group_id to attach to.
      const groupRes = await fetch("/api/admin/variant-groups", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, value1, value2: value2 || null }),
      });
      if (!groupRes.ok) throw new Error("Failed to create variant group.");
      const { id: variantGroupId } = await groupRes.json() as { id: number };

      // Images first — if this fails, no size rows exist yet, so nothing is half-created.
      await uploadNewGroupImages(variantGroupId, value1, value2);

      for (const size of validSizes) {
        await inventoryReq("POST", {
          product_id: productId,
          variant1: newGroup.variant1 || "Color", value1,
          variant2: newGroup.variant2 || null, value2: newGroup.variant2 ? value2 : null,
          variant3: newGroup.variant3 || "Size", value3: size.value3,
          stock: size.stock, priceVND: size.priceVND, priceUSD: size.priceUSD, status: size.status,
        }, `Failed to create size "${size.value3}".`);
      }

      setNewGroup(emptyNewGroup); setNewSizes([emptySize()]); setNewGroupImages([]); setShowNewGroup(false);
      await loadVariants();
      await loadAllImages();
    } catch (err: any) {
      alert(err.message || "Failed to create group.");
    } finally {
      setCreatingGroup(false);
      setProcessing(false);
    }
  }

  // ---- styles ----

  const selectClass = "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400";
  const inputClass = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "block text-xs font-medium text-gray-500 mb-1";
  const selectedProductName = products.find(p => p.id === productId)?.product_name;
  const selectedProductSlug = products.find(p => p.id === productId)?.product_slug ?? "product";
  const selectedCollectionName = collections.find(c => c.id === collectionId)?.collection_name;
  const renameChanged = editingGroup && (norm(renameValue1) || DEFAULT_VALUE1) !== norm(editingGroup.value1 || DEFAULT_VALUE1) || (editingGroup && norm(renameValue2) !== norm(editingGroup.value2));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Inventory</h1>

      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex w-full flex-col sm:w-auto">
          <label className={labelClass}>Collection</label>
          <select className={selectClass} value={collectionId} onChange={e => setCollectionId(e.target.value ? Number(e.target.value) : "")}>
            <option value="">Select collection</option>
            {collections.map((c: any) => <option key={c.id} value={c.id}>{c.collection_name}</option>)}
          </select>
        </div>
        <div className="flex w-full flex-col sm:w-auto">
          <label className={labelClass}>Product</label>
          <select className={selectClass} value={productId} onChange={e => setProductId(e.target.value ? Number(e.target.value) : "")} disabled={!collectionId}>
            <option value="">Select product</option>
            {products.map((p: any) => <option key={p.id} value={p.id}>{p.product_name}</option>)}
          </select>
        </div>
        {productId && (
          <div className="w-full text-xs text-gray-400 sm:ml-auto sm:w-auto sm:text-sm">
            {selectedCollectionName}<span className="mx-1 text-gray-300">/</span><span className="font-medium text-gray-700">{selectedProductName}</span>
          </div>
        )}
      </div>

      {!productId && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-500">
          Select a collection and product above to manage its variants.
        </div>
      )}

      {productId && (
        <>
          {groups.length === 0 && (
            <div className="mb-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-500">
              No variants yet — create your first group below.
            </div>
          )}

          <div className="space-y-5">
            {groups.map(group => {
              const groupImages = imagesForGroup(group);
              const isDeleting = deletingGroupKey === group.key;
              const totalStock = group.rows.reduce((sum, r) => sum + Number(r.stock || 0), 0);

              return (
                <section key={group.key} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-gray-900">
                          {group.value1 || DEFAULT_VALUE1}{group.value2 && <><span className="mx-1 text-gray-300">/</span>{group.value2}</>}
                        </h2>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{group.rows.length} size{group.rows.length === 1 ? "" : "s"}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">{totalStock} items in stock</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEditModal(group)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900">Edit</button>
                      <button onClick={() => deleteGroup(group)} disabled={isDeleting} className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50">{isDeleting ? "Deleting…" : "Delete"}</button>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5">
                    <div className="mb-5">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Images</h3>
                        <span className="text-xs text-gray-400">{groupImages.length} image{groupImages.length === 1 ? "" : "s"}</span>
                      </div>
                      {groupImages.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-center text-xs text-gray-400">No images</div>
                      ) : (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {groupImages.map(img => <img key={img.id} src={img.url_thumb ?? img.url} alt="" className="h-16 w-16 flex-shrink-0 rounded-lg border border-gray-200 object-cover sm:h-20 sm:w-20" />)}
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Sizes</h3>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {group.rows.map(row => (
                          <div key={row.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900">{row.value3}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${row.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>{row.status}</span>
                            </div>
                            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                              <div><p className="text-gray-400">Stock</p><p className="font-medium text-gray-700">{row.stock}</p></div>
                              <div><p className="text-gray-400">VND</p><p className="font-medium text-gray-700">{Number(row.priceVND).toLocaleString()}</p></div>
                              <div><p className="text-gray-400">USD</p><p className="font-medium text-gray-700">${Number(row.priceUSD).toFixed(2)}</p></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>

          {!showNewGroup ? (
            <button onClick={() => setShowNewGroup(true)} className="mt-6 mb-12 w-full rounded-xl border border-dashed border-gray-300 px-5 py-4 text-sm font-medium text-gray-600 transition hover:border-gray-400 hover:bg-gray-50 hover:text-gray-900">+ New Group</button>
          ) : (
            <section className="mt-6 mb-12 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">New Group</h2>
                <button onClick={() => { setShowNewGroup(false); setNewGroup(emptyNewGroup); setNewSizes([emptySize()]); setNewGroupImages([]) }} className="text-sm text-gray-500 hover:text-gray-800">Cancel</button>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div><label className={labelClass}>Color <span className="font-normal text-gray-400">(optional)</span></label>
                  <input className={inputClass} placeholder="leave blank if not divide variant by color" value={newGroup.value1} onChange={e => setNewGroup({ ...newGroup, value1: e.target.value })} /></div>
                <div><label className={labelClass}>Material <span className="font-normal text-gray-400">(optional)</span></label>
                  <input className={inputClass} placeholder="leave blank if not divide variant by material" value={newGroup.value2} onChange={e => setNewGroup({ ...newGroup, variant2: e.target.value ? "Material" : "", value2: e.target.value })} /></div>
              </div>

              <div className="mb-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Images</h3>
                  <label className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50">
                    + Add images
                    <input type="file" accept="image/*" multiple onChange={handleNewGroupFileSelect} className="hidden" />
                  </label>
                </div>
                {newGroupImages.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-400">
                    No images yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {newGroupImages.map(img => (
                      <div key={img.tempId} className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                        <img src={img.previewUrl} alt="" className="h-full w-full object-cover" />
                        <button
                          onClick={() => removeNewGroupImage(img.tempId)}
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white transition sm:opacity-0 sm:group-hover:opacity-100"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Sizes</h3>
                <button type="button" onClick={addNewSize} className="text-xs font-medium text-blue-600 hover:text-blue-800">+ Add size</button>
              </div>

              <div className="space-y-3">
                {newSizes.map((size, index) => (
                  <div key={index} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">Size {index + 1}</span>
                      {newSizes.length > 1 && <button type="button" onClick={() => removeNewSize(index)} className="text-xs text-red-500 hover:text-red-700">Remove</button>}
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <div><label className={labelClass}>Size</label><input className={inputClass} placeholder="S" value={size.value3} onChange={e => updateNewSize(index, { value3: e.target.value })} /></div>
                      <div><label className={labelClass}>Stock</label><input type="number" className={inputClass} value={size.stock} onFocus={e => e.currentTarget.select()} onChange={e => updateNewSize(index, { stock: Number(e.target.value) })} /></div>
                      <div><label className={labelClass}>Price VND</label><input type="number" className={inputClass} value={size.priceVND} onFocus={e => e.currentTarget.select()} onChange={e => updateNewSize(index, { priceVND: Number(e.target.value) })} /></div>
                      <div><label className={labelClass}>Price USD</label><input type="number" className={inputClass} value={size.priceUSD} onFocus={e => e.currentTarget.select()} onChange={e => updateNewSize(index, { priceUSD: Number(e.target.value) })} /></div>
                      <div><label className={labelClass}>Status</label>
                        <select className={selectClass + " w-full"} value={size.status} onChange={e => updateNewSize(index, { status: e.target.value })}><option>Active</option><option>Draft</option></select></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={createGroup}
                  disabled={creatingGroup || processing}
                  className="w-full rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50 sm:w-auto"
                >
                  {processing
                    ? `Processing ${processProgress.done}/${processProgress.total}…`
                    : creatingGroup
                      ? "Creating…"
                      : "Create group"}
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {editingGroup && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="relative flex max-h-[95vh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-4xl sm:rounded-2xl">
            <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Edit variant</h2>
                <p className="mt-0.5 text-xs text-gray-400">{editingGroup.value1}{editingGroup.value2 && <> / {editingGroup.value2}</>}</p>
              </div>
              <button onClick={closeEditModal} aria-label="Close" className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-2xl leading-none text-gray-400 transition hover:bg-gray-100 hover:text-gray-700">×</button>
            </div>

            <div className="overflow-y-auto px-4 py-5 sm:px-6">
              {/* Variant name — its own action, separate from Save below */}
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Variant</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div><label className={labelClass}>Color</label><input className={inputClass} value={renameValue1} onChange={e => setRenameValue1(e.target.value)} placeholder="leave blank if not to divide by color" /></div>
                  <div><label className={labelClass}>Material</label><input className={inputClass} value={renameValue2} onChange={e => setRenameValue2(e.target.value)} placeholder="leave blank if not to divide by material" /></div>
                </div>
                {renameChanged && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2">
                    <span className="text-xs text-amber-700">Name changed — this is a separate action from Save below.</span>
                    <button onClick={renameGroup} disabled={renaming || syncing} className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-gray-800 disabled:opacity-50">{renaming ? "Renaming…" : "Rename group"}</button>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Images</h3>
                  <label className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50">
                    + Add images
                    <input type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
                  </label>
                </div>
                {staged.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-400">No images yet.</div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {staged.map((img, index) => (
                      <div key={img.kind === "existing" ? img.id : img.tempId} draggable onDragStart={() => setDraggedIndex(index)} onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(index)} className="group relative aspect-square cursor-grab overflow-hidden rounded-lg border border-gray-200 bg-gray-100 active:cursor-grabbing">
                        <img src={img.kind === "existing" ? img.url : img.previewUrl} alt="" className={`h-full w-full object-cover ${img.kind === "new" ? "opacity-70" : ""}`} />
                        {img.kind === "new" && <span className="absolute bottom-1 left-1 rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-semibold text-white">NEW</span>}
                        <button onClick={() => handleRemoveImage(index)} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white transition sm:opacity-0 sm:group-hover:opacity-100">×</button>
                      </div>
                    ))}
                  </div>
                )}
                {dirty && <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2"><span className="text-xs text-amber-700">Unsaved changes</span></div>}
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Sizes</h3>
                  <button onClick={addSizeToEditingGroup} className="text-xs font-medium text-blue-600 hover:text-blue-800">+ Add size</button>
                </div>
                <div className="space-y-3">
                  {editingRows.map((row, index) => (
                    <div key={row.id ?? `new-${index}`} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">{row.id ? `Size ${index + 1}` : "New size"}</span>
                        <button onClick={() => deleteEditingSize(row, index)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div><label className={labelClass}>{row.variant3}</label><input className={inputClass} value={row.value3} onChange={e => updateEditingRow(index, { value3: e.target.value })} /></div>
                        <div><label className={labelClass}>Stock</label><input type="number" className={inputClass} value={row.stock} onFocus={e => e.currentTarget.select()} onChange={e => updateEditingRow(index, { stock: Number(e.target.value) })} /></div>
                        <div><label className={labelClass}>Price VND</label><input type="number" className={inputClass} value={row.priceVND} onFocus={e => e.currentTarget.select()} onChange={e => updateEditingRow(index, { priceVND: Number(e.target.value) })} /></div>
                        <div><label className={labelClass}>Price USD</label><input type="number" className={inputClass} value={row.priceUSD} onFocus={e => e.currentTarget.select()} onChange={e => updateEditingRow(index, { priceUSD: Number(e.target.value) })} /></div>
                      </div>
                      <div className="mt-3 w-full sm:w-48">
                        <label className={labelClass}>Status</label>
                        <select className={selectClass + " w-full"} value={row.status} onChange={e => updateEditingRow(index, { status: e.target.value })}><option>Active</option><option>Draft</option></select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative flex items-center justify-center border-t border-gray-200 bg-gray-50 px-4 py-4 sm:px-6">
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={saveAllChanges}
                  disabled={!dirty || syncing || processing || renaming}
                  className="rounded-lg bg-gray-900 px-6 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {processing
                    ? `Processing ${processProgress.done}/${processProgress.total}…`
                    : syncing
                      ? "Saving…"
                      : "Save Changes"}
                </button>

                <button
                  onClick={() => deleteGroup(editingGroup)}
                  disabled={syncing || processing || renaming}
                  className="text-sm text-red-500 underline underline-offset-2 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Delete entire group
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}