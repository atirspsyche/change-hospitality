import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './schemaTypes';
import { getSanityConfig } from '../server/sanity-config.js';

export default defineConfig({
  name: 'change-hospitality',
  title: 'Change Hospitality',
  form: { image: { directUploads: false } },
  ...getSanityConfig({
    SANITY_PROJECT_ID: process.env.SANITY_STUDIO_PROJECT_ID,
    SANITY_DATASET: process.env.SANITY_STUDIO_DATASET,
  }),
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.documentTypeListItem('job').title('Jobs'),
            S.documentTypeListItem('consultant').title('Team members'),
            S.documentTypeListItem('location').title('Locations'),
            S.documentTypeListItem('client').title('Client logos'),
            S.documentTypeListItem('testimonial').title('Testimonials'),
            S.documentTypeListItem('policy').title('Policy links'),
            ...[['siteSettings', 'public-contacts', 'Public contacts'], ['temporaryWork', 'temporary-work', 'Temporary worker guidance']].map(([type, id, title]) =>
              S.listItem().id(id).title(title).child(S.document().schemaType(type).documentId(id))),
            S.listItem()
              .id('environmental-impact')
              .title('Environmental impact')
              .child(
                S.document()
                  .schemaType('environmentalImpact')
                  .documentId('environmental-impact'),
              ),
          ]),
    }),
  ],
  schema: {
    types: schemaTypes,
    templates: (templates) => templates.filter((template) => !['environmentalImpact', 'siteSettings', 'temporaryWork'].includes(template.schemaType)),
  },
  document: {
    actions: (actions, context) => ['environmentalImpact', 'siteSettings', 'temporaryWork'].includes(context.schemaType)
      ? actions.filter((action) => action.action !== 'duplicate' && action.action !== 'delete')
      : actions,
  },
});