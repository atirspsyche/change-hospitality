import { defineArrayMember, defineField, defineType, getPublishedId } from 'sanity';
import { validateTeamOrder } from '../lib/teamOrder.ts';

export const location = defineType({
  name: 'location',
  title: 'Location',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name' },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'active',
      title: 'Active office',
      type: 'boolean',
      initialValue: false,
      description: 'Publish with this enabled to show this office on the team page and in the team member location picker.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'isHeadOffice',
      title: 'Head office',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'description',
      title: 'Team introduction',
      type: 'text',
      rows: 2,
      description: 'Optional description under this location on the team page.',
      validation: (rule) => rule.max(180),
    }),
    defineField({
      name: 'teamOrder',
      title: 'Team display order',
      type: 'array',
      description: 'Add published members from this office, then drag into website order, with leadership first. New or unlisted members still appear at the end alphabetically. Publish and rebuild to update the website.',
      options: { layout: 'list', sortable: true },
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'consultant' }],
          options: {
            disableNew: true,
            filter: ({ document }) => ({
              filter: 'location._ref == $locationId',
              params: { locationId: getPublishedId(document._id) },
            }),
          },
        }),
      ],
      validation: (rule) => rule.unique().custom(validateTeamOrder),
    }),
    defineField({
      name: 'sortOrder',
      title: 'Display order',
      type: 'number',
      initialValue: 1000,
      description: 'London, Manchester and Hampshire appear first in that order on the team page. Other offices use this order, then their name.',
      validation: (rule) => rule.integer().min(0),
    }),
  ],
  orderings: [
    { title: 'Name, A-Z', name: 'nameAsc', by: [{ field: 'name', direction: 'asc' }] },
    { title: 'Display order', name: 'displayOrder', by: [{ field: 'sortOrder', direction: 'asc' }, { field: 'name', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'name', active: 'active', isHeadOffice: 'isHeadOffice' },
    prepare({ title, active, isHeadOffice }) {
      return {
        title,
        subtitle: [active ? 'Active' : 'Inactive', isHeadOffice ? 'Head office' : ''].filter(Boolean).join(' / '),
      };
    },
  },
});