import { prepareZXingModule, readBarcodes, type ReaderOptions } from 'zxing-wasm/reader';
import { loadImage, imageData } from '../image-recognition/image.js';
prepareZXingModule({ overrides: { locateFile: (path: string) => path.endsWith('.wasm') ? '/assets/zxing_reader.wasm' : path } });
const formats: ReaderOptions['formats'] = ['EAN13', 'EAN8', 'UPCA', 'UPCE'];
const options: ReaderOptions = { formats, tryHarder: true, maxNumberOfSymbols: 1 };
// Native BarcodeDetector returns compressed UPC-E while ZXing expands it.
// Expand only explicitly identified UPC-E, never an ambiguous eight-digit EAN.
export function expandUpce(value: string): string {
  if (!/^[01]\d{7}$/.test(value)) return value;
  const [system, a, b, c, d, e, last, check] = [...value];
  if ('012'.includes(last)) return `${system}${a}${b}${last}0000${c}${d}${e}${check}`;
  if (last === '3') return `${system}${a}${b}${c}00000${d}${e}${check}`;
  if (last === '4') return `${system}${a}${b}${c}${d}00000${e}${check}`;
  return `${system}${a}${b}${c}${d}${e}0000${last}${check}`;
}
export async function decodePixels(data: ImageData): Promise<string | null> {
  const results = await readBarcodes(data, options);
  return results.find(result => result.isValid && /^\d{8}$|^\d{12,14}$/.test(result.text))?.text || null;
}
export async function decodeImage(file: File): Promise<string | null> {
  const bitmap = await loadImage(file);
  try { return await decodePixels(imageData(bitmap).data); } finally { bitmap.close(); }
}
export function createVideoDecoder() {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw Error('Barcode detection is unavailable. Try an image or manual entry.');
  return {
    backend: 'wasm' as const,
    async detect(video: HTMLVideoElement): Promise<Array<{ rawValue: string }>> {
      if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return [];
      const scale = Math.min(1, 1280 / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const text = await decodePixels(context.getImageData(0, 0, canvas.width, canvas.height));
      return text ? [{ rawValue: text }] : [];
    }
  };
}

