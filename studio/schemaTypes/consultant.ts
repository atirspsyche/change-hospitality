import { defineField, defineType } from 'sanity';

export const consultant = defineType({
  name: 'consultant',
  title: 'Team member',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Job title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'email',
      title: 'Email address',
      type: 'string',
      validation: (rule) => rule.required().email(),
    }),
    defineField({
      name: 'phone',
      title: 'Phone number',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'avatar',
      title: 'Portrait',
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative text',
          type: 'string',
          description: 'Describe the portrait for visitors using a screen reader.',
          validation: (rule) => rule.required(),
        }),
      ],
    }),
    defineField({
      name: 'avatarUrl',
      title: 'External portrait URL',
      type: 'url',
      description: 'Optional fallback for imported content. Prefer uploading a portrait above.',
    }),
    defineField({
      name: 'location',
      title: 'Office location',
      type: 'reference',
      to: [{ type: 'location' }],
      description: 'Choose an active office. Manage office availability in Locations.',
      options: { filter: 'active == true', disableNew: true },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'accent',
      title: 'Profile label colour',
      description: 'Colour of the short label over the portrait. All profile cards use a cream background.',
      type: 'string',
      initialValue: 'pink',
      options: {
        layout: 'radio',
        list: [
          { title: 'Pink', value: 'pink' },
          { title: 'Blue', value: 'blue' },
          { title: 'Lime', value: 'lime' },
          { title: 'Pale green', value: 'pale' },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'signal',
      title: 'Card label',
      type: 'string',
      description: 'Short specialism shown over the portrait.',
      validation: (rule) => rule.required().max(60),
    }),
    defineField({
      name: 'note',
      title: 'Profile note',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required().max(180),
    }),
  ],
  orderings: [
    {
      title: 'Name, A-Z',
      name: 'nameAsc',
      by: [{ field: 'name', direction: 'asc' }],
    },
  ],
  preview: {
    select: { title: 'name', jobTitle: 'title', location: 'location.name', media: 'avatar' },
    prepare({ title, jobTitle, location, media }) {
      return {
        title,
        subtitle: [jobTitle, location || 'Location required'].filter(Boolean).join(' / '),
        media,
      };
    },
  },
});