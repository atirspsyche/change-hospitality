export interface TeamMember {
  _id: string;
  _type: 'consultant';
  name: string;
  title: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  avatarSrcSet?: string;
  avatarAlt?: string;
  shareImageUrl?: string;
  summary?: string;
  accent: 'pink' | 'blue' | 'lime' | 'pale';
  note: string;
  signal: string;
  location: { _id: string; name: string } | null;
}

export interface OfficeLocation {
  _id: string;
  name: string;
  slug: { current: string };
  active: boolean;
  isHeadOffice?: boolean;
  description?: string;
  sortOrder?: number;
  teamOrder?: string[] | null;
}

const teamOfficeOrder: readonly string[] = ['london', 'manchester', 'hampshire'];

export const teamPageSize = 8;

export const getTeamPageItems = (
  currentPage: number,
  pageCount: number,
): Array<number | 'start-ellipsis' | 'end-ellipsis'> => {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 'end-ellipsis', pageCount];
  }
  if (currentPage >= pageCount - 3) {
    return [1, 'start-ellipsis', pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1, pageCount];
  }
  return [1, 'start-ellipsis', currentPage - 1, currentPage, currentPage + 1, 'end-ellipsis', pageCount];
};

export const getTeamGroups = (locations: OfficeLocation[], members: TeamMember[]) => {
  const accents = ['mint', 'flame', 'blush', 'citron'] as const;
  return locations
    .filter((location) => location.active && location.slug?.current)
    .sort((first, second) => {
      const firstIndex = teamOfficeOrder.indexOf(first.slug.current);
      const secondIndex = teamOfficeOrder.indexOf(second.slug.current);
      const firstPriority = firstIndex === -1 ? teamOfficeOrder.length : firstIndex;
      const secondPriority = secondIndex === -1 ? teamOfficeOrder.length : secondIndex;

      return firstPriority - secondPriority
        || (first.sortOrder ?? 1000) - (second.sortOrder ?? 1000)
        || first.name.localeCompare(second.name);
    })
    .map((location, index) => {
      const order = location.teamOrder ?? [];
      const ranks = new Map<string, number>();
      order.forEach((id, rank) => {
        if (!ranks.has(id)) ranks.set(id, rank);
      });
      return {
        id: location.slug.current,
        label: location.name,
        isHeadOffice: location.isHeadOffice,
        description: location.description || (location.isHeadOffice
          ? `Our head office and the people behind our ${location.name} team.`
          : `Meet the hospitality specialists in our ${location.name} team.`),
        accent: accents[index % accents.length],
        members: members
          .filter((member) => member.location?._id === location._id)
          .sort((first, second) => (ranks.get(first._id) ?? order.length) - (ranks.get(second._id) ?? order.length)
            || first.name.localeCompare(second.name) || first._id.localeCompare(second._id)),
      };
    });
};
