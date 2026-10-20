// Normalizes admin image uploads in the browser so cloud routes need no native image runtime.
'use client';

import { cropRectangle, type ImageCrop } from './image-crop';

export type ProcessedImage = {
  original: Blob;
  cropped: Blob;
  width: number;
  height: number;
};

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not process image.'))),
      'image/webp',
      quality,
    );
  });
}

export async function processImage(
  file: File,
  crop: ImageCrop,
  aspect?: number,
  maxWidth = 1600,
): Promise<ProcessedImage> {
  if (!/\.(png|jpe?g|webp)$/i.test(file.name) || file.size > 10 * 1024 * 1024)
    throw new Error('Choose a JPEG, PNG or WebP image up to 10 MB.');
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = bitmap;
    if (width < 2 || height < 2 || width * height > 40_000_000)
      throw new Error('Choose an image at least 2 pixels wide and under 40 megapixels.');
    const originalScale = Math.min(1, 2400 / Math.max(width, height));
    const originalCanvas = document.createElement('canvas');
    originalCanvas.width = Math.max(1, Math.round(width * originalScale));
    originalCanvas.height = Math.max(1, Math.round(height * originalScale));
    const originalContext = originalCanvas.getContext('2d');
    if (!originalContext) throw new Error('Image processing is unavailable in this browser.');
    originalContext.drawImage(bitmap, 0, 0);

    const rect = cropRectangle(width, height, crop, aspect ?? width / height);
    const scale = Math.min(1, maxWidth / rect.width);
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = Math.max(1, Math.round(rect.width * scale));
    croppedCanvas.height = Math.max(1, Math.round(rect.height * scale));
    const croppedContext = croppedCanvas.getContext('2d');
    if (!croppedContext) throw new Error('Image processing is unavailable in this browser.');
    croppedContext.drawImage(
      bitmap,
      rect.left,
      rect.top,
      rect.width,
      rect.height,
      0,
      0,
      croppedCanvas.width,
      croppedCanvas.height,
    );
    return {
      original: await canvasBlob(originalCanvas, 0.92),
      cropped: await canvasBlob(croppedCanvas, 0.88),
      width: croppedCanvas.width,
      height: croppedCanvas.height,
    };
  } finally {
    bitmap.close();
  }
}
