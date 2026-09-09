import { defineField, defineType } from 'sanity';

export const salary = defineType({
  name: 'salary',
  title: 'Salary',
  type: 'object',
  fields: [
    defineField({
      name: 'display',
      title: 'Display salary',
      type: 'string',
      description: 'The candidate-facing value, for example £45k-£50k + bonus.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'currency',
      title: 'Currency',
      type: 'string',
      initialValue: 'GBP',
      options: { list: [{ title: 'GBP (£)', value: 'GBP' }] },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'unit',
      title: 'Pay period',
      type: 'string',
      options: {
        layout: 'radio',
        list: [
          { title: 'Per year', value: 'year' },
          { title: 'Per hour', value: 'hour' },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'min',
      title: 'Minimum salary',
      type: 'number',
      description: 'Enter the full annual amount or hourly rate without a currency symbol.',
      validation: (rule) => rule.min(0),
    }),
    defineField({
      name: 'max',
      title: 'Maximum salary',
      type: 'number',
      description: 'Optional. Leave blank when the role has a single salary value.',
      validation: (rule) => rule.min(0),
    }),
  ],
  preview: {
    select: { title: 'display', subtitle: 'unit' },
  },
});