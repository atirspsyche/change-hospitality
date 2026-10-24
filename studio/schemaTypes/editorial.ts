import { defineField, defineType } from 'sanity';
import { logoSource } from '../lib/mediaSources.ts';
import { validateImage } from '../lib/mediaRules.ts';

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

export const policy = defineType({ name: 'policy', title: 'Policy link', type: 'document', fields: [
  text('label', 'Policy title'),
  defineField({ name: 'href', title: 'Public Google Drive link', type: 'url', validation: (rule) => rule.required().custom((value) => {
    if (!value) return true;
    try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'drive.google.com' ? true : 'Use a public HTTPS Google Drive link.'; }
    catch { return 'Enter a valid Google Drive URL.'; }
  }) }),
  order(), visible(),
] });

export const temporaryWork = defineType({ name: 'temporaryWork', title: 'Temporary worker guidance', type: 'document', fields: [
  defineField({ name: 'benefits', title: 'Benefits', type: 'array', validation: (rule) => rule.required().min(1), of: [{ type: 'object', fields: [text('title', 'Title'), defineField({ name: 'text', title: 'Description', type: 'text', validation: (rule) => rule.required().max(3000) })] }] }),
  defineField({ name: 'faqs', title: 'FAQs', type: 'array', validation: (rule) => rule.required().min(1), of: [{ type: 'object', fields: [
    text('question', 'Question'),
    defineField({ name: 'paragraphs', title: 'Answer paragraphs', type: 'array', of: [{ type: 'text' }], validation: (rule) => rule.required().min(1) }),
    defineField({ name: 'contact', title: 'Optional support link', type: 'string', options: { list: [{ title: 'Contact the team', value: 'team' }, { title: 'Timesheet support email', value: 'timesheets' }] } }),
  ] }] }),
] });

export const editorialTypes = [client, testimonial, siteSettings, policy, temporaryWork];