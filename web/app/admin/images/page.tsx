"use client";

import { useEffect, useState } from "react";

type StagedImage =
  | { kind: "existing"; id: number; url: string }
  | { kind: "new"; tempId: string; file: File; previewUrl: string };

export default function AdminImagesPage() {
  const [collections, setCollections] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [value1Options, setValue1Options] = useState<any[]>([]);
  const [value2Options, setValue2Options] = useState<any[]>([]);

  const [collectionSlug, setCollectionSlug] = useState("");
  const [productSlug, setProductSlug] = useState("");
  const [value1, setValue1] = useState("");
  const [value2, setValue2] = useState("");

  const [staged, setStaged] = useState<StagedImage[]>([]);
  const [originalIds, setOriginalIds] = useState<number[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/collections")
      .then((res) => res.json())
      .then((data) => setCollections(data as any[]));
  }, []);

  useEffect(() => {
    setProducts([]);
    setProductSlug("");
    setValue1Options([]);
    setValue1("");
    setValue2Options([]);
    setValue2("");
    setStaged([]);
    setOriginalIds([]);
    setDirty(false);

    if (!collectionSlug) return;

    fetch(`/api/admin/products?collection=${collectionSlug}`)
      .then((res) => res.json())
      .then((data) => setProducts(data as any[]));
  }, [collectionSlug]);

  useEffect(() => {
    setValue1Options([]);
    setValue1("");
    setValue2Options([]);
    setValue2("");
    setStaged([]);
    setOriginalIds([]);
    setDirty(false);

    if (!productSlug) return;

    fetch(`/api/admin/value1?product=${productSlug}`)
      .then((res) => res.json())
      .then((data) => setValue1Options(data as any[]));
  }, [productSlug]);

  useEffect(() => {
    setValue2Options([]);
    setValue2("");
    setStaged([]);
    setOriginalIds([]);
    setDirty(false);

    if (!productSlug || !value1) return;

    fetch(`/api/admin/value2?product=${productSlug}&value1=${value1}`)
      .then((res) => res.json())
      .then((data) => setValue2Options(data as any[]));
  }, [productSlug, value1]);

  const needsValue2 = value2Options.length > 0;
  const readyToShowImages = productSlug && value1 && (!needsValue2 || value2);

  useEffect(() => {
    setStaged([]);
    setOriginalIds([]);
    setDirty(false);

    if (!readyToShowImages) return;

    const params = new URLSearchParams({
      product_slug: productSlug,
      value1,
    });

    if (value2) params.set("value2", value2);

    fetch(`/api/admin/images?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        const imgs = data as any[];

        setStaged(
          imgs.map((img) => ({
            kind: "existing" as const,
            id: img.id,
            url: img.url,
          }))
        );

        setOriginalIds(imgs.map((img) => img.id));
      });
  }, [readyToShowImages, productSlug, value1, value2]);

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

  async function handleSync() {
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

    for (const f of newFiles) {
      formData.append("file", f.file);
    }

    const res = await fetch("/api/admin/images/sync", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Image sync failed");
    }

    const images = (await res.json()) as any[];


    setStaged(
      images.map((img) => ({
        kind: "existing",
        id: img.id,
        url: img.url,
      }))
    );

    setOriginalIds(images.map((img) => img.id));

    setDirty(false);
    setSyncing(false);
  }

  return (
    <div style={{ padding: 32, maxWidth: 800, margin: "0 auto" }}>
      <h1>Image Manager</h1>

      <div style={{ display: "flex", gap: 16, marginTop: 24 }}>
        <select
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

        <select
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

        <select
          value={value1}
          onChange={(e) => setValue1(e.target.value)}
          disabled={!productSlug}
        >
          <option value="">Select variant 1</option>

          {value1Options.map((v: any) => (
            <option key={v.value1} value={v.value1}>
              {v.value1}
            </option>
          ))}
        </select>

        {needsValue2 && (
          <select
            value={value2}
            onChange={(e) => setValue2(e.target.value)}
            disabled={!value1}
          >
            <option value="">Select variant 2</option>

            {value2Options.map((v: any) => (
              <option key={v.value2} value={v.value2}>
                {v.value2}
              </option>
            ))}
          </select>
        )}
      </div>

      {readyToShowImages && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
            />

            <button onClick={handleSync} disabled={!dirty || syncing}>
              {syncing ? "Syncing..." : "Sync"}
            </button>

            {dirty && !syncing && (
              <span style={{ color: "orange" }}>Unsaved changes</span>
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              marginTop: 16,
            }}
          >
            {staged.map((img, index) => (
              <div
                key={img.kind === "existing" ? img.id : img.tempId}
                draggable
                onDragStart={() => setDraggedIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(index)}
                style={{ position: "relative", cursor: "grab" }}
              >
                <img
                  src={img.kind === "existing" ? img.url : img.previewUrl}
                  alt=""
                  style={{
                    width: 120,
                    height: 120,
                    objectFit: "cover",
                    opacity: img.kind === "new" ? 0.6 : 1,
                    border:
                      img.kind === "new"
                        ? "2px dashed orange"
                        : "none",
                  }}
                />

                <button
                  onClick={() => handleRemove(index)}
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}