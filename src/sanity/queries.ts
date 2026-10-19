import type { JobPosting } from '../data/jobs';
import type { OfficeLocation, TeamMember } from '../data/team';
import { requireImpactNumbers } from '../lib/impactNumbers';
import { sanityClient } from './client';

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
    "avatarUrl": coalesce(avatar.asset->url, avatarUrl),
    accent,
    note,
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

export const getTeamMembers = () =>
  sanityClient.fetch<TeamMember[]>(teamMembersQuery);

export const getActiveLocations = () =>
  sanityClient.fetch<OfficeLocation[]>(activeLocationsQuery);

export const getImpactNumbers = async () =>
  requireImpactNumbers(await sanityClient.fetch<unknown>(
    impactNumbersQuery,
    {},
    { perspective: 'published' },
  ));