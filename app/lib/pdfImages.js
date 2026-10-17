/**
 * Images for the itinerary PDF (capstone panel item 7). jsPDF needs image data,
 * not URLs, so each image is downloaded, cropped or fitted on a canvas and
 * returned as a data URL. Any failure (CORS, 404, timeout, no canvas) gives
 * null, and the PDF prints that spot without an image.
 */

const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;
// A first path segment like "c_fill,w_320" or "f_auto" is already a transformation.
const CLOUDINARY_TRANSFORM = /^[a-z]{1,4}_[^/]*\//;

/** Asks Cloudinary for a 320×240 JPEG instead of the full upload; other URLs pass through. */
export function pdfPhotoUrl(url) {
  const match = CLOUDINARY_UPLOAD.exec(String(url ?? ""));
  if (!match || CLOUDINARY_TRANSFORM.test(match[2])) return url;
  return `${match[1]}c_fill,w_320,h_240,q_auto,f_jpg/${match[2]}`;
}

/**
 * Draws `bitmap` into `canvas`. "cover" crops to the frame's shape; "contain"
 * fits inside the frame without upscaling. JPEGs get a white background so
 * transparent pixels don't turn black.
 */
function drawToCanvas(canvas, bitmap, { width, height, fit, format }) {
  const context = canvas.getContext("2d");
  if (!context) return null;

  let sx = 0;
  let sy = 0;
  let sw = bitmap.width;
  let sh = bitmap.height;
  let dw = width;
  let dh = height;
  if (fit === "cover") {
    const frameRatio = width / height;
    if (sw / sh > frameRatio) {
      sw = sh * frameRatio;
      sx = (bitmap.width - sw) / 2;
    } else {
      sh = sw / frameRatio;
      sy = (bitmap.height - sh) / 2;
    }
  } else {
    const scale = Math.min(width / sw, height / sh, 1);
    dw = Math.max(1, Math.round(sw * scale));
    dh = Math.max(1, Math.round(sh * scale));
  }

  canvas.width = dw;
  canvas.height = dh;
  const isPng = format === "png";
  if (!isPng) {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, dw, dh);
  }
  context.drawImage(bitmap, sx, sy, sw, sh, 0, 0, dw, dh);
  return {
    dataUrl: isPng ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.82),
    width: dw,
    height: dh,
    format: isPng ? "PNG" : "JPEG",
  };
}

// The PDF is rebuilt whenever its input changes (weather arriving, say), so loaded photos are kept for
// reuse. Successes only: a failure may be transient and should retry. Oldest entries go first.
const CACHE_LIMIT = 200;
const imageCache = new Map();

/** Forgets every cached photo. Tests call it so one test's photos never reach the next. */
export function clearPdfImageCache() {
  imageCache.clear();
}

function remember(key, image) {
  imageCache.delete(key);
  imageCache.set(key, image);
  if (imageCache.size > CACHE_LIMIT) imageCache.delete(imageCache.keys().next().value);
}

/**
 * @param {string} url
 * @param {{ width?: number, height?: number, fit?: "cover"|"contain", format?: "jpeg"|"png", timeoutMs?: number }} [options]
 * @returns {Promise<{ dataUrl: string, width: number, height: number, format: "JPEG"|"PNG" } | null>}
 */
export async function loadPdfImage(url, { width = 320, height = 240, fit = "cover", format = "jpeg", timeoutMs = 6000 } = {}) {
  if (!url || typeof fetch !== "function" || typeof createImageBitmap !== "function" || typeof document === "undefined") {
    return null;
  }
  const cacheKey = `${url}|${width}x${height}|${fit}|${format}`;
  const cached = imageCache.get(cacheKey);
  if (cached) return cached;
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = setTimeout(() => controller?.abort(), timeoutMs);
  try {
    const response = await fetch(url, { mode: "cors", credentials: "omit", signal: controller?.signal });
    if (!response.ok) return null;
    const bitmap = await createImageBitmap(await response.blob());
    try {
      const image = drawToCanvas(document.createElement("canvas"), bitmap, { width, height, fit, format });
      if (image) remember(cacheKey, image);
      return image;
    } finally {
      bitmap.close?.();
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Loads each distinct URL once, at most `concurrency` at a time.
 * @returns {Promise<Map<string, object|null>>}
 */
export async function loadPdfImages(urls, { load = loadPdfImage, concurrency = 6, options = {} } = {}) {
  const unique = [...new Set((Array.isArray(urls) ? urls : []).filter(Boolean))];
  const results = new Map();
  const limit = Math.max(1, Number(concurrency) || 1);
  let next = 0;

  async function worker() {
    while (next < unique.length) {
      const url = unique[next];
      next += 1;
      results.set(url, await Promise.resolve().then(() => load(url, options)).catch(() => null));
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, unique.length) }, worker));
  return results;
}
