import { createWorker, type Worker } from 'tesseract.js';
import { loadImage, imageData } from './image.js';
export const languages = ['eng', 'ita', 'ara', 'urd'];
export function reviewText(text: unknown): string {
  return String(text || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, 10000);
}
export async function recognizeLabel(file: File, language = 'eng', onProgress: (progress: number) => void = () => {}, signal?: AbortSignal, workerFactory: typeof createWorker = createWorker): Promise<{ text: string; confidence: number; language: string }> {
  if (!languages.includes(language)) throw Error('Choose a supported recognition language.');
  const bitmap = await loadImage(file);
  let worker: Worker | undefined;
  let cancelled = false;
  let terminating: Promise<unknown> | undefined;
  let rejectRecognition: ((reason: DOMException) => void) | undefined;
  const cancel = () => {
    cancelled = true;
    if (worker) terminating = worker.terminate().catch(() => undefined);
    rejectRecognition?.(new DOMException('Cancelled', 'AbortError'));
  };
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    const { canvas } = imageData(bitmap, 2400);
    worker = await workerFactory(language, 1, {
      workerPath: '/assets/ocr/worker.min.js',
      corePath: '/assets/ocr/core',
      langPath: '/assets/ocr/lang',
      workerBlobURL: false,
      logger: progress => { if (!cancelled) onProgress(Math.round(Math.max(0, Math.min(1, progress.progress || 0)) * 100)); }
    });
    if (cancelled || signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    // Tesseract terminate() does not settle a pending recognize() promise.
    // Race cancellation explicitly so callers can release UI and image memory.
    const cancellation = new Promise<never>((_resolve, reject) => { rejectRecognition = reject; });
    const { data } = await Promise.race([worker.recognize(canvas), cancellation]);
    if (cancelled) throw new DOMException('Cancelled', 'AbortError');
    return { text: reviewText(data.text), confidence: data.confidence, language };
  } finally {
    signal?.removeEventListener('abort', cancel);
    bitmap.close();
    if (worker) {
      terminating ??= worker.terminate();
      await terminating.catch(() => undefined);
    }
  }
}
