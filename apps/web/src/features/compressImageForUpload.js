const MAX_IMAGE_EDGE = 1280;
const TARGET_QUALITY = 0.74;
const SKIP_COMPRESSION_BELOW_BYTES = 768 * 1024;

/** Resize large camera photos before upload to reduce time on mobile networks. */
export async function compressImageForUpload(file) {
  if (!file || typeof createImageBitmap !== 'function') return file;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    const longestEdge = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, MAX_IMAGE_EDGE / longestEdge);
    if (scale === 1 && file.size <= SKIP_COMPRESSION_BELOW_BYTES) return file;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', TARGET_QUALITY));
    if (!blob || blob.size === 0 || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, '') || 'waste-photo';
    return new File([blob], `${name}.webp`, {
      type: 'image/webp',
      lastModified: file.lastModified,
    });
  } catch {
    // Keep the original photo if the browser cannot decode or compress it.
    return file;
  } finally {
    bitmap?.close?.();
  }
}
