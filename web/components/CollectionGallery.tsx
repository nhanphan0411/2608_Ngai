"use client";

import { useEffect, useState } from "react";
import type { CollectionLayoutStyle } from "@/types/db";

export type GalleryPhoto = {
  id: number | string;
  url: string;
};

type Box = { pos_x: number; pos_y: number; width_pct: number; height_pct: number };

/**
 * The random-layout canvas needs an explicit height (percentages need
 * something to be percentages OF), but width stays fluid at 100% of the
 * content column. An `aspect-ratio` grows with photo count so the
 * canvas gets taller — never more crowded — as more photos are shown,
 * and stays responsive without any JS measurement.
 */
export function randomCanvasAspectRatio(photoCount: number): string {
  const heightUnits = Math.max(2.2, 1 + photoCount * 0.55);
  return `3 / ${heightUnits.toFixed(2)}`;
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function rectOverlapArea(x1: number, y1: number, w1: number, h1: number, r2: Box) {
  const xOverlap = Math.max(0, Math.min(x1 + w1, r2.pos_x + r2.width_pct) - Math.max(x1, r2.pos_x));
  const yOverlap = Math.max(0, Math.min(y1 + h1, r2.pos_y + r2.height_pct) - Math.max(y1, r2.pos_y));
  return xOverlap * yOverlap;
}

/**
 * A random size for this photo that preserves its own natural aspect
 * ratio (`imgH / imgW`) — only the scale is random, never the shape —
 * so nothing ever gets stretched or needs cropping. `heightUnits` is
 * the same value the canvas's own aspect-ratio uses, so a width_pct
 * (of canvas width) and height_pct (of canvas height) computed from it
 * actually render at the image's true aspect ratio on screen.
 */
function randomSizeForAspect(imgAspectHW: number, heightUnits: number): { width_pct: number; height_pct: number } {
  let width_pct = 22 * randomBetween(0.65, 1.15);
  let height_pct = width_pct * imgAspectHW * (3 / heightUnits);

  // Keep proportions sane for very wide/tall source images — rescale
  // both dimensions together (never independently) so aspect is exact.
  const rescale = (value: number, min: number, max: number) => {
    if (value > max) {
      const factor = max / value;
      width_pct *= factor;
      height_pct *= factor;
    } else if (value < min) {
      const factor = min / value;
      width_pct *= factor;
      height_pct *= factor;
    }
  };

  rescale(height_pct, 10, 55);
  rescale(width_pct, 10, 55);

  return { width_pct, height_pct };
}

/**
 * Position chosen (via a few retries, keeping whichever candidate
 * overlaps existing boxes least) so photos don't pile on top of each
 * other — then clamped into [0, 100 - size] on both axes so a box can
 * never sit outside the canvas.
 */
function generatePlacement(existing: Box[], imgAspectHW: number, heightUnits: number): Box {
  let best: Box | null = null;
  let bestOverlap = Infinity;

  for (let attempt = 0; attempt < 25; attempt++) {
    const { width_pct, height_pct } = randomSizeForAspect(imgAspectHW, heightUnits);
    const pos_x = randomBetween(0, Math.max(0, 100 - width_pct));
    const pos_y = randomBetween(0, Math.max(0, 100 - height_pct));

    const overlap = existing.reduce(
      (sum, e) => sum + rectOverlapArea(pos_x, pos_y, width_pct, height_pct, e),
      0
    );

    if (overlap === 0) return { pos_x, pos_y, width_pct, height_pct };

    if (overlap < bestOverlap) {
      bestOverlap = overlap;
      best = { pos_x, pos_y, width_pct, height_pct };
    }
  }

  return best!;
}

function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function loadNaturalAspect(url: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve((img.naturalHeight || 1) / (img.naturalWidth || 1));
    img.onerror = () => resolve(1); // fall back to square if it fails to load
    img.src = url;
  });
}

/**
 * Fullscreen viewer for a clicked photo, with prev/next + Escape/arrow
 * keys. Sized at 80% of the content column's own max width (the column
 * itself doesn't have a natural height, so 80% height falls back to
 * viewport height) and centered on screen.
 */
