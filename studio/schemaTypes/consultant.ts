import { defineField, defineType } from 'sanity';

const divisions = [
  'Front of House',
  'Back of House',
  'Events and Management',
  'HR & Finance',
];

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
      name: 'division',
      title: 'Division',
      type: 'string',
      options: { list: divisions.map((division) => ({ title: division, value: division })) },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'accent',
      title: 'Profile card colour',
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
    select: { title: 'name', subtitle: 'title', media: 'avatar' },
  },
});