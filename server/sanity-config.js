export function getSanityConfig(environment = {}) {
  const projectId = environment.SANITY_PROJECT_ID || 'thyjjqzv';
  const dataset = environment.SANITY_DATASET || 'production';
  if (!/^[a-z0-9]+$/.test(projectId) || !/^[a-z0-9][a-z0-9_-]*$/.test(dataset)) {
    throw new Error('Invalid SANITY_PROJECT_ID or SANITY_DATASET configuration.');
  }
  return { projectId, dataset, apiVersion: '2026-09-08', useCdn: false, perspective: 'published' };
}