function Lightbox({
  photos,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  photos: GalleryPhoto[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    }

    window.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose, onPrev, onNext]);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="absolute left-62 top-0 right-0 bottom-0 bg-black/30 p-10 pointer-events-auto" onClick={onClose}>
        <div className="relative flex h-full w-full flex-col bg-[#F2F2F2] border shadow" onClick={(e) => e.stopPropagation()}>
          <div className="absolute top-0 left-0 right-0 z-10 flex h-8 items-center justify-between px-3 border-b">
            <div className="text-sm leading-tight">
              {index + 1}/{photos.length}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center text-2xl leading-none cursor-pointer"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="relative flex h-full w-full items-center justify-center px-16 py-16">
            {photos.length > 1 && (
              <button
                type="button"
                onClick={onPrev}
                className="absolute left-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-3xl cursor-w-resize"
                aria-label="Previous photo"
              >
                ‹
              </button>
            )}

            <div className="flex h-full w-full items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photos[index].url}
                alt=""
                className="max-h-full max-w-full object-contain"
              />
            </div>

            {photos.length > 1 && (
              <button
                type="button"
                onClick={onNext}
                className="absolute right-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-3xl cursor-e-resize"
                aria-label="Next photo"
              >
                ›
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Renders a set of editorial photos as either:
 * - "grid": a fixed 4-col desktop / 3-col mobile grid, in the given order.
 * - "random": every photo gets a fresh size + position generated
 *   client-side on mount (bounded, overlap-minimized), regenerated on
 *   every page load. Size only ever scales the photo's own aspect
 *   ratio — never crops or stretches it.
 */
export default function CollectionGallery({
  photos,
  layoutStyle,
}: {
  photos: GalleryPhoto[];
  layoutStyle: CollectionLayoutStyle;
}) {
  const [mounted, setMounted] = useState(false);
  const [arranged, setArranged] = useState<{ photo: GalleryPhoto; box: Box }[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Navigation order for the lightbox: whatever's actually on screen —
  // the grid's given order, or random's shuffled display order — so
  // next/prev steps through photos in the same order they're shown in.
  const displayList = layoutStyle === "grid" ? photos : arranged.map((a) => a.photo);

  function showPrev() {
    setLightboxIndex((i) => (i === null ? null : (i - 1 + displayList.length) % displayList.length));
  }

  function showNext() {
    setLightboxIndex((i) => (i === null ? null : (i + 1) % displayList.length));
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const heightUnits = Math.max(2.2, 1 + photos.length * 0.55);
      const order = shuffled(photos);
      const aspects = await Promise.all(order.map((p) => loadNaturalAspect(p.url)));

      if (cancelled) return;

      const boxes: Box[] = [];

      const arrangedList = order.map((photo, i) => {
        const box = generatePlacement(boxes, aspects[i], heightUnits);
        boxes.push(box);
        return { photo, box };
      });

      setArranged(arrangedList);
      setMounted(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [photos]);

  if (photos.length === 0) return null;

  if (layoutStyle === "grid") {
    return (
      <>
        <div className="grid grid-cols-3 md:grid-cols-4">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              onClick={() => setLightboxIndex(index)}
              className="aspect-[3/4] cursor-zoom-in border-b border-r border-black [&:nth-child(3n)]:border-r-0 md:[&:nth-child(3n)]:border-r md:[&:nth-child(4n)]:border-r-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" className="h-full w-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>

        {lightboxIndex !== null && (
          <Lightbox
            photos={displayList}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onPrev={showPrev}
            onNext={showNext}
          />
        )}
      </>
    );
  }

  // Random layout. Nothing is rendered until we've loaded each photo's
  // natural size and generated a client-side arrangement, so we never
  // ship a server-rendered layout that would mismatch (and visibly
  // jump, or briefly show the wrong aspect ratio) on hydration.
  if (!mounted) {
    return (
      <div
        className="w-full animate-pulse bg-gray-100"
        style={{ aspectRatio: randomCanvasAspectRatio(photos.length) }}
      />
    );
  }

  return (
    <>
      <div className="relative w-full" style={{ aspectRatio: randomCanvasAspectRatio(photos.length) }}>
        {arranged.map(({ photo, box }, index) => (
          <div
            key={photo.id}
            onClick={() => setLightboxIndex(index)}
            className="absolute cursor-zoom-in"
            style={{
              left: `${box.pos_x}%`,
              top: `${box.pos_y}%`,
              width: `${box.width_pct}%`,
              height: `${box.height_pct}%`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt="" className="h-full w-full object-contain" loading="lazy" />
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={displayList}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={showPrev}
          onNext={showNext}
        />
      )}
    </>
  );
}