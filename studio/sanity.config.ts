import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './schemaTypes';

export default defineConfig({
  name: 'change-hospitality',
  title: 'Change Hospitality',
  projectId: '3z2hqf8g',
  dataset: 'production',
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.documentTypeListItem('job').title('Jobs'),
            S.documentTypeListItem('consultant').title('Team members'),
            S.documentTypeListItem('location').title('Locations'),
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
    templates: (templates) => templates.filter((template) => template.schemaType !== 'environmentalImpact'),
  },
  document: {
    actions: (actions, context) => context.schemaType === 'environmentalImpact'
      ? actions.filter((action) => action.action !== 'duplicate' && action.action !== 'delete')
      : actions,
  },
});