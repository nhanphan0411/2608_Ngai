"use client";

import { useEffect, useState } from "react";
import type { CollectionLayoutStyle } from "@/types/db";

export type GalleryPhoto = {
  id: number | string;
  url: string;
};

// A handful of aspect ratios used to give the random layout varied
// "sizes" while staying inside normal document flow — CSS columns lay
// each item out in flow, so nothing can ever overlap or spill past the
// container's edges no matter what ratio lands on it.
const RANDOM_ASPECTS = [
  "aspect-[3/4]",
  "aspect-square",
  "aspect-[4/5]",
  "aspect-[2/3]",
  "aspect-[5/4]",
];

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
 * - "grid": a fixed 4-col desktop / 3-col mobile grid, stable order.
 * - "random": a masonry-style column layout that reshuffles order and
 *   picks a random size for every photo on every mount (i.e. every page
 *   load). Using CSS columns instead of absolute positioning means the
 *   browser's normal flow guarantees photos never overlap and never
 *   overflow the container — "random" only ever affects order + size,
 *   never placement outside safe bounds.
 */
export default function CollectionGallery({
  photos,
  layoutStyle,
  reshuffleKey,
}: {
  photos: GalleryPhoto[];
  layoutStyle: CollectionLayoutStyle;
  /** Bump this to force a fresh shuffle (e.g. admin "Shuffle preview" button). */
  reshuffleKey?: number | string;
}) {
  const [mounted, setMounted] = useState(false);
  const [arranged, setArranged] = useState<
    { photo: GalleryPhoto; aspect: string }[]
  >([]);

  useEffect(() => {
    setArranged(
      shuffled(photos).map((photo) => ({
        photo,
        aspect: RANDOM_ASPECTS[Math.floor(Math.random() * RANDOM_ASPECTS.length)],
      }))
    );
    setMounted(true);
  }, [photos, reshuffleKey]);

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
            <img
              src={photo.url}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    );
  }

  // Random / masonry layout. Render nothing until we've computed a
  // client-side shuffle so we never ship a server-rendered order that
  // would mismatch (and visibly jump) on hydration.
  if (!mounted) {
    return (
      <div className="columns-2 gap-3 sm:columns-3 md:columns-4">
        {photos.map((photo) => (
          <div key={photo.id} className="mb-3 aspect-[4/5] break-inside-avoid bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="columns-2 gap-3 sm:columns-3 md:columns-4">
      {arranged.map(({ photo, aspect }) => (
        <div key={photo.id} className={`mb-3 break-inside-avoid ${aspect}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.url}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}