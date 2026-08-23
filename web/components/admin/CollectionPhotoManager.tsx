
"use client";

import { useEffect, useRef, useState } from "react";
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
  const [error, setError] = useState<string | null>(null);
  const [dragOverCanvas, setDragOverCanvas] = useState(false);
  const [shuffleKey, setShuffleKey] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCellIndex = useRef<number | null>(null);

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

  function keyOf(s: StagedPhoto) {
    return s.kind === "existing" ? `e-${s.id}` : `n-${s.tempId}`;
  }

  function urlOf(s: StagedPhoto) {
    return s.kind === "existing" ? s.url : s.previewUrl;
  }

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

  function handleCanvasDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOverCanvas(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  function handleRemove(key: string) {
    setStaged((prev) => prev.filter((s) => keyOf(s) !== key));
    setDirty(true);
  }

  function handleCellDrop(targetIndex: number) {
    const from = dragCellIndex.current;
    if (from === null || from === targetIndex) return;

    setStaged((prev) => {
      const reordered = [...prev];
      const [moved] = reordered.splice(from, 1);
      reordered.splice(targetIndex, 0, moved);
      return reordered;
    });

    setDirty(true);
    dragCellIndex.current = null;
  }

  const previewPhotos = staged.map((s) => ({ id: keyOf(s), url: urlOf(s) }));

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
      {/* ================= HEADER ================= */}

      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 sm:text-lg">Editorial Photos</h2>
          <p className="mt-1 text-xs text-gray-500">
            Shown at the top of this collection&apos;s page, above the products.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-1 text-sm">
            <button
              type="button"
              onClick={() => onLayoutStyleChange("grid")}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                layoutStyle === "grid" ? "bg-black text-white" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => onLayoutStyleChange("random")}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                layoutStyle === "random" ? "bg-black text-white" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Random
            </button>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            + Upload Photos
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          <button
            type="button"
            disabled={!dirty || syncing}
            onClick={handleSave}
            className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {syncing ? "Saving…" : "Save Photos"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      )}

      {layoutStyle === "grid" ? (
        <>
          <p className="mb-2 text-xs text-gray-400">
            This is the real page layout — drag a photo onto another cell to reorder. Hover a
            photo to remove it.
          </p>

          {/* ================= GRID: LIVE, EDITABLE CANVAS ================= */}
          {/* Full-width, not boxed — this IS the page section, not a preview
              of it, so what's edited here is exactly what visitors see. */}

          {staged.length === 0 ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCanvas(true);
              }}
              onDragLeave={() => setDragOverCanvas(false)}
              onDrop={handleCanvasDrop}
              className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-16 text-center text-sm transition ${
                dragOverCanvas ? "border-black bg-gray-50 text-gray-900" : "border-gray-300 text-gray-400"
              }`}
            >
              <span>No photos yet.</span>
              <span className="text-xs text-gray-400">Drop photos here, or use Upload Photos above.</span>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCanvas(true);
              }}
              onDragLeave={() => setDragOverCanvas(false)}
              onDrop={handleCanvasDrop}
              className={`grid grid-cols-3 border border-gray-200 md:grid-cols-4 ${
                dragOverCanvas ? "outline outline-2 outline-black" : ""
              }`}
            >
              {staged.map((s, index) => (
                <div
                  key={keyOf(s)}
                  draggable
                  onDragStart={() => (dragCellIndex.current = index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.stopPropagation();
                    handleCellDrop(index);
                  }}
                  className="group relative aspect-[3/4] cursor-grab border-b border-r border-gray-200 bg-gray-50 [&:nth-child(3n)]:border-r-0 active:cursor-grabbing md:[&:nth-child(3n)]:border-r md:[&:nth-child(4n)]:border-r-0"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={urlOf(s)} alt="" className="h-full w-full object-cover" />

                  <button
                    type="button"
                    onClick={() => handleRemove(keyOf(s))}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-sm text-white opacity-0 transition group-hover:opacity-100"
                    aria-label="Remove photo"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* ================= RANDOM: MANAGE + SAMPLE PREVIEW ================= */}
          {/* Random re-randomizes size/position on every real page load, so
              there's no single "real position" to edit here — this row is
              just for adding/removing photos and setting load priority via
              order. The panel below samples what a visitor might see. */}

          <p className="mb-2 text-xs text-gray-400">
            Random layout picks a fresh size and position for every photo on every page load, so
            there&apos;s nothing to position by hand here — just add or remove photos. Hover a
            photo to remove it.
          </p>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverCanvas(true);
            }}
            onDragLeave={() => setDragOverCanvas(false)}
            onDrop={handleCanvasDrop}
            className={`flex min-h-[7rem] flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-3 transition ${
              dragOverCanvas ? "outline outline-2 outline-black" : ""
            }`}
          >
            {staged.length === 0 && (
              <div className="flex w-full items-center justify-center py-8 text-center text-sm text-gray-400">
                No photos yet. Drop photos here, or use Upload Photos above.
              </div>
            )}

            {staged.map((s, index) => (
              <div
                key={keyOf(s)}
                draggable
                onDragStart={() => (dragCellIndex.current = index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.stopPropagation();
                  handleCellDrop(index);
                }}
                className="group relative h-24 w-24 cursor-grab overflow-hidden border border-gray-200 bg-gray-50 active:cursor-grabbing"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urlOf(s)} alt="" className="h-full w-full object-cover" />

                <button
                  type="button"
                  onClick={() => handleRemove(keyOf(s))}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs text-white opacity-0 transition group-hover:opacity-100"
                  aria-label="Remove photo"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {staged.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Sample preview</h3>
                <button
                  type="button"
                  onClick={() => setShuffleKey((k) => k + 1)}
                  className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
                >
                  Shuffle preview
                </button>
              </div>

              <div className="border border-gray-200 bg-white p-3">
                <CollectionGallery key={shuffleKey} photos={previewPhotos} layoutStyle="random" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}