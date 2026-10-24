import { createElement, lazy, Suspense } from 'react';
import type { AssetSource } from 'sanity';
import type { MediaKind } from './mediaRules.ts';

const ImagePicker = lazy(() => import('../components/GuardedImageSource'));
function source(kind: MediaKind): AssetSource {
  return {
    name: `guarded-${kind}`, title: kind === 'portrait' ? 'Portraits' : 'Client logos',
    component: (props) => createElement(Suspense, { fallback: createElement('p', { role: 'status' }, 'Loading images...') }, createElement(ImagePicker, { ...props, kind })),
  };
}
export const portraitSource = source('portrait');
export const logoSource = source('logo');