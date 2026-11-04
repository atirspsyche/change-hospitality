export const policyThemes = {
  mist: { label: 'Mist / ink', background: 'var(--color-mist)', foreground: 'var(--color-ink)' },
  'bcorp-green': { label: 'B-Corp green / cream', background: 'var(--color-bcorp-green)', foreground: 'var(--color-cream)' },
  cocoa: { label: 'Cocoa / cream', background: 'var(--color-cocoa)', foreground: 'var(--color-cream)' },
  citron: { label: 'Citron / cocoa', background: 'var(--color-citron)', foreground: 'var(--color-cocoa)' },
};

export type PolicyTheme = keyof typeof policyThemes;

export interface PolicyPage {
  _id: string;
  label: string;
  title: string;
  slug: { current: string };
  description: string;
  theme: PolicyTheme;
  body: string;
}

export interface PolicyLink {
  _id: string;
  label: string;
  slug: string;
  href: string;
}

export const policyHref = (slug: string) => `/policies/${slug}/`;
export const policySlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const hasPolicyText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

function isPolicyPage(value: unknown): value is PolicyPage {
  return typeof value === 'object' && value !== null
    && '_id' in value && hasPolicyText(value._id)
    && 'label' in value && hasPolicyText(value.label)
    && 'title' in value && hasPolicyText(value.title)
    && 'description' in value && hasPolicyText(value.description) && value.description.length <= 180
    && 'body' in value && hasPolicyText(value.body)
    && 'theme' in value && typeof value.theme === 'string' && Object.hasOwn(policyThemes, value.theme)
    && 'slug' in value && typeof value.slug === 'object' && value.slug !== null
    && 'current' in value.slug && typeof value.slug.current === 'string'
    && value.slug.current.length <= 96 && policySlugPattern.test(value.slug.current);
}

export function requirePolicies(value: unknown): PolicyPage[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Policy pages are missing in Sanity. Run npm --prefix studio run seed:policies, then publish policy pages before rebuilding.');
  }
  if (!value.every(isPolicyPage)) {
    throw new Error('Invalid Sanity policy page: every visible policy needs a title, footer label, URL slug, SEO description (up to 180 characters), colour theme and Markdown body. Run seed:policies for existing PDF links, or correct and publish the document in Studio.');
  }
  if (new Set(value.map(({ slug }) => slug.current)).size !== value.length) {
    throw new Error('Sanity policy pages must have unique URL slugs. Correct and publish the duplicate policies before rebuilding.');
  }
  return value;
}
