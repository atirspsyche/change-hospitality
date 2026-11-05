import type { JobPosting } from '../data/jobs';
import type { OfficeLocation, TeamMember } from '../data/team';
import { requireImpactNumbers } from '../lib/impactNumbers';
import { requireInstagramPosts } from '../lib/instagram';
import { franchiseMapPositions, requireFranchiseLocations, type FranchiseOfficeContent } from '../data/franchiseLocations';
import { sanityClient } from './client';
import { buildImage, type SourceImage } from '../lib/sanityImages';
import type { PublicContacts, ClientLogo, CandidatePhoto, InstagramPost, Testimonial, TemporaryWork } from '../data/editorial';
import { policyHref, requirePolicies, type PolicyLink } from '../lib/policies';

const jobsQuery = `
  *[_type == "job" && defined(slug.current)] | order(publishedAt desc) {
    _id,
    _type,
    slug,
    jobId,
    role,
    position,
    jobType,
    location,
    salary,
    consultant,
    description,
    overview,
    roleDetails,
    responsibilities,
    idealCandidate,
    offer,
    publishedAt,
    isNew
  }
`;

const teamMembersQuery = `
  *[_type == "consultant"] | order(name asc) {
    _id,
    _type,
    name,
    title,
    email,
    phone,
    avatar{alt, crop, hotspot, asset->{_id, url, metadata{dimensions}}},
    accent,
    note,
    summary,
    signal,
    "location": location->{_id, name}
  }
`;

const activeLocationsQuery = `
  *[_type == "location" && active == true && defined(slug.current)] {
    _id,
    name,
    slug,
    active,
    isHeadOffice,
    description,
    sortOrder,
    "teamOrder": teamOrder[]._ref
  }
`;

const impactNumbersQuery = `
  *[_type == "environmentalImpact" && _id == "environmental-impact"][0].metrics[] {
    number,
    label,
    unit,
    shape
  }
`;

export const getJobs = () => sanityClient.fetch<JobPosting[]>(jobsQuery);

export const getTeamMembers = async (): Promise<TeamMember[]> => {
  const members = await sanityClient.fetch<Array<TeamMember & { avatar?: SourceImage }>>(teamMembersQuery);
  return Promise.all(members.map(async ({ avatar, ...member }) => {
    const image = await buildImage(avatar, 'portrait');
    return { ...member, avatarUrl: image?.src, avatarSrcSet: image?.srcSet, avatarAlt: avatar?.alt || `${member.name} portrait`, shareImageUrl: image?.shareSrc };
  }));
};

export const getActiveLocations = () =>
  sanityClient.fetch<OfficeLocation[]>(activeLocationsQuery);

export const getFranchiseLocations = async () =>
  requireFranchiseLocations(await sanityClient.fetch<FranchiseOfficeContent[]>(
    '*[_type == "location" && _id in $ids] {_id, name, isHeadOffice, address, phone}',
    { ids: franchiseMapPositions.map(({ id }) => id) },
    { perspective: 'published' },
  ));

export const getImpactNumbers = async () =>
  requireImpactNumbers(await sanityClient.fetch<unknown>(
    impactNumbersQuery,
    {},
    { perspective: 'published' },
  ));

const imageProjection = '{alt, asset->{_id, url, metadata{dimensions}}}';
export async function getClientLogos(): Promise<ClientLogo[]> {
  const clients = await sanityClient.fetch<Array<Omit<ClientLogo, 'logo'> & { logo?: SourceImage }>>(
    `*[_type == "client" && visible != false] | order(sortOrder asc, name asc) {_id, name, marquee, logo${imageProjection}}`,
  );
  return Promise.all(clients.map(async ({ logo, ...client }) => ({ ...client, logo: await buildImage(logo, 'logo') })));
}

export async function getTestimonials(audience: 'client' | 'candidate'): Promise<Testimonial[]> {
  const entries = await sanityClient.fetch<Array<Omit<Testimonial, 'client'> & { client?: Omit<ClientLogo, 'logo'> & { logo?: SourceImage } }>>(
    `*[_type == "testimonial" && audience == $audience && visible != false] | order(sortOrder asc) {_id, name, role, quote, client->{_id, name, logo${imageProjection}}}`, { audience },
  );
  return Promise.all(entries.map(async ({ client, ...entry }) => ({ ...entry, client: client ? { ...client, logo: await buildImage(client.logo, 'logo') } : undefined })));
}

export const getPolicies = async () => requirePolicies(await sanityClient.fetch<unknown>(
  '*[_type == "policy" && visible != false] | order(sortOrder asc, label asc) {_id, label, title, slug, description, theme, body}',
  {},
  { perspective: 'published' },
));

export async function getPolicyLinks(): Promise<PolicyLink[]> {
  return (await getPolicies()).map(({ _id, label, slug }) => ({
    _id, label, slug: slug.current, href: policyHref(slug.current),
  }));
}

export async function getCandidateGallery(): Promise<CandidatePhoto[]> {
  const photos = await sanityClient.fetch<Array<SourceImage & { _key: string }> | null>(
    '*[_type == "candidateGallery" && _id == "candidate-gallery"][0].photos[]{_key, alt, crop, hotspot, asset->{_id, url, metadata{dimensions}}}',
  );
  if (!photos?.length || photos.length > 6) {
    throw new Error('Publish Candidate gallery in Sanity with between one and six photos before building the website.');
  }
  return Promise.all(photos.map(async (photo) => {
    if (!photo._key || !photo.alt?.trim()) throw new Error('Every Candidate gallery photo needs a key and descriptive alt text.');
    const image = await buildImage(photo, 'gallery');
    if (!image) throw new Error(`Candidate gallery photo "${photo._key}" has no published image asset.`);
    return { key: photo._key, alt: photo.alt.trim(), image };
  }));
}

export async function getPublicContacts(): Promise<PublicContacts> {
  const contacts = await sanityClient.fetch<PublicContacts | null>('*[_type == "siteSettings" && _id == "public-contacts"][0]');
  if (!contacts || ['generalEmail', 'recruitmentEmail', 'franchisingEmail', 'timesheetsEmail', 'phone'].some((field) => !contacts[field as keyof PublicContacts])) {
    throw new Error('Publish the Public contacts document in Sanity before building the website. See studio/README.md.');
  }
  return { ...contacts, socialLinks: contacts.socialLinks || [] };
}

export async function getStoryInstagramPosts(): Promise<InstagramPost[]> {
  const posts = requireInstagramPosts(await sanityClient.fetch<Array<{
    _key: string; caption: string; postUrl?: string | null; image: SourceImage & { alt: string };
  }> | null>(
    '*[_type == "storyInstagram" && _id == "story-instagram"][0].posts[]{_key, caption, postUrl, image{alt, crop, hotspot, asset->{_id, url, metadata{dimensions}}}}',
    {},
    { perspective: 'published' },
  ));
  return Promise.all(posts.map(async ({ _key, caption, postUrl, image: source }) => {
    const image = await buildImage(source, 'instagram');
    if (!image) throw new Error(`Our story Instagram post "${_key}" has no published image asset.`);
    return { key: _key, caption: caption.trim(), postUrl: postUrl ?? undefined, alt: source.alt.trim(), image };
  }));
}

export async function getTemporaryWork(): Promise<TemporaryWork> {
  const content = await sanityClient.fetch<TemporaryWork | null>('*[_type == "temporaryWork" && _id == "temporary-work"][0]');
  if (!content?.benefits?.length || !content?.faqs?.length) throw new Error('Publish Temporary worker guidance in Sanity before building the website.');
  return content;
}