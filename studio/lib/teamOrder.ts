import { getPublishedId, type ValidationContext } from 'sanity';

interface TeamOrderReference {
  _type: 'reference';
  _ref: string;
}

function isTeamOrderReference(value: unknown): value is TeamOrderReference {
  return typeof value === 'object' && value !== null
    && '_type' in value && value._type === 'reference'
    && '_ref' in value && typeof value._ref === 'string' && value._ref.trim().length > 0;
}

export async function validateTeamOrder(value: unknown, context: ValidationContext): Promise<true | string> {
  if (value === undefined || value === null) return true;
  if (!Array.isArray(value) || !value.every(isTeamOrderReference)) {
    return 'Choose a team member for every entry in Team display order.';
  }
  const ids = value.map((reference) => reference._ref);
  if (new Set(ids).size !== ids.length) return 'Each team member can appear only once in this office order.';
  if (!ids.length) return true;
  if (!context.document?._id) return 'Save this office before choosing its team members.';

  const assignedIds = await context.getClient({ apiVersion: '2026-09-08' }).fetch<string[]>(
    '*[_type == "consultant" && _id in $ids && location._ref == $locationId]._id',
    { ids, locationId: getPublishedId(context.document._id) },
    { perspective: 'published' },
  );
  const assigned = new Set(assignedIds);
  if (ids.some((id) => !assigned.has(id))) {
    return 'Only published team members assigned to this office can be ordered here. Remove missing or moved profiles, or publish their correct office assignment first.';
  }
  return true;
}

export interface TeamOrderLocation {
  _id: string;
  _rev: string;
  name: string;
  teamOrder?: unknown[] | null;
}

export interface TeamOrderMember {
  _id: string;
  name: string;
  location?: { _ref: string } | null;
}

export function getInitialTeamOrders(locations: TeamOrderLocation[], members: TeamOrderMember[]) {
  const draftIds = new Set(locations
    .filter((location) => getPublishedId(location._id) !== location._id)
    .map((location) => getPublishedId(location._id)));

  return locations
    .filter((location) => getPublishedId(location._id) === location._id && location.teamOrder == null)
    .flatMap((location) => {
      const assigned = members
        .filter((member) => getPublishedId(member._id) === member._id && member.location?._ref === location._id)
        .sort((first, second) => first.name.localeCompare(second.name) || first._id.localeCompare(second._id));
      if (!assigned.length) return [];
      if (draftIds.has(getPublishedId(location._id))) {
        throw new Error(`Review and publish the existing draft for ${location.name} before initializing its team order.`);
      }
      return [{
        _id: location._id,
        _rev: location._rev,
        name: location.name,
        teamOrder: assigned.map((member, index) => ({
          _key: `team-${index + 1}`,
          _type: 'reference' as const,
          _ref: member._id,
        })),
      }];
    });
}
