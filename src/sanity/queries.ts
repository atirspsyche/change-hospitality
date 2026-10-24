import type { JobPosting } from '../data/jobs';
import type { OfficeLocation, TeamMember } from '../data/team';
import { requireImpactNumbers } from '../lib/impactNumbers';
import { sanityClient } from './client';
import { buildImage, type SourceImage } from '../lib/sanityImages';
import type { PublicContacts, ClientLogo, Testimonial, PolicyLink, TemporaryWork } from '../data/editorial';

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
    sortOrder
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

export const getPolicyLinks = () => sanityClient.fetch<PolicyLink[]>(
  '*[_type == "policy" && visible != false] | order(sortOrder asc) {_id, label, href}',
);

export async function getPublicContacts(): Promise<PublicContacts> {
  const contacts = await sanityClient.fetch<PublicContacts | null>('*[_type == "siteSettings" && _id == "public-contacts"][0]');
  if (!contacts || ['generalEmail', 'recruitmentEmail', 'franchisingEmail', 'timesheetsEmail', 'phone'].some((field) => !contacts[field as keyof PublicContacts])) {
    throw new Error('Publish the Public contacts document in Sanity before building the website. See studio/README.md.');
  }
  return { ...contacts, socialLinks: contacts.socialLinks || [] };
}

export async function getTemporaryWork(): Promise<TemporaryWork> {
  const content = await sanityClient.fetch<TemporaryWork | null>('*[_type == "temporaryWork" && _id == "temporary-work"][0]');
  if (!content?.benefits?.length || !content?.faqs?.length) throw new Error('Publish Temporary worker guidance in Sanity before building the website.');
  return content;
}