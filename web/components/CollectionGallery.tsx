
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
 * Random size, and a position chosen (via a few retries, keeping
 * whichever candidate overlaps existing boxes least) so photos don't
 * pile on top of each other — then clamped into [0, 100 - size] on
 * both axes so a box can never sit outside the canvas.
 */
function generatePlacement(existing: Box[]): Box {
  let best: Box | null = null;
  let bestOverlap = Infinity;

  for (let attempt = 0; attempt < 25; attempt++) {
    const width_pct = randomBetween(16, 30);
    const height_pct = randomBetween(18, 32);
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

/**
 * Renders a set of editorial photos as either:
 * - "grid": a fixed 4-col desktop / 3-col mobile grid, in the given order.
 * - "random": every photo gets a fresh random size + position (bounded
 *   and overlap-minimized) generated client-side on mount — so it's
 *   genuinely different on every page load, per the brief, rather than
 *   an admin-authored fixed arrangement.
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

  useEffect(() => {
    const boxes: Box[] = [];

    setArranged(
      shuffled(photos).map((photo) => {
        const box = generatePlacement(boxes);
        boxes.push(box);
        return { photo, box };
      })
    );

    setMounted(true);
  }, [photos]);

  if (photos.length === 0) return null;

  if (layoutStyle === "grid") {
    return (
      <div className="grid grid-cols-3 md:grid-cols-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="aspect-[3/4] border-b border-r border-black [&:nth-child(3n)]:border-r-0 md:[&:nth-child(3n)]:border-r md:[&:nth-child(4n)]:border-r-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt="" className="h-full w-full object-cover" loading="lazy" />
          </div>
        ))}
      </div>
    );
  }

  // Random layout. Nothing is rendered until we've generated a
  // client-side arrangement, so we never ship a server-rendered layout
  // that would mismatch (and visibly jump) on hydration.
  if (!mounted) {
    return (
      <div
        className="w-full animate-pulse bg-gray-100"
        style={{ aspectRatio: randomCanvasAspectRatio(photos.length) }}
      />
    );
  }

  return (
    <div className="relative w-full" style={{ aspectRatio: randomCanvasAspectRatio(photos.length) }}>
      {arranged.map(({ photo, box }) => (
        <div
          key={photo.id}
          className="absolute overflow-hidden"
          style={{
            left: `${box.pos_x}%`,
            top: `${box.pos_y}%`,
            width: `${box.width_pct}%`,
            height: `${box.height_pct}%`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
      ))}
    </div>
  );
}
