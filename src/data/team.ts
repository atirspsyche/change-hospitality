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
}

const teamOfficeOrder: readonly string[] = ['london', 'manchester', 'hampshire'];

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
    .map((location, index) => ({
      id: location.slug.current,
      label: location.name,
      isHeadOffice: location.isHeadOffice,
      description: location.description || (location.isHeadOffice
        ? `Our head office and the people behind our ${location.name} team.`
        : `Meet the hospitality specialists in our ${location.name} team.`),
      accent: accents[index % accents.length],
      members: members.filter((member) => member.location?._id === location._id),
    }));
};

export const teamMembers: TeamMember[] = [
  {
    _id: 'consultant-isha-more',
    _type: 'consultant',
    name: 'Isha More',
    title: 'Founder & Managing Director',
    email: 'isha@changehospitality.co.uk',
    phone: '020 8050 6312',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=85',
    accent: 'pink',
    note: 'Keeps the agency close to the people, not just the roles.',
    signal: 'Founder energy / calm brief control',
    location: { _id: 'location-london', name: 'London' },
  },
  {
    _id: 'consultant-amelia-grant',
    _type: 'consultant',
    name: 'Amelia Grant',
    title: 'Front of House Consultant',
    email: 'amelia@changehospitality.co.uk',
    phone: '020 8050 6312',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=85',
    accent: 'blue',
    note: 'Looks for the small service instincts that make a room feel calm.',
    signal: 'Guest experience / polished pace',
    location: { _id: 'location-london', name: 'London' },
  },
  {
    _id: 'consultant-marcus-reed',
    _type: 'consultant',
    name: 'Marcus Reed',
    title: 'Back of House Consultant',
    email: 'marcus@changehospitality.co.uk',
    phone: '020 8050 6312',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=85',
    accent: 'blue',
    note: 'Understands pressure, pace and the craft behind the pass.',
    signal: 'Kitchen pressure / sharp read',
    location: { _id: 'location-hampshire', name: 'Hampshire' },
  },
  {
    _id: 'consultant-priya-shah',
    _type: 'consultant',
    name: 'Priya Shah',
    title: 'Events & Commercial Consultant',
    email: 'priya@changehospitality.co.uk',
    phone: '020 8050 6312',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85',
    accent: 'pink',
    note: 'Matches high-energy briefs with people who keep the moment composed.',
    signal: 'Event tempo / commercial instinct',
    location: { _id: 'location-manchester', name: 'Manchester' },
  },
];

export const getTeamMemberById = (id: string) =>
  teamMembers.find((member) => member._id === id);

export const teamPassSteps = [
  { label: '01 / Listen', copy: 'The brief is heard properly before anyone is moved.' },
  { label: '02 / Read', copy: 'Culture, pace and pressure are matched to the person.' },
  { label: '03 / Place', copy: 'The introduction lands cleanly, with context on both sides.' },
];