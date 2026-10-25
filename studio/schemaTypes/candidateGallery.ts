import { defineArrayMember, defineField, defineType } from 'sanity';
import { gallerySource } from '../lib/mediaSources.ts';
import { validateImage } from '../lib/mediaRules.ts';

export const candidateGallery = defineType({
  name: 'candidateGallery',
  title: 'Candidate gallery',
  type: 'document',
  fields: [
    defineField({
      name: 'photos',
      title: 'Candidate photos',
      description: 'Real people at work and with their teams. Use approved photos only; drag to reorder. Publish and rebuild the website to update the Jobs page.',
      type: 'array',
      validation: (rule) => rule.required().min(1).max(6),
      of: [
        defineArrayMember({
          type: 'image',
          title: 'Candidate photo (2 MiB maximum)',
          options: { hotspot: true, sources: [gallerySource] },
          validation: (rule) => rule.required().assetRequired().custom((value, context) => validateImage(value, context, 'gallery')),
          fields: [
            defineField({
              name: 'alt',
              title: 'Image description',
              description: 'Describe what is visible. Do not invent names, placement stories or venue details.',
              type: 'string',
              validation: (rule) => rule.required().max(300).custom((value) => value?.trim() ? true : 'Describe this photo for screen readers.'),
            }),
          ],
          preview: { select: { title: 'alt', media: 'asset' } },
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'People behind the placements' }) },
});
