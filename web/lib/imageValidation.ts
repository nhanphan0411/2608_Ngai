export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB

const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  ext?: string;
}

export function validateImageFile(file: File): ImageValidationResult {
  const ext = ALLOWED_MIME_TO_EXT[file.type];

  if (!ext) {
    return {
      valid: false,
      error: `"${file.name}": unsupported file type "${file.type || "unknown"}". Allowed: JPG, PNG, WEBP, GIF.`,
    };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `"${file.name}": file is ${mb}MB, which exceeds the ${
        MAX_IMAGE_BYTES / (1024 * 1024)
      }MB limit.`,
    };
  }

  return { valid: true, ext };
}