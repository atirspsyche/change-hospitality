import { getCliClient } from 'sanity/cli';
import { seedEnvironmentalImpact } from '../data/environmentalImpact';
import { requireImpactNumbers } from '../../src/lib/impactNumbers';

async function seed() {
  const client = getCliClient({ apiVersion: '2026-09-08' }).withConfig({
    useCdn: false,
    perspective: 'published',
  });
  const draft = await client.getDocument(`drafts.${seedEnvironmentalImpact._id}`);
  const published = await client.getDocument(seedEnvironmentalImpact._id);
  if (draft && !published) {
    throw new Error('An Environmental impact draft already exists. Review and publish it in Studio instead of seeding over it.');
  }
  if (!published) {
    await client.createIfNotExists(seedEnvironmentalImpact);
  }

  const content = await client.getDocument<{ _id: string; _type: string; metrics: unknown }>(
    seedEnvironmentalImpact._id,
  );
  if (!content || content._type !== seedEnvironmentalImpact._type) {
    throw new Error('Could not verify the published Environmental impact document.');
  }
  const metrics = requireImpactNumbers(content.metrics);
  console.log(`Verified ${metrics.length} published environmental impact numbers; existing editorial content was preserved.`);
}

seed().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Environmental impact seeding failed.');
  process.exitCode = 1;
});
