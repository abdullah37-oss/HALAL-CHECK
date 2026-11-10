// Inputs are decoded on-device. SVG/animated formats are deliberately excluded.
export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 24_000_000;
export async function loadImage(file: File): Promise<ImageBitmap> {
  if (!file || file.size === 0 || file.size > MAX_IMAGE_BYTES) throw Error('Choose an image smaller than 12 MB.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw Error('Choose a JPEG, PNG or WebP image.');
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const signature = file.type === 'image/jpeg' ? header[0] === 255 && header[1] === 216
    : file.type === 'image/png' ? [137,80,78,71,13,10,26,10].every((v,i) => header[i] === v)
    : String.fromCharCode(...header.slice(0,4)) === 'RIFF' && String.fromCharCode(...header.slice(8,12)) === 'WEBP';
  if (!signature) throw Error('This file is not a supported image.');
  let bitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw Error('This image could not be read. Choose another image.'); }
  if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > MAX_IMAGE_PIXELS) {
    bitmap.close();
    throw Error('Choose an image with no more than 24 megapixels.');
  }
  return bitmap;
}
export function imageData(bitmap: ImageBitmap, maxDimension = 2200): { canvas: HTMLCanvasElement; data: ImageData } {
  const ratio = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
  canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw Error('Image processing is unavailable. Try manual entry.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return { canvas, data: context.getImageData(0, 0, canvas.width, canvas.height) };
}
