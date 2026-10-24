import type { ValidationContext } from 'sanity';

export type MediaKind = 'portrait' | 'logo';
export const mediaLimits = { portrait: 2 * 1024 * 1024, logo: 250 * 1024 };
export const mediaAccept = {
  portrait: 'image/jpeg,image/png,image/webp',
  logo: 'image/jpeg,image/png,image/webp,image/svg+xml',
};

export function uploadError(file: { size: number; type: string }, kind: MediaKind) {
  if (!mediaAccept[kind].split(',').includes(file.type)) return 'Choose a supported, non-animated image format.';
  if (file.size <= 0 || file.size > mediaLimits[kind]) {
    return `Choose a ${kind} no larger than ${kind === 'portrait' ? '2 MiB' : '250 KiB'}.`;
  }
  return true;
}

export async function validateImage(value: unknown, context: ValidationContext, kind: MediaKind) {
  const image = value as { asset?: { _ref?: string } } | undefined;
  if (!image?.asset?._ref) return true;
  const asset = await context.getClient({ apiVersion: '2026-09-08' }).fetch<{
    size: number; mimeType: string; metadata?: { dimensions?: { width: number; height: number } };
  } | null>('*[_id == $id][0]{size, mimeType, metadata{dimensions}}', { id: image.asset._ref });
  if (!asset) return 'The image asset could not be verified.';
  const error = uploadError({ size: asset.size, type: asset.mimeType }, kind);
  if (error !== true) return error;
  const dimensions = asset.metadata?.dimensions;
  if (kind === 'portrait' && (!dimensions || dimensions.width < 600 || dimensions.height < 600)) {
    return 'Portraits must be at least 600 by 600 pixels.';
  }
  return true;
}