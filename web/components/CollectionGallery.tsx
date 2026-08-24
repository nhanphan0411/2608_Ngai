"use client";

import { useEffect, useState } from "react";
import type { CollectionLayoutStyle } from "@/types/db";

export type GalleryPhoto = {
  id: number | string;
  url: string;
};

type Box = { pos_x: number; pos_y: number; width_pct: number; height_pct: number };

export function randomCanvasAspectRatio(photoCount: number, isMobile = false): string {
  const heightUnits = isMobile
    ? Math.max(4, 1 + photoCount * 0.6)
    : Math.max(2.2, 1 + photoCount * 0.35);

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

function randomSizeForAspect(
  imgAspectHW: number,
  heightUnits: number,
  isMobile: boolean
): { width_pct: number; height_pct: number } {
  let width_pct = (isMobile ? 38 : 25) * randomBetween(
    isMobile ? 0.7 : 0.65,
    isMobile ? 1.3 : 1.35
  );

  let height_pct = width_pct * imgAspectHW * (3 / heightUnits);

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

  rescale(height_pct, isMobile ? 15 : 12, isMobile ? 75 : 70);
  rescale(width_pct, isMobile ? 15 : 12, isMobile ? 75 : 70);

  return { width_pct, height_pct };
}

function generatePlacement(
  existing: Box[],
  imgAspectHW: number,
  heightUnits: number,
  isMobile: boolean
): Box {
  let best: Box | null = null;
  let bestOverlap = Infinity;

  for (let attempt = 0; attempt < 30; attempt++) {
    const { width_pct, height_pct } = randomSizeForAspect(
      imgAspectHW,
      heightUnits,
      isMobile
    );

    const pos_x = randomBetween(0, Math.max(0, 100 - width_pct));
    const pos_y = randomBetween(0, Math.max(0, 100 - height_pct));

    const overlap = existing.reduce(
      (sum, e) =>
        sum + rectOverlapArea(
          pos_x,
          pos_y,
          width_pct,
          height_pct,
          e
        ),
      0
    );

    if (overlap < bestOverlap) {
      bestOverlap = overlap;
      best = {
        pos_x,
        pos_y,
        width_pct,
        height_pct,
      };
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

    img.onload = () =>
      resolve((img.naturalHeight || 1) / (img.naturalWidth || 1));

    img.onerror = () => resolve(1);

    img.src = url;
  });
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-6 w-6"
    >
      {direction === "left" ? (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20 12H4M4 12l6-6M4 12l6 6"
        />
      ) : (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 12h16M20 12l-6-6M20 12l-6 6"
        />
      )}
    </svg>
  );
}

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
  const [mobileTopOffset, setMobileTopOffset] = useState(0);

  useEffect(() => {
    function measure() {
      if (window.innerWidth >= 768) {
        setMobileTopOffset(0);
        return;
      }

      const header = document.getElementById("site-mobile-header");
      const bar = document.getElementById("collection-top-bar");

      const headerHeight =
        header?.getBoundingClientRect().height ?? 0;

      const barHeight =
        bar?.getBoundingClientRect().height ?? 0;

      setMobileTopOffset(headerHeight + barHeight);
    }

    measure();

    window.addEventListener("resize", measure);

    return () => window.removeEventListener("resize", measure);
  }, []);

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
      <div
        className="absolute left-0 md:left-62 right-0 bottom-0 bg-black/30 p-4 md:p-15 pointer-events-auto"
        style={{ top: mobileTopOffset }}
        onClick={onClose}
      >
        <div
          className="relative flex h-full w-full flex-col bg-[#F2F2F2] border shadow"
          onClick={(e) => e.stopPropagation()}
        >
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

          <div className="relative flex h-full w-full flex-col items-center justify-center gap-4 px-4 py-8 md:flex-row md:justify-between md:gap-0 md:px-8 md:py-16">
            {photos.length > 1 && (
              <button
                type="button"
                onClick={onPrev}
                className="hidden md:flex h-10 w-10 shrink-0 items-center justify-center cursor-w-resize"
                aria-label="Previous photo"
              >
                <ArrowIcon direction="left" />
              </button>
            )}

            <div className="flex w-full min-h-0 min-w-0 flex-1 self-stretch items-center justify-center">
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
                className="hidden md:flex h-10 w-10 shrink-0 items-center justify-center cursor-e-resize"
                aria-label="Next photo"
              >
                <ArrowIcon direction="right" />
              </button>
            )}

            {photos.length > 1 && (
              <div className="flex w-full md:hidden shrink-0 items-center justify-between">
                <button
                  type="button"
                  onClick={onPrev}
                  className="flex h-10 w-10 items-center justify-center cursor-pointer"
                  aria-label="Previous photo"
                >
                  <ArrowIcon direction="left" />
                </button>

                <button
                  type="button"
                  onClick={onNext}
                  className="flex h-10 w-10 items-center justify-center cursor-pointer"
                  aria-label="Next photo"
                >
                  <ArrowIcon direction="right" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CollectionGallery({
  photos,
  layoutStyle,
}: {
  photos: GalleryPhoto[];
  layoutStyle: CollectionLayoutStyle;
}) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [arranged, setArranged] = useState<
    { photo: GalleryPhoto; box: Box }[]
  >([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const displayList =
    layoutStyle === "grid"
      ? photos
      : arranged.map((a) => a.photo);

  function showPrev() {
    setLightboxIndex((i) =>
      i === null
        ? null
        : (i - 1 + displayList.length) % displayList.length
    );
  }

  function showNext() {
    setLightboxIndex((i) =>
      i === null
        ? null
        : (i + 1) % displayList.length
    );
  }

  useEffect(() => {
    let cancelled = false;
    let lastIsMobile = window.innerWidth < 768;

    setIsMobile(lastIsMobile);

    async function generateLayout(mobile: boolean) {
      setMounted(false);

      const heightUnits = mobile
        ? Math.max(4, 1 + photos.length * 0.6)
        : Math.max(2.2, 1 + photos.length * 0.35);

      const order = shuffled(photos);

      const aspects = await Promise.all(
        order.map((p) => loadNaturalAspect(p.url))
      );

      if (cancelled) return;

      const boxes: Box[] = [];

      const arrangedList = order.map((photo, i) => {
        const box = generatePlacement(
          boxes,
          aspects[i],
          heightUnits,
          mobile
        );

        boxes.push(box);

        return { photo, box };
      });

      if (cancelled) return;

      setArranged(arrangedList);
      setMounted(true);
    }

    generateLayout(lastIsMobile);

    function handleResize() {
      const mobile = window.innerWidth < 768;

      if (mobile !== lastIsMobile) {
        lastIsMobile = mobile;
        setIsMobile(mobile);
        generateLayout(mobile);
      }
    }

    window.addEventListener("resize", handleResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", handleResize);
    };
  }, [photos]);

  if (photos.length === 0) return null;

  if (layoutStyle === "grid") {
    return (
      <>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              onClick={() => setLightboxIndex(index)}
              className="aspect-[3/4] cursor-zoom-in"
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

  if (!mounted) {
    return (
      <div
        className="w-full animate-pulse bg-gray-100"
        style={{
          aspectRatio: randomCanvasAspectRatio(photos.length),
        }}
      />
    );
  }

  return (
    <>
      <div
        className="relative w-full"
        style={{
          aspectRatio: randomCanvasAspectRatio(
            photos.length,
            isMobile
          ),
        }}
      >
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
              zIndex: index + 1,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt=""
              className="h-full w-full object-contain"
              loading="lazy"
            />
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