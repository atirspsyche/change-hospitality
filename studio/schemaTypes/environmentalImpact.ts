import { defineArrayMember, defineField, defineType } from 'sanity';

export const environmentalImpact = defineType({
  name: 'environmentalImpact',
  title: 'Environmental impact',
  type: 'document',
  fields: [
    defineField({
      name: 'metrics',
      title: 'Impact numbers',
      description: 'Shown under "To date" on Sustainability & Impact. Drag entries to change their display order.',
      type: 'array',
      validation: (rule) => rule.required().min(1),
      of: [
        defineArrayMember({
          name: 'impactNumber',
          title: 'Impact number',
          type: 'object',
          fields: [
            defineField({
              name: 'number',
              title: 'Display value',
              type: 'string',
              description: 'Use the exact display format, for example 498, 3.09 or 20,000+.',
              validation: (rule) => rule.required().regex(/\S/, { name: 'non-blank text' }),
            }),
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              description: 'For example, trees funded or carbon avoidance.',
              validation: (rule) => rule.required().regex(/\S/, { name: 'non-blank text' }),
            }),
            defineField({
              name: 'unit',
              title: 'Unit',
              type: 'string',
              description: 'Optional unit displayed below the value, for example tCO\u2082e or m\u00b2.',
            }),
            defineField({
              name: 'shape',
              title: 'Card shape',
              type: 'string',
              options: {
                list: [
                  { title: 'Tree', value: 'tree' },
                  { title: 'Round', value: 'round' },
                  { title: 'Soft', value: 'soft' },
                ],
                layout: 'radio',
              },
              initialValue: 'round',
              validation: (rule) => rule.required().custom((value) =>
                value === 'tree' || value === 'round' || value === 'soft'
                  ? true
                  : 'Choose a tree, round or soft shape.',
              ),
            }),
          ],
          preview: {
            select: { number: 'number', unit: 'unit', label: 'label' },
            prepare({ number, unit, label }) {
              return { title: [number, unit].filter(Boolean).join(' '), subtitle: label };
            },
          },
        }),
      ],
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Environmental impact', subtitle: 'Sustainability & Impact / To date' };
    },
  },
});
