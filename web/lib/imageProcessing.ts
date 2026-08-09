// Browser-only. Resizes + converts an image File into 3 WebP blobs.
// Runs entirely client-side — never touches the Workers runtime.

export type ProcessedImage = {
  thumb: Blob;
  mid: Blob;
  large: Blob;
};

const SIZES = {
  thumb: { maxDim: 400, quality: 0.75 },
  mid: { maxDim: 1000, quality: 0.8 },
  large: { maxDim: 1800, quality: 0.85 },
} as const;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function resizeToBlob(
  img: HTMLImageElement,
  maxDim: number,
  quality: number
): Promise<Blob> {
  const { naturalWidth: w, naturalHeight: h } = img;
  const scale = Math.min(1, maxDim / Math.max(w, h)); // never upscale
  const targetW = Math.round(w * scale);
  const targetH = Math.round(h * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.drawImage(img, 0, 0, targetW, targetH);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/webp",
      quality
    );
  });
}

export async function processImage(file: File): Promise<ProcessedImage> {
  const img = await loadImage(file);

  try {
    const [thumb, mid, large] = await Promise.all([
      resizeToBlob(img, SIZES.thumb.maxDim, SIZES.thumb.quality),
      resizeToBlob(img, SIZES.mid.maxDim, SIZES.mid.quality),
      resizeToBlob(img, SIZES.large.maxDim, SIZES.large.quality),
    ]);
    return { thumb, mid, large };
  } finally {
    URL.revokeObjectURL(img.src);
  }
}