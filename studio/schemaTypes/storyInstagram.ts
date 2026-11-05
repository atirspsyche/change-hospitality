import { defineArrayMember, defineField, defineType } from 'sanity';
import { instagramPostCount, isInstagramPostUrl } from '../../src/lib/instagram.ts';
import { instagramSource } from '../lib/mediaSources.ts';
import { validateImage } from '../lib/mediaRules.ts';

export const storyInstagram = defineType({
  name: 'storyInstagram',
  title: 'Our story Instagram',
  type: 'document',
  fields: [
    defineField({
      name: 'posts',
      title: 'Instagram posts',
      description: 'Five moments from Instagram, shown after Jim\'s letter. Drag to reorder, then publish and rebuild the website. The shared profile link comes from Public contacts.',
      type: 'array',
      validation: (rule) => rule.required().min(instagramPostCount).max(instagramPostCount),
      of: [
        defineArrayMember({
          name: 'instagramPost',
          title: 'Instagram post',
          type: 'object',
          fields: [
            defineField({
              name: 'image',
              title: 'Post image (2 MiB maximum)',
              description: 'The full image is shown without automatic cropping. Use crop/hotspot only if you want to change the composition.',
              type: 'image',
              options: { hotspot: true, sources: [instagramSource] },
              validation: (rule) => rule.required().assetRequired().custom((value, context) => validateImage(value, context, 'gallery')),
              fields: [
                defineField({
                  name: 'alt',
                  title: 'Image description',
                  description: 'Describe the photo and any important words shown in the artwork.',
                  type: 'string',
                  validation: (rule) => rule.required().max(300).custom((value) => value?.trim() ? true : 'Describe this image for screen readers.'),
                }),
              ],
            }),
            defineField({
              name: 'caption',
              title: 'Short caption',
              type: 'string',
              validation: (rule) => rule.required().max(160).custom((value) => value?.trim() ? true : 'Add a short caption.'),
            }),
            defineField({
              name: 'postUrl',
              title: 'Instagram post or reel link',
              description: 'Paste the original HTTPS Instagram post/reel URL. Leave empty to open the Instagram profile instead.',
              type: 'url',
              validation: (rule) => rule.custom((value) => value == null || isInstagramPostUrl(value) ? true : 'Use an https://www.instagram.com/p/... or /reel/... link.'),
            }),
          ],
          preview: { select: { title: 'caption', subtitle: 'image.alt', media: 'image' } },
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Off the page. On the feed.' }) },
});
