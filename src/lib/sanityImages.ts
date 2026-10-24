import { createImageUrlBuilder } from '@sanity/image-url';
import { getSanityConfig } from '../../server/sanity-config.js';

export interface SourceImage {
  asset?: { _id: string; url: string; metadata?: { dimensions?: { width: number; height: number } } };
  alt?: string;
  crop?: { top: number; bottom: number; left: number; right: number };
  hotspot?: { x: number; y: number; width: number; height: number };
}
export interface LocalImage { src: string; srcSet?: string; width: number; height: number; shareSrc?: string }
const builder = createImageUrlBuilder(getSanityConfig(import.meta.env));
const images = new Map<string, Promise<LocalImage>>();

export function buildImage(image: SourceImage | undefined, kind: 'portrait' | 'logo'): Promise<LocalImage | undefined> {
  if (!image?.asset?.url) return Promise.resolve(undefined);
  const key = JSON.stringify([image, kind]);
  if (!images.has(key)) images.set(key, generateImage(image, kind));
  return images.get(key)!;
}

async function generateImage(image: SourceImage, kind: 'portrait' | 'logo'): Promise<LocalImage> {
  const { getImage, inferRemoteSize } = await import('astro:assets');
  const dimensions = image.asset!.metadata?.dimensions;
  if (kind === 'logo') {
    const src = image.asset!.url;
    const source = dimensions && Number.isFinite(dimensions.width) && dimensions.width > 0
      && Number.isFinite(dimensions.height) && dimensions.height > 0
      ? dimensions : await inferRemoteSize(src);
    const width = Math.min(400, source.width);
    // inferSize with an explicit width would retain the original height and crop the logo.
    const height = Math.max(1, Math.round(source.height * width / source.width));
    const format = new URL(src).pathname.toLowerCase().endsWith('.svg') ? 'svg' : 'webp';
    const logo = await getImage({ src, width, height, fit: 'contain', format, quality: 75 });
    return { src: logo.src, width: Number(logo.attributes.width), height: Number(logo.attributes.height) };
  }
  const width = Math.min(800, dimensions?.width || 800, dimensions?.height || 800);
  const src = builder.image(image as Parameters<typeof builder.image>[0]).width(width).height(width).fit('crop').quality(90).url();
  const large = await getImage({ src, width, height: width, format: 'webp', quality: 75 });
  const smallWidth = Math.min(400, width);
  const [small, share] = await Promise.all([
    getImage({ src, width: smallWidth, height: smallWidth, format: 'webp', quality: 75 }),
    getImage({ src, width, height: width, format: 'jpeg', quality: 80 }),
  ]);
  return { src: large.src, srcSet: `${small.src} ${smallWidth}w, ${large.src} ${width}w`, width, height: width, shareSrc: share.src };
}