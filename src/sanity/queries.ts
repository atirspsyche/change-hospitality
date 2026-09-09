import type { JobPosting } from '../data/jobs';
import type { TeamMember } from '../data/team';
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
    division
  }
`;

export const getJobs = () => sanityClient.fetch<JobPosting[]>(jobsQuery);

export const getTeamMembers = () =>
  sanityClient.fetch<TeamMember[]>(teamMembersQuery);