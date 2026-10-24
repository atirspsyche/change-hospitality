export function getSanityConfig(environment?: Record<string, string | undefined>): {
  projectId: string;
  dataset: string;
  apiVersion: string;
  useCdn: boolean;
  perspective: 'published';
};