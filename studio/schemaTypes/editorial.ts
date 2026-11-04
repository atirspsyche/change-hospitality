import { defineField, defineType } from 'sanity';
import { logoSource } from '../lib/mediaSources.ts';
import { validateImage } from '../lib/mediaRules.ts';
import { hasPolicyText, policySlugPattern, policyThemes } from '../../src/lib/policies.ts';

const order = () => defineField({ name: 'sortOrder', title: 'Display order', type: 'number', initialValue: 0, validation: (rule) => rule.integer().min(0) });
const visible = () => defineField({ name: 'visible', title: 'Visible on website', type: 'boolean', initialValue: true });
const text = (name: string, title: string) => defineField({ name, title, type: 'string', validation: (rule) => rule.required() });

export const client = defineType({ name: 'client', title: 'Client / logo', type: 'document', fields: [
  text('name', 'Company name'),
  defineField({ name: 'logo', title: 'Logo (250 KiB maximum)', type: 'image', options: { sources: [logoSource] },
    validation: (rule) => rule.required().assetRequired().custom((value, context) => validateImage(value, context, 'logo')) }),
  defineField({ name: 'website', title: 'Company website', type: 'url', validation: (rule) => rule.uri({ scheme: ['https'] }) }),
  defineField({ name: 'marquee', title: 'Show in scrolling logo strip', type: 'boolean', initialValue: true }),
  order(), visible(),
], preview: { select: { title: 'name', media: 'logo' } } });

export const testimonial = defineType({ name: 'testimonial', title: 'Testimonial', type: 'document', fields: [
  defineField({ name: 'audience', title: 'Audience', type: 'string', options: { list: ['client', 'candidate'] }, validation: (rule) => rule.required() }),
  text('name', 'Person name'),
  defineField({ name: 'role', title: 'Job title', type: 'string' }),
  defineField({ name: 'quote', title: 'Quote', type: 'text', rows: 7, validation: (rule) => rule.required().max(3000) }),
  defineField({ name: 'client', title: 'Client company / shared logo', type: 'reference', to: [{ type: 'client' }] }),
  order(), visible(),
] });

export const siteSettings = defineType({ name: 'siteSettings', title: 'Public contacts', type: 'document', fields: [
  ...['generalEmail', 'recruitmentEmail', 'franchisingEmail', 'timesheetsEmail'].map((name) => defineField({ name, title: name.replace(/Email$/, ' email'), type: 'string', validation: (rule) => rule.required().email() })),
  text('phone', 'Public company phone'),
  defineField({ name: 'socialLinks', title: 'Social links', type: 'array', of: [{ type: 'object', fields: [text('label', 'Label'), defineField({ name: 'href', title: 'URL', type: 'url', validation: (rule) => rule.required().uri({ scheme: ['https'] }) })] }] }),
] });

export const policy = defineType({ name: 'policy', title: 'Policy page', type: 'document', fields: [
  text('label', 'Footer link label'),
  text('title', 'Page title'),
  defineField({ name: 'slug', title: 'Page URL slug', type: 'slug', options: { source: 'title', maxLength: 96 },
    description: 'Appears after /policies/. Keep published slugs unchanged to preserve existing links.',
    validation: (rule) => rule.required().custom((value) => !value?.current
      || (value.current.length <= 96 && policySlugPattern.test(value.current)) ? true : 'Use lowercase letters, numbers and single hyphens only (up to 96 characters).') }),
  defineField({ name: 'description', title: 'SEO description', type: 'text', rows: 3,
    validation: (rule) => rule.required().max(180).custom((value) => hasPolicyText(value) ? true : 'Enter a policy summary for search results.') }),
  defineField({ name: 'theme', title: 'Cover colour theme', type: 'string', initialValue: 'cocoa',
    options: { list: Object.entries(policyThemes).map(([value, theme]) => ({ title: theme.label, value })) },
    description: 'B-Corp green is reserved for environmental and sustainability policies.',
    validation: (rule) => rule.required().custom((value) => value && Object.hasOwn(policyThemes, value) ? true : 'Choose one of the policy colour themes.') }),
  defineField({ name: 'body', title: 'Policy content (Markdown)', type: 'text', rows: 30,
    description: 'The page title is added automatically. Use ## for section headings, **bold**, - for bullet lists, and 1. for numbered lists. Indent nested lists by four spaces. Raw HTML is not displayed.',
    validation: (rule) => rule.required().custom((value) => hasPolicyText(value) ? true : 'Enter the policy content in Markdown.') }),
  defineField({ name: 'href', title: 'Original PDF link (optional reference)', type: 'url',
    description: 'Retained for reference only. Website footer links now open the policy page, not this PDF.',
    validation: (rule) => rule.custom((value) => {
    if (!value) return true;
    try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'drive.google.com' ? true : 'Use a public HTTPS Google Drive link.'; }
    catch { return 'Enter a valid Google Drive URL.'; }
  }) }),
  order(), visible(),
], preview: { select: { title: 'title', subtitle: 'label' } } });

export const temporaryWork = defineType({ name: 'temporaryWork', title: 'Temporary worker guidance', type: 'document', fields: [
  defineField({ name: 'benefits', title: 'Benefits', type: 'array', validation: (rule) => rule.required().min(1), of: [{ type: 'object', fields: [text('title', 'Title'), defineField({ name: 'text', title: 'Description', type: 'text', validation: (rule) => rule.required().max(3000) })] }] }),
  defineField({ name: 'faqs', title: 'FAQs', type: 'array', validation: (rule) => rule.required().min(1), of: [{ type: 'object', fields: [
    text('question', 'Question'),
    defineField({ name: 'paragraphs', title: 'Answer paragraphs', type: 'array', of: [{ type: 'text' }], validation: (rule) => rule.required().min(1) }),
    defineField({ name: 'contact', title: 'Optional support link', type: 'string', options: { list: [{ title: 'Contact the team', value: 'team' }, { title: 'Timesheet support email', value: 'timesheets' }] } }),
  ] }] }),
] });

export const editorialTypes = [client, testimonial, siteSettings, policy, temporaryWork];