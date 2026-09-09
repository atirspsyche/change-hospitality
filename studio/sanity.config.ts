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
          ]),
    }),
  ],
  schema: {
    types: schemaTypes,
  },
});