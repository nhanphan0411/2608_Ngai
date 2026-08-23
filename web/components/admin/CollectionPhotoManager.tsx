"use client";

import { useEffect, useState } from "react";
import { processImage } from "@/lib/imageProcessing";
import CollectionGallery from "@/components/CollectionGallery";
import type { CollectionLayoutStyle } from "@/types/db";

type StagedPhoto =
  | { kind: "existing"; id: number; url: string }
  | { kind: "new"; tempId: string; file: File; previewUrl: string };

export default function CollectionPhotoManager({
  collectionId,
  collectionSlug,
  layoutStyle,
  onLayoutStyleChange,
}: {
  collectionId: number;
  collectionSlug: string;
  layoutStyle: CollectionLayoutStyle;
  onLayoutStyleChange: (style: CollectionLayoutStyle) => void;
}) {
  const [staged, setStaged] = useState<StagedPhoto[]>([]);
  const [originalIds, setOriginalIds] = useState<number[]>([]);
  const [dirty, setDirty] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shuffleKey, setShuffleKey] = useState(0);

  useEffect(() => {
    setStaged([]);
    setOriginalIds([]);
    setDirty(false);

    if (!collectionId) return;

    fetch(`/api/admin/collections/photos?collection_id=${collectionId}`)
      .then((res) => res.json())
      .then((data) => {
        const photos = data as any[];

        setStaged(
          photos.map((p) => ({
            kind: "existing" as const,
            id: p.id,
            url: p.url_mid || p.url_large || p.url_thumb,
          }))
        );

        setOriginalIds(photos.map((p) => p.id));
      });
  }, [collectionId]);

  function addFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;

    const newItems: StagedPhoto[] = list.map((file) => ({
      kind: "new",
      tempId: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setStaged((prev) => [...prev, ...newItems]);
    setDirty(true);
    setError(null);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = "";
  }

  function handleDropzoneDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  function handleRemove(index: number) {
    setStaged((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  }

  function handleCellDrop(targetIndex: number) {
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

  const previewPhotos = staged.map((s) => ({
    id: s.kind === "existing" ? s.id : s.tempId,
    url: s.kind === "existing" ? s.url : s.previewUrl,
  }));

  async function handleSave() {
    setSyncing(true);
    setError(null);

    try {
      const stagedExistingIds = staged
        .filter((s): s is Extract<StagedPhoto, { kind: "existing" }> => s.kind === "existing")
        .map((s) => s.id);

      const deleteIds = originalIds.filter((id) => !stagedExistingIds.includes(id));

      const newItems = staged.filter(
        (s): s is Extract<StagedPhoto, { kind: "new" }> => s.kind === "new"
      );

      const order = staged.map((s) =>
        s.kind === "existing"
          ? { type: "existing", id: s.id }
          : { type: "new", fileIndex: newItems.findIndex((f) => f.tempId === s.tempId) }
      );

      const formData = new FormData();
      formData.append("collection_id", String(collectionId));
      formData.append("collection_slug", collectionSlug);
      formData.append("deleteIds", JSON.stringify(deleteIds));
      formData.append("order", JSON.stringify(order));

      for (let i = 0; i < newItems.length; i++) {
        const processed = await processImage(newItems[i].file);
        formData.append(`new_thumb_${i}`, processed.thumb, `thumb-${i}.webp`);
        formData.append(`new_mid_${i}`, processed.mid, `mid-${i}.webp`);
        formData.append(`new_large_${i}`, processed.large, `large-${i}.webp`);
      }

      const res = await fetch("/api/admin/collections/photos/sync", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Photo sync failed");

      const data = (await res.json()) as { photos: any[]; failures?: string[] };

      setStaged(
        data.photos.map((p) => ({
          kind: "existing" as const,
          id: p.id,
          url: p.url_mid || p.url_large || p.url_thumb,
        }))
      );
      setOriginalIds(data.photos.map((p) => p.id));
      setDirty(false);

      if (data.failures?.length) setError(data.failures.join(" "));
    } catch (err) {
      console.error(err);
      setError("Something went wrong saving these photos. Please try again.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="w-full">
      {/* ================= CONTROLS ================= */}

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
              Editorial Photos
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Shown at the top of this collection&apos;s page, above the products.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-1 text-sm">
            <button
              type="button"
              onClick={() => onLayoutStyleChange("grid")}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                layoutStyle === "grid"
                  ? "bg-black text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => onLayoutStyleChange("random")}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                layoutStyle === "random"
                  ? "bg-black text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Random
            </button>
          </div>
        </div>

        {/* Bulk upload dropzone */}
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDropzoneDrop}
          className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-8 text-center text-sm transition ${
            dragOver
              ? "border-black bg-gray-50 text-gray-900"
              : "border-gray-300 text-gray-500 hover:border-gray-400 hover:bg-gray-50"
          }`}
        >
          <span className="font-medium">Drop photos here, or click to browse</span>
          <span className="text-xs text-gray-400">JPG, PNG, WEBP, or GIF · multiple files at once</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
        )}

        {/* Staged cells — drag to reorder. In Grid mode these ARE the real
            grid cells (4 cols desktop / 3 mobile), so dragging a photo
            into a cell is literally choosing its position on the page. */}
        {staged.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-xs font-medium text-gray-500">
              {layoutStyle === "grid"
                ? "Drag to reorder — position here is the position on the page."
                : "Drag to reorder — sets load priority. Exact position re-randomizes for every visitor."}
            </p>

            <div
              className={
                layoutStyle === "grid"
                  ? "grid grid-cols-3 gap-1 sm:grid-cols-4"
                  : "flex flex-wrap gap-2"
              }
            >
              {staged.map((s, index) => {
                const url = s.kind === "existing" ? s.url : s.previewUrl;

                return (
                  <div
                    key={s.kind === "existing" ? `e-${s.id}` : `n-${s.tempId}`}
                    draggable
                    onDragStart={() => setDraggedIndex(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleCellDrop(index)}
                    className={`group relative cursor-grab overflow-hidden border border-gray-200 bg-gray-50 active:cursor-grabbing ${
                      layoutStyle === "grid" ? "aspect-[3/4]" : "h-24 w-24"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />

                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition group-hover:opacity-100"
                      aria-label="Remove photo"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            disabled={!dirty || syncing}
            onClick={handleSave}
            className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {syncing ? "Saving…" : "Save Photos"}
          </button>
        </div>
      </div>

      {/* ================= LIVE PREVIEW ================= */}
      {/* Deliberately full-width (not boxed like the form above) so the
          owner sees exactly how this will render on the real page. */}

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Live Preview</h3>

          {layoutStyle === "random" && (
            <button
              type="button"
              onClick={() => setShuffleKey((k) => k + 1)}
              className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
            >
              Shuffle preview
            </button>
          )}
        </div>

        {previewPhotos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">
            Upload photos above to see a preview of the collection page.
          </div>
        ) : (
          <div className="border border-gray-200 bg-white p-3">
            <CollectionGallery
              photos={previewPhotos}
              layoutStyle={layoutStyle}
              reshuffleKey={shuffleKey}
            />
          </div>
        )}
      </div>
    </div>
  );
}