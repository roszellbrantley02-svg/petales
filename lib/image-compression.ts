// Client-side image compression — runs in the browser before upload.
// Resizes to fit within MAX_DIM on the longest side, re-encodes as JPEG at QUALITY.
// Saves 70-90% bandwidth on a typical iPhone photo with no perceptible quality loss.

const MAX_DIM = 2000; // pixels on the longest side
const QUALITY = 0.85; // JPEG quality

/**
 * Compress an image File and return a smaller File (or the original if already small).
 * Skips non-image files and animated GIFs (which would lose animation).
 * Falls through gracefully on any error — returns the original.
 */
export async function compressImage(file: File): Promise<File> {
  // Only compress raster images
  if (!file.type.startsWith('image/')) return file;
  if (file.type === 'image/gif') return file; // preserve animation
  if (file.type === 'image/svg+xml') return file; // already small

  // Skip if already small enough
  if (file.size < 500_000) return file;

  try {
    const dataUrl = await readFileAsDataUrl(file);
    const img = await loadImage(dataUrl);

    const longest = Math.max(img.width, img.height);
    if (longest <= MAX_DIM) {
      // Already within bounds — just re-encode for size
      return await renderToFile(img, img.width, img.height, file.name);
    }

    const scale = MAX_DIM / longest;
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    return await renderToFile(img, w, h, file.name);
  } catch {
    // Any failure — fall back to the original
    return file;
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('image load failed'));
    i.src = src;
  });
}

async function renderToFile(
  img: HTMLImageElement,
  w: number,
  h: number,
  originalName: string
): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas context');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', QUALITY)
  );
  if (!blob) throw new Error('canvas toBlob failed');

  // Preserve a sensible name
  const base = originalName.replace(/\.[^.]+$/, '');
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
}
