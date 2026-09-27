export type ImageCrop = { x: number; y: number; zoom: number };
export const COVER_ASPECT = 1.55;
export const centeredCrop: ImageCrop = { x: .5, y: .5, zoom: 1 };
export function cropRectangle(width: number, height: number, crop: ImageCrop, aspect = COVER_ASPECT) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 2 || height < 2 || !Number.isFinite(aspect) || aspect <= 0 || aspect > 20000000 || ![crop.x, crop.y, crop.zoom].every(Number.isFinite) || crop.x < 0 || crop.x > 1 || crop.y < 0 || crop.y > 1 || crop.zoom < 1 || crop.zoom > 5) throw new Error('Invalid image crop');
  const w = Math.max(1, Math.floor(Math.min(width, height * aspect) / crop.zoom));
  const h = Math.max(1, Math.floor(w / aspect));
  return { left: Math.round((width - w) * crop.x), top: Math.round((height - h) * crop.y), width: w, height: h };
}
