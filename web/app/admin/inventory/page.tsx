"use client";

import { useEffect, useMemo, useState } from "react";
import { processImage } from "@/lib/imageProcessing";

type StagedImage =
  | { kind: "existing"; id: number; url: string }
  | {
    kind: "new";
    tempId: string;
    file: File;
    previewUrl: string;
  };

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

type NewSize = {
  value3: string;
  stock: number;
  priceVND: number;
  priceUSD: number;
  status: string;
};

const DEFAULT_VALUE1 = "original";

function groupKey(value1: string, value2: string) {
  return `${value1}||${value2}`;
}

export default function InventoryPage() {
  // ============================================================
  // PICKERS
  // ============================================================

  const [collections, setCollections] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [collectionSlug, setCollectionSlug] = useState("");
  const [productSlug, setProductSlug] = useState("");

  // ============================================================
  // DATA
  // ============================================================

  const [variants, setVariants] = useState<any[]>([]);
  const [allImages, setAllImages] = useState<any[]>([]);

  // ============================================================
  // EDIT GROUP MODAL
  // ============================================================

  const [editingGroupKey, setEditingGroupKey] = useState<
    string | null
  >(null);

  // ============================================================
  // NEW GROUP
  // ============================================================

  const emptyNewGroup = {
    variant1: "Color",
    value1: "",
    variant2: "",
    value2: "",
    variant3: "Size",
    status: "Active",
  };

  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroup, setNewGroup] = useState(emptyNewGroup);

  const [newSizes, setNewSizes] = useState<NewSize[]>([
    {
      value3: "",
      stock: 0,
      priceVND: 0,
      priceUSD: 0,
      status: "Active",
    },
  ]);

  // ============================================================
  // IMAGE EDITOR
  // ============================================================

  const [staged, setStaged] = useState<StagedImage[]>([]);
  const [originalIds, setOriginalIds] = useState<number[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState({
    done: 0,
    total: 0,
  });
  const [draggedIndex, setDraggedIndex] = useState<number | null>(
    null
  );

  // ============================================================
  // GROUP RENAME
  // ============================================================

  const [renaming, setRenaming] = useState(false);
  const [renameValue1, setRenameValue1] = useState("");
  const [renameValue2, setRenameValue2] = useState("");

  // ============================================================
  // GROUP DELETE
  // ============================================================

  const [deletingGroupKey, setDeletingGroupKey] = useState<
    string | null
  >(null);

  // ============================================================
  // SIZE EDITING
  // ============================================================

  const [editingRows, setEditingRows] = useState<SizeRow[]>([]);
  const [deletedRowIds, setDeletedRowIds] = useState<number[]>([]);

  // ============================================================
  // SHARED PICKERS
  // ============================================================

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

    setNewSizes([
      {
        value3: "",
        stock: 0,
        priceVND: 0,
        priceUSD: 0,
        status: "Active",
      },
    ]);

    closeEditModal();
  }

  // ============================================================
  // DATA LOADING
  // ============================================================

  async function loadVariants() {
    const res = await fetch(
      `/api/admin/inventory?product=${productSlug}`
    );

    setVariants((await res.json()) as any[]);
  }

  async function loadAllImages() {
    const res = await fetch(
      `/api/admin/images?product_slug=${productSlug}`
    );

    setAllImages((await res.json()) as any[]);
  }

  // ============================================================
  // GROUPING
  // ============================================================

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
      (img) =>
        img.value1 === group.value1 &&
        (img.value2 ?? "") === group.value2
    );
  }

  // ============================================================
  // EDIT MODAL
  // ============================================================

  function openEditModal(group: Group) {
    setEditingGroupKey(group.key);

    setEditingRows(
      group.rows.map((row) => ({
        ...row,
      }))
    );

    setDeletedRowIds([]);

    setRenameValue1(group.value1);
    setRenameValue2(group.value2);

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

  function closeEditModal() {
    setEditingGroupKey(null);
    setEditingRows([]);
    setDeletedRowIds([]);
    setStaged([]);
    setOriginalIds([]);
    setDirty(false);
    setRenaming(false);
    setSyncing(false);
    setProcessing(false);
  }

  const editingGroup = groups.find(
    (group) => group.key === editingGroupKey
  );

  // ============================================================
  // IMAGE EDITING
  // ============================================================

  function handleFileSelect(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = e.target.files;

    if (!files || files.length === 0) return;

    const newItems: StagedImage[] = Array.from(files).map(
      (file) => ({
        kind: "new",
        tempId: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      })
    );

    setStaged((prev) => [...prev, ...newItems]);
    setDirty(true);

    e.target.value = "";
  }

  function handleRemoveImage(index: number) {
    setStaged((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  }

  function handleDrop(targetIndex: number) {
    if (
      draggedIndex === null ||
      draggedIndex === targetIndex
    ) {
      return;
    }

    setStaged((prev) => {
      const reordered = [...prev];

      const [moved] = reordered.splice(draggedIndex, 1);

      reordered.splice(targetIndex, 0, moved);

      return reordered;
    });

    setDirty(true);
    setDraggedIndex(null);
  }

  // ============================================================
  // SAVE IMAGES
  // ============================================================

  async function syncImages(group: Group) {
    const stagedExistingIds = staged
      .filter(
        (
          s
        ): s is Extract<
          StagedImage,
          { kind: "existing" }
        > => s.kind === "existing"
      )
      .map((s) => s.id);

    const deleteIds = originalIds.filter(
      (id) => !stagedExistingIds.includes(id)
    );

    const newFiles = staged.filter(
      (
        s
      ): s is Extract<
        StagedImage,
        { kind: "new" }
      > => s.kind === "new"
    );

    const order = staged.map((s) =>
      s.kind === "existing"
        ? {
          type: "existing",
          id: s.id,
        }
        : {
          type: "new",
          fileIndex: newFiles.findIndex(
            (f) => f.tempId === s.tempId
          ),
        }
    );

    const formData = new FormData();

    formData.append("product_slug", productSlug);
    formData.append("value1", group.value1);

    if (group.value2) {
      formData.append("value2", group.value2);
    }

    formData.append(
      "deleteIds",
      JSON.stringify(deleteIds)
    );

    formData.append(
      "order",
      JSON.stringify(order)
    );

    if (newFiles.length > 0) {
      setProcessing(true);

      setProcessProgress({
        done: 0,
        total: newFiles.length,
      });

      for (let i = 0; i < newFiles.length; i++) {
        const { thumb, mid, large } =
          await processImage(newFiles[i].file);

        formData.append(
          `new_thumb_${i}`,
          thumb,
          `thumb-${i}.webp`
        );

        formData.append(
          `new_mid_${i}`,
          mid,
          `mid-${i}.webp`
        );

        formData.append(
          `new_large_${i}`,
          large,
          `large-${i}.webp`
        );

        setProcessProgress({
          done: i + 1,
          total: newFiles.length,
        });
      }

      setProcessing(false);
    }

    const res = await fetch(
      "/api/admin/images/sync",
      {
        method: "POST",
        body: formData,
      }
    );

    const data = (await res.json()) as {
      images?: any[];
      failures?: string[];
      error?: string;
    };

    if (!res.ok) {
      throw new Error(
        data.error || "Image sync failed"
      );
    }

    if (data.failures?.length) {
      throw new Error(
        `Some image changes couldn't be completed:\n${data.failures.join(
          "\n"
        )}`
      );
    }
  }

  // ============================================================
  // SAVE ALL
  // ============================================================

  async function saveAllChanges() {
    if (!editingGroup) return;

    if (processing || syncing || renaming) return;

    // Validate all remaining sizes first.
    const invalidRow = editingRows.find(
      (row) => !row.value3.trim()
    );

    if (invalidRow) {
      alert("Please enter a size for every size row.");
      return;
    }

    setSyncing(true);

    const oldGroup = editingGroup;

    const newValue1 =
      renameValue1.trim() || DEFAULT_VALUE1;

    const newValue2 = renameValue2.trim();

    const renameChanged =
      newValue1 !== oldGroup.value1 ||
      newValue2 !== oldGroup.value2;

    try {
      // --------------------------------------------------------
      // 1. SAVE IMAGES FIRST
      // --------------------------------------------------------
      //
      // Images still belong to the OLD group at this point.
      // So sync them before repointing the group name.
      //

      const stagedExistingIds = staged
        .filter(
          (
            s
          ): s is Extract<
            StagedImage,
            { kind: "existing" }
          > => s.kind === "existing"
        )
        .map((s) => s.id);

      const newFiles = staged.filter(
        (
          s
        ): s is Extract<
          StagedImage,
          { kind: "new" }
        > => s.kind === "new"
      );

      const deleteIds = originalIds.filter(
        (id) => !stagedExistingIds.includes(id)
      );

      const order = staged.map((s) =>
        s.kind === "existing"
          ? {
            type: "existing",
            id: s.id,
          }
          : {
            type: "new",
            fileIndex: newFiles.findIndex(
              (f) => f.tempId === s.tempId
            ),
          }
      );

      const formData = new FormData();

      formData.append(
        "product_slug",
        productSlug
      );

      formData.append(
        "value1",
        oldGroup.value1
      );

      if (oldGroup.value2) {
        formData.append(
          "value2",
          oldGroup.value2
        );
      }

      formData.append(
        "deleteIds",
        JSON.stringify(deleteIds)
      );

      formData.append(
        "order",
        JSON.stringify(order)
      );

      if (newFiles.length > 0) {
        setProcessing(true);

        setProcessProgress({
          done: 0,
          total: newFiles.length,
        });

        for (
          let i = 0;
          i < newFiles.length;
          i++
        ) {
          const {
            thumb,
            mid,
            large,
          } = await processImage(
            newFiles[i].file
          );

          formData.append(
            `new_thumb_${i}`,
            thumb,
            `thumb-${i}.webp`
          );

          formData.append(
            `new_mid_${i}`,
            mid,
            `mid-${i}.webp`
          );

          formData.append(
            `new_large_${i}`,
            large,
            `large-${i}.webp`
          );

          setProcessProgress({
            done: i + 1,
            total: newFiles.length,
          });
        }

        setProcessing(false);
      }

      const imageRes = await fetch(
        "/api/admin/images/sync",
        {
          method: "POST",
          body: formData,
        }
      );

      const imageData =
        (await imageRes.json()) as {
          images?: any[];
          failures?: string[];
          error?: string;
        };

      if (!imageRes.ok) {
        throw new Error(
          imageData.error ||
          "Image sync failed."
        );
      }

      if (
        imageData.failures?.length
      ) {
        throw new Error(
          `Some image changes couldn't be completed:\n${imageData.failures.join(
            "\n"
          )}`
        );
      }

      // --------------------------------------------------------
      // 2. DELETE SIZE ROWS
      // --------------------------------------------------------

      for (const id of deletedRowIds) {
        const res = await fetch(
          "/api/admin/inventory",
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              id,
            }),
          }
        );

        if (!res.ok) {
          throw new Error(
            "Failed to delete a size."
          );
        }
      }

      // --------------------------------------------------------
      // 3. SAVE / UPDATE ALL SIZE ROWS
      // --------------------------------------------------------

      for (const row of editingRows) {
        const res = await fetch(
          "/api/admin/inventory",
          {
            method: row.id
              ? "PUT"
              : "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              id: row.id,
              collection_slug:
                collectionSlug,
              product_slug:
                productSlug,
              variant1:
                oldGroup.variant1 ||
                "Color",
              value1:
                renameChanged
                  ? newValue1
                  : oldGroup.value1,
              variant2:
                oldGroup.variant2,
              value2:
                renameChanged
                  ? newValue2
                  : oldGroup.value2,
              variant3:
                row.variant3 ||
                "Size",
              value3:
                row.value3,
              stock:
                row.stock,
              priceVND:
                row.priceVND,
              priceUSD:
                row.priceUSD,
              status:
                row.status,
            }),
          }
        );

        if (!res.ok) {
          throw new Error(
            `Failed to save size "${row.value3}".`
          );
        }
      }

      // --------------------------------------------------------
      // 4. REPOINT IMAGES IF GROUP NAME CHANGED
      // --------------------------------------------------------

      if (renameChanged) {
        const repointRes =
          await fetch(
            "/api/admin/images/repoint",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                product_slug:
                  productSlug,
                old_value1:
                  oldGroup.value1,
                old_value2:
                  oldGroup.value2 ||
                  null,
                new_value1:
                  newValue1,
                new_value2:
                  newValue2 ||
                  null,
              }),
            }
          );

        if (!repointRes.ok) {
          throw new Error(
            "Sizes were saved, but images could not be moved to the new group name."
          );
        }
      }

      // --------------------------------------------------------
      // 5. REFRESH EVERYTHING
      // --------------------------------------------------------

      await loadVariants();
      await loadAllImages();

      // Update the currently opened modal to the new state.
      const refreshedRes = await fetch(
        `/api/admin/inventory?product=${productSlug}`
      );

      const refreshedVariants =
        (await refreshedRes.json()) as any[];

      const refreshedGroupRows =
        refreshedVariants.filter(
          (v) =>
            v.value1 ===
            newValue1 &&
            (v.value2 ?? "") ===
            newValue2
        );

      setEditingRows(
        refreshedGroupRows.map(
          (v) => ({
            id: v.id,
            variant3:
              v.variant3 ??
              "Size",
            value3:
              v.value3 ?? "",
            stock:
              v.stock ?? 0,
            priceVND:
              v.priceVND ?? 0,
            priceUSD:
              v.priceUSD ?? 0,
            status:
              v.status ??
              "Active",
          })
        )
      );

      const refreshedImages =
        await fetch(
          `/api/admin/images?product_slug=${productSlug}`
        );

      const refreshedImageData =
        (await refreshedImages.json()) as any[];

      const newGroupImages =
        refreshedImageData.filter(
          (img) =>
            img.value1 ===
            newValue1 &&
            (img.value2 ?? "") ===
            newValue2
        );

      setStaged(
        newGroupImages.map(
          (img) => ({
            kind: "existing" as const,
            id: img.id,
            url:
              img.url_thumb ??
              img.url,
          })
        )
      );

      setOriginalIds(
        newGroupImages.map(
          (img) => img.id
        )
      );

      setEditingGroupKey(
        groupKey(
          newValue1,
          newValue2
        )
      );

      setRenameValue1(newValue1);
      setRenameValue2(newValue2);

      setDeletedRowIds([]);
      setDirty(false);

      alert("All changes saved.");
    } catch (err: any) {
      alert(
        err.message ||
        "Failed to save changes."
      );

      await loadVariants();
      await loadAllImages();
    } finally {
      setProcessing(false);
      setSyncing(false);
      setRenaming(false);
    }
  }

  // ============================================================
  // DELETE GROUP
  // ============================================================

  async function deleteGroup(group: Group) {
    const label = `${group.value1}${group.value2
        ? " / " + group.value2
        : ""
      }`;

    if (
      !confirm(
        `Delete "${label}"?\n\n` +
        `This removes every size in this group and its shared images.\n\n` +
        `This cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingGroupKey(group.key);

    try {
      for (const row of group.rows) {
        if (!row.id) continue;

        const res = await fetch(
          "/api/admin/inventory",
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              id: row.id,
            }),
          }
        );

        if (!res.ok) {
          throw new Error(
            `Failed to delete size "${row.value3}".`
          );
        }
      }

      if (
        editingGroupKey === group.key
      ) {
        closeEditModal();
      }

      await loadVariants();
      await loadAllImages();
    } catch (err: any) {
      alert(
        err.message ||
        "Delete failed."
      );

      await loadVariants();
      await loadAllImages();
    } finally {
      setDeletingGroupKey(null);
    }
  }

  // ============================================================
  // SIZE EDITING
  // ============================================================

  function updateEditingRow(
    index: number,
    patch: Partial<SizeRow>
  ) {
    setEditingRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
            ...row,
            ...patch,
          }
          : row
      )
    );

    setDirty(true);
  }

  function addSizeToEditingGroup() {
    setEditingRows((prev) => [
      ...prev,
      {
        id: undefined,
        variant3:
          editingGroup?.rows[0]
            ?.variant3 ||
          "Size",
        value3: "",
        stock: 0,
        priceVND: 0,
        priceUSD: 0,
        status: "Active",
      },
    ]);

    setDirty(true);
  }

  function deleteEditingSize(
    row: SizeRow,
    index: number
  ) {
    if (row.id) {
      setDeletedRowIds((prev) =>
        prev.includes(row.id!)
          ? prev
          : [...prev, row.id!]
      );
    }

    setEditingRows((prev) =>
      prev.filter(
        (_, i) => i !== index
      )
    );

    setDirty(true);
  }

  // ============================================================
  // NEW GROUP
  // ============================================================

  function addNewSize() {
    setNewSizes((prev) => [
      ...prev,
      {
        value3: "",
        stock: 0,
        priceVND: 0,
        priceUSD: 0,
        status: "Active",
      },
    ]);
  }

  function updateNewSize(
    index: number,
    patch: Partial<NewSize>
  ) {
    setNewSizes((prev) =>
      prev.map((size, i) =>
        i === index
          ? {
            ...size,
            ...patch,
          }
          : size
      )
    );
  }

  function removeNewSize(index: number) {
    setNewSizes((prev) =>
      prev.length === 1
        ? prev
        : prev.filter(
          (_, i) => i !== index
        )
    );
  }

  async function createGroup() {
    const value1 =
      newGroup.value1.trim() ||
      DEFAULT_VALUE1;

    const validSizes =
      newSizes.filter(
        (size) =>
          size.value3.trim()
      );

    if (validSizes.length === 0) {
      alert(
        "Please add at least one size."
      );
      return;
    }

    try {
      for (const size of validSizes) {
        const res = await fetch(
          "/api/admin/inventory",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              collection_slug:
                collectionSlug,
              product_slug:
                productSlug,
              variant1:
                newGroup.variant1 ||
                "Color",
              value1,
              variant2:
                newGroup.variant2 ||
                null,
              value2:
                newGroup.variant2
                  ? newGroup.value2
                  : null,
              variant3:
                newGroup.variant3 ||
                "Size",
              value3:
                size.value3,
              stock:
                size.stock,
              priceVND:
                size.priceVND,
              priceUSD:
                size.priceUSD,
              status:
                size.status,
            }),
          }
        );

        if (!res.ok) {
          throw new Error(
            `Failed to create size "${size.value3}".`
          );
        }
      }

      setNewGroup(
        emptyNewGroup
      );

      setNewSizes([
        {
          value3: "",
          stock: 0,
          priceVND: 0,
          priceUSD: 0,
          status: "Active",
        },
      ]);

      setShowNewGroup(false);

      await loadVariants();
    } catch (err: any) {
      alert(
        err.message ||
        "Failed to create group."
      );
    }
  }

  // ============================================================
  // STYLES
  // ============================================================

  const selectClass =
    "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400";

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  const labelClass =
    "block text-xs font-medium text-gray-500 mb-1";

  const selectedProductName =
    products.find(
      (p) =>
        p.product_slug ===
        productSlug
    )?.product_name;

  const selectedCollectionName =
    collections.find(
      (c) =>
        c.collection_slug ===
        collectionSlug
    )?.collection_name;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">
        Inventory
      </h1>

      {/* ======================================================
          PICKER
      ====================================================== */}

      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex w-full flex-col sm:w-auto">
          <label className={labelClass}>
            Collection
          </label>

          <select
            className={selectClass}
            value={collectionSlug}
            onChange={(e) =>
              setCollectionSlug(
                e.target.value
              )
            }
          >
            <option value="">
              Select collection
            </option>

            {collections.map(
              (c: any) => (
                <option
                  key={
                    c.collection_slug
                  }
                  value={
                    c.collection_slug
                  }
                >
                  {c.collection_name}
                </option>
              )
            )}
          </select>
        </div>

        <div className="flex w-full flex-col sm:w-auto">
          <label className={labelClass}>
            Product
          </label>

          <select
            className={selectClass}
            value={productSlug}
            onChange={(e) =>
              setProductSlug(
                e.target.value
              )
            }
            disabled={!collectionSlug}
          >
            <option value="">
              Select product
            </option>

            {products.map(
              (p: any) => (
                <option
                  key={
                    p.product_slug
                  }
                  value={
                    p.product_slug
                  }
                >
                  {p.product_name}
                </option>
              )
            )}
          </select>
        </div>

        {productSlug && (
          <div className="w-full text-xs text-gray-400 sm:ml-auto sm:w-auto sm:text-sm">
            {selectedCollectionName}

            <span className="mx-1 text-gray-300">
              /
            </span>

            <span className="font-medium text-gray-700">
              {selectedProductName}
            </span>
          </div>
        )}
      </div>

      {/* ======================================================
          EMPTY STATE
      ====================================================== */}

      {!productSlug && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-500">
          Select a collection and
          product above to manage its
          variants.
        </div>
      )}

      {productSlug && (
        <>
          {/* ==================================================
              GROUP CARDS
          ================================================== */}

          {groups.length === 0 && (
            <div className="mb-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-500">
              No variants yet — create
              your first group below.
            </div>
          )}

          <div className="space-y-5">
            {groups.map((group) => {
              const groupImages =
                imagesForGroup(
                  group
                );

              const isDeleting =
                deletingGroupKey ===
                group.key;

              const totalStock =
                group.rows.reduce(
                  (sum, row) =>
                    sum +
                    Number(
                      row.stock || 0
                    ),
                  0
                );

              return (
                <section
                  key={group.key}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                >
                  {/* GROUP HEADER */}

                  <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-gray-900">
                          {group.value1 ||
                            DEFAULT_VALUE1}

                          {group.value2 && (
                            <>
                              <span className="mx-1 text-gray-300">
                                /
                              </span>

                              {group.value2}
                            </>
                          )}
                        </h2>

                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                          {
                            group.rows
                              .length
                          }{" "}
                          size
                          {group.rows
                            .length ===
                            1
                            ? ""
                            : "s"}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-gray-400">
                        {totalStock}{" "}
                        items in stock
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          openEditModal(
                            group
                          )
                        }
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          deleteGroup(
                            group
                          )
                        }
                        disabled={
                          isDeleting
                        }
                        className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                      >
                        {isDeleting
                          ? "Deleting…"
                          : "Delete"}
                      </button>
                    </div>
                  </div>

                  {/* GROUP CONTENT */}

                  <div className="p-4 sm:p-5">
                    {/* IMAGES */}

                    <div className="mb-5">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Images
                        </h3>

                        <span className="text-xs text-gray-400">
                          {
                            groupImages.length
                          }{" "}
                          image
                          {groupImages.length ===
                            1
                            ? ""
                            : "s"}
                        </span>
                      </div>

                      {groupImages.length ===
                        0 ? (
                        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-center text-xs text-gray-400">
                          No images
                        </div>
                      ) : (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {groupImages.map(
                            (img) => (
                              <img
                                key={
                                  img.id
                                }
                                src={
                                  img.url_thumb ??
                                  img.url
                                }
                                alt=""
                                className="h-16 w-16 flex-shrink-0 rounded-lg border border-gray-200 object-cover sm:h-20 sm:w-20"
                              />
                            )
                          )}
                        </div>
                      )}
                    </div>

                    {/* SIZES */}

                    <div>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Sizes
                      </h3>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {group.rows.map(
                          (row) => (
                            <div
                              key={
                                row.id
                              }
                              className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900">
                                  {
                                    row.value3
                                  }
                                </span>

                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${row.status ===
                                      "Active"
                                      ? "bg-green-100 text-green-700"
                                      : "bg-gray-200 text-gray-500"
                                    }`}
                                >
                                  {
                                    row.status
                                  }
                                </span>
                              </div>

                              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                                <div>
                                  <p className="text-gray-400">
                                    Stock
                                  </p>

                                  <p className="font-medium text-gray-700">
                                    {
                                      row.stock
                                    }
                                  </p>
                                </div>

                                <div>
                                  <p className="text-gray-400">
                                    VND
                                  </p>

                                  <p className="font-medium text-gray-700">
                                    {Number(
                                      row.priceVND
                                    ).toLocaleString()}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-gray-400">
                                    USD
                                  </p>

                                  <p className="font-medium text-gray-700">
                                    $
                                    {Number(
                                      row.priceUSD
                                    ).toFixed(
                                      2
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>

          {/* ==================================================
              NEW GROUP BUTTON
          ================================================== */}

          {!showNewGroup ? (
            <button
              onClick={() =>
                setShowNewGroup(
                  true
                )
              }
              className="mt-6 mb-12 w-full rounded-xl border border-dashed border-gray-300 px-5 py-4 text-sm font-medium text-gray-600 transition hover:border-gray-400 hover:bg-gray-50 hover:text-gray-900"
            >
              + New color/style group
            </button>
          ) : (
            /* ==================================================
               NEW GROUP FORM
            ================================================== */

            <section className="mt-6 mb-12 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  New color/style group
                </h2>

                <button
                  onClick={() => {
                    setShowNewGroup(
                      false
                    );

                    setNewGroup(
                      emptyNewGroup
                    );

                    setNewSizes([
                      {
                        value3: "",
                        stock: 0,
                        priceVND: 0,
                        priceUSD: 0,
                        status:
                          "Active",
                      },
                    ]);
                  }}
                  className="text-sm text-gray-500 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>

              <p className="mb-5 text-xs leading-relaxed text-gray-400">
                Create a color/style group
                and add all of its sizes at
                once.
              </p>

              {/* GROUP INFO */}

              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className={
                      labelClass
                    }
                  >
                    Color
                  </label>

                  <input
                    className={
                      inputClass
                    }
                    placeholder={
                      DEFAULT_VALUE1
                    }
                    value={
                      newGroup.value1
                    }
                    onChange={(e) =>
                      setNewGroup({
                        ...newGroup,
                        value1:
                          e.target
                            .value,
                      })
                    }
                  />
                </div>

                <div>
                  <label
                    className={
                      labelClass
                    }
                  >
                    Material
                    <span className="font-normal text-gray-400">
                      {" "}
                      (optional)
                    </span>
                  </label>

                  <input
                    className={
                      inputClass
                    }
                    placeholder="Silk"
                    value={
                      newGroup.value2
                    }
                    onChange={(e) =>
                      setNewGroup({
                        ...newGroup,
                        variant2:
                          e.target
                            .value
                            ? "Material"
                            : "",
                        value2:
                          e.target
                            .value,
                      })
                    }
                  />
                </div>
              </div>

              {/* SIZES */}

              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  Sizes
                </h3>

                <button
                  type="button"
                  onClick={
                    addNewSize
                  }
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  + Add size
                </button>
              </div>

              <div className="space-y-3">
                {newSizes.map(
                  (size, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">
                          Size{" "}
                          {index + 1}
                        </span>

                        {newSizes.length >
                          1 && (
                            <button
                              type="button"
                              onClick={() =>
                                removeNewSize(
                                  index
                                )
                              }
                              className="text-xs text-red-500 hover:text-red-700"
                            >
                              Remove
                            </button>
                          )}
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <div>
                          <label
                            className={
                              labelClass
                            }
                          >
                            Size
                          </label>

                          <input
                            className={
                              inputClass
                            }
                            placeholder="S"
                            value={
                              size.value3
                            }
                            onChange={(
                              e
                            ) =>
                              updateNewSize(
                                index,
                                {
                                  value3:
                                    e
                                      .target
                                      .value,
                                }
                              )
                            }
                          />
                        </div>

                        <div>
                          <label
                            className={
                              labelClass
                            }
                          >
                            Stock
                          </label>

                          <input
                            type="number"
                            className={
                              inputClass
                            }
                            value={
                              size.stock
                            }
                            onFocus={(
                              e
                            ) =>
                              e.currentTarget.select()
                            }
                            onChange={(
                              e
                            ) =>
                              updateNewSize(
                                index,
                                {
                                  stock: Number(
                                    e
                                      .target
                                      .value
                                  ),
                                }
                              )
                            }
                          />
                        </div>

                        <div>
                          <label
                            className={
                              labelClass
                            }
                          >
                            Price VND
                          </label>

                          <input
                            type="number"
                            className={
                              inputClass
                            }
                            value={
                              size.priceVND
                            }
                            onFocus={(
                              e
                            ) =>
                              e.currentTarget.select()
                            }
                            onChange={(
                              e
                            ) =>
                              updateNewSize(
                                index,
                                {
                                  priceVND:
                                    Number(
                                      e
                                        .target
                                        .value
                                    ),
                                }
                              )
                            }
                          />
                        </div>

                        <div>
                          <label
                            className={
                              labelClass
                            }
                          >
                            Price USD
                          </label>

                          <input
                            type="number"
                            className={
                              inputClass
                            }
                            value={
                              size.priceUSD
                            }
                            onFocus={(
                              e
                            ) =>
                              e.currentTarget.select()
                            }
                            onChange={(
                              e
                            ) =>
                              updateNewSize(
                                index,
                                {
                                  priceUSD:
                                    Number(
                                      e
                                        .target
                                        .value
                                    ),
                                }
                              )
                            }
                          />
                        </div>

                        <div>
                          <label
                            className={
                              labelClass
                            }
                          >
                            Status
                          </label>

                          <select
                            className={
                              selectClass +
                              " w-full"
                            }
                            value={
                              size.status
                            }
                            onChange={(
                              e
                            ) =>
                              updateNewSize(
                                index,
                                {
                                  status:
                                    e
                                      .target
                                      .value,
                                }
                              )
                            }
                          >
                            <option>
                              Active
                            </option>

                            <option>
                              Draft
                            </option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* CREATE */}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={
                    createGroup
                  }
                  className="w-full rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-green-700 sm:w-auto"
                >
                  Create group
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {/* ======================================================
          EDIT GROUP MODAL
      ====================================================== */}

      {editingGroup && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="relative flex max-h-[95vh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-4xl sm:rounded-2xl">
            {/* MODAL HEADER */}

            <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Edit variant
                </h2>

                <p className="mt-0.5 text-xs text-gray-400">
                  {editingGroup.value1}

                  {editingGroup.value2 && (
                    <>
                      {" "}
                      /{" "}
                      {
                        editingGroup.value2
                      }
                    </>
                  )}
                </p>
              </div>

              {/* CLOSE X */}

              <button
                onClick={
                  closeEditModal
                }
                aria-label="Close"
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-2xl leading-none text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            {/* MODAL CONTENT */}

            <div className="overflow-y-auto px-4 py-5 sm:px-6">
              {/* GROUP NAME */}

              <div className="mb-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Variant
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>
                      Color
                    </label>

                    <input
                      className={inputClass}
                      value={renameValue1}
                      onChange={(e) => {
                        setRenameValue1(e.target.value);
                        setDirty(true);
                      }}
                      placeholder="Red"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Material
                    </label>

                    <input
                      className={inputClass}
                      value={renameValue2}
                      onChange={(e) => {
                        setRenameValue2(e.target.value);
                        setDirty(true);
                      }}
                      placeholder="Silk"
                    />
                  </div>
                </div>

                {(renameValue1 !==
                  editingGroup.value1 ||
                  renameValue2 !==
                  editingGroup.value2) && (
                    <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2">
                      <span className="text-xs text-amber-700">
                        Variant name changed — click
                        Save below to apply.
                      </span>
                    </div>
                  )}
              </div>

              {/* IMAGES */}

              <div className="mb-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Images
                  </h3>

                  <label className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50">
                    + Add images

                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={
                        handleFileSelect
                      }
                      className="hidden"
                    />
                  </label>
                </div>

                {staged.length ===
                  0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-400">
                    No images yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {staged.map(
                      (
                        img,
                        index
                      ) => (
                        <div
                          key={
                            img.kind ===
                              "existing"
                              ? img.id
                              : img.tempId
                          }
                          draggable
                          onDragStart={() =>
                            setDraggedIndex(
                              index
                            )
                          }
                          onDragOver={(e) =>
                            e.preventDefault()
                          }
                          onDrop={() =>
                            handleDrop(
                              index
                            )
                          }
                          className="group relative aspect-square cursor-grab overflow-hidden rounded-lg border border-gray-200 bg-gray-100 active:cursor-grabbing"
                        >
                          <img
                            src={
                              img.kind ===
                                "existing"
                                ? img.url
                                : img.previewUrl
                            }
                            alt=""
                            className={`h-full w-full object-cover ${img.kind ===
                                "new"
                                ? "opacity-70"
                                : ""
                              }`}
                          />

                          {img.kind ===
                            "new" && (
                              <span className="absolute bottom-1 left-1 rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                                NEW
                              </span>
                            )}

                          <button
                            onClick={() =>
                              handleRemoveImage(
                                index
                              )
                            }
                            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white transition sm:opacity-0 sm:group-hover:opacity-100"
                          >
                            ×
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}

                {dirty && (
                  <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2">
                    <span className="text-xs text-amber-700">
                      Unsaved changes
                    </span>
                  </div>
                )}
              </div>

              {/* SIZES */}

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Sizes
                  </h3>

                  <button
                    onClick={
                      addSizeToEditingGroup
                    }
                    className="text-xs font-medium text-blue-600 hover:text-blue-800"
                  >
                    + Add size
                  </button>
                </div>

                <div className="space-y-3">
                  {editingRows.map(
                    (row, index) => (
                      <div
                        key={
                          row.id ??
                          `new-${index}`
                        }
                        className="rounded-xl border border-gray-200 bg-gray-50 p-3"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500">
                            {row.id
                              ? `Size ${index +
                              1
                              }`
                              : "New size"}
                          </span>

                          <button
                            onClick={() =>
                              deleteEditingSize(
                                row,
                                index
                              )
                            }
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <div>
                            <label
                              className={
                                labelClass
                              }
                            >
                              {
                                row.variant3
                              }
                            </label>

                            <input
                              className={
                                inputClass
                              }
                              value={
                                row.value3
                              }
                              onChange={(
                                e
                              ) =>
                                updateEditingRow(
                                  index,
                                  {
                                    value3:
                                      e
                                        .target
                                        .value,
                                  }
                                )
                              }
                            />
                          </div>

                          <div>
                            <label
                              className={
                                labelClass
                              }
                            >
                              Stock
                            </label>

                            <input
                              type="number"
                              className={
                                inputClass
                              }
                              value={
                                row.stock
                              }
                              onFocus={(
                                e
                              ) =>
                                e.currentTarget.select()
                              }
                              onChange={(
                                e
                              ) =>
                                updateEditingRow(
                                  index,
                                  {
                                    stock: Number(
                                      e
                                        .target
                                        .value
                                    ),
                                  }
                                )
                              }
                            />
                          </div>

                          <div>
                            <label
                              className={
                                labelClass
                              }
                            >
                              Price VND
                            </label>

                            <input
                              type="number"
                              className={
                                inputClass
                              }
                              value={
                                row.priceVND
                              }
                              onFocus={(
                                e
                              ) =>
                                e.currentTarget.select()
                              }
                              onChange={(
                                e
                              ) =>
                                updateEditingRow(
                                  index,
                                  {
                                    priceVND:
                                      Number(
                                        e
                                          .target
                                          .value
                                      ),
                                  }
                                )
                              }
                            />
                          </div>

                          <div>
                            <label
                              className={
                                labelClass
                              }
                            >
                              Price USD
                            </label>

                            <input
                              type="number"
                              className={
                                inputClass
                              }
                              value={
                                row.priceUSD
                              }
                              onFocus={(
                                e
                              ) =>
                                e.currentTarget.select()
                              }
                              onChange={(
                                e
                              ) =>
                                updateEditingRow(
                                  index,
                                  {
                                    priceUSD:
                                      Number(
                                        e
                                          .target
                                          .value
                                      ),
                                  }
                                )
                              }
                            />
                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="w-full sm:w-48">
                            <label
                              className={
                                labelClass
                              }
                            >
                              Status
                            </label>

                            <select
                              className={
                                selectClass +
                                " w-full"
                              }
                              value={
                                row.status
                              }
                              onChange={(
                                e
                              ) =>
                                updateEditingRow(
                                  index,
                                  {
                                    status:
                                      e
                                        .target
                                        .value,
                                  }
                                )
                              }
                            >
                              <option>
                                Active
                              </option>

                              <option>
                                Draft
                              </option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* ==================================================
                MODAL FOOTER
            ================================================== */}

            <div className="relative flex items-center justify-center border-t border-gray-200 bg-gray-50 px-4 py-4 sm:px-6">
              {/* DELETE ENTIRE GROUP + SAVE IN CENTER */}

              <div className="flex items-center gap-2">
                

                <button
                  onClick={
                    saveAllChanges
                  }
                  disabled={
                    !dirty ||
                    syncing ||
                    processing
                  }
                  className="rounded-lg bg-gray-900 px-6 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {processing
                    ? `Processing ${processProgress.done}/${processProgress.total}…`
                    : syncing
                      ? "Saving…"
                      : "Save"}
                </button>
                <button
                  onClick={() =>
                    deleteGroup(
                      editingGroup
                    )
                  }
                  disabled={
                    syncing ||
                    processing
                  }
                  className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
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