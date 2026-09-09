import { defineField, defineType } from 'sanity';

export const job = defineType({
  name: 'job',
  title: 'Job',
  type: 'document',
  fields: [
    defineField({
      name: 'role',
      title: 'Role',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Page URL',
      type: 'slug',
      description: 'Generate this from the role, then keep it stable once the job is live.',
      options: { source: 'role', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'jobId',
      title: 'Job reference',
      type: 'string',
      description: 'The internal reference shown in applications, for example CH-BOH-1048.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'position',
      title: 'Division',
      type: 'string',
      options: {
        list: [
          { title: 'Front of House', value: 'Front of House' },
          { title: 'Back of House', value: 'Back of House' },
          { title: 'Events & Commercial', value: 'Events & Commercial' },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'jobType',
      title: 'Employment type',
      type: 'string',
      options: {
        layout: 'radio',
        list: [
          { title: 'Permanent', value: 'Permanent' },
          { title: 'Temporary', value: 'Temporary' },
          { title: 'Contract', value: 'Contract' },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'salary',
      title: 'Salary',
      type: 'salary',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'consultant',
      title: 'Consultant',
      type: 'reference',
      to: [{ type: 'consultant' }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Listing summary',
      type: 'text',
      rows: 3,
      description: 'Short summary used on job listing cards and in search results.',
      validation: (rule) => rule.required().max(280),
    }),
    defineField({
      name: 'overview',
      title: 'Overview',
      type: 'text',
      rows: 4,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'roleDetails',
      title: 'About the role',
      type: 'text',
      rows: 6,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'responsibilities',
      title: 'Responsibilities',
      type: 'array',
      of: [{ type: 'string' }],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'idealCandidate',
      title: 'Ideal candidate',
      type: 'array',
      of: [{ type: 'string' }],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'offer',
      title: 'What is offered',
      type: 'array',
      of: [{ type: 'string' }],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published date',
      type: 'date',
      initialValue: () => new Date().toISOString().slice(0, 10),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'isNew',
      title: 'Show “New role” label',
      type: 'boolean',
      initialValue: false,
      validation: (rule) => rule.required(),
    }),
  ],
  orderings: [
    {
      title: 'Newest first',
      name: 'publishedAtDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: { title: 'role', location: 'location', type: 'jobType' },
    prepare({ title, location, type }) {
      return { title, subtitle: [location, type].filter(Boolean).join(' · ') };
    },
  },
});