export interface TeamMember {
  _id: string;
  _type: 'consultant';
  name: string;
  title: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  accent: 'pink' | 'blue' | 'lime' | 'pale';
  note: string;
  signal: string;
  division: TeamDivision;
}

export type TeamDivision =
  | 'Front of House'
  | 'Back of House'
  | 'Events and Management'
  | 'HR & Finance';

export const teamCategories: Array<{
  id: string;
  label: TeamDivision;
  description: string;
  accent: 'flame' | 'mint' | 'citron' | 'blush';
}> = [
  {
    id: 'front-of-house',
    label: 'Front of House',
    description: 'Guest experience, restaurants, clubs and service teams.',
    accent: 'citron',
  },
  {
    id: 'back-of-house',
    label: 'Back of House',
    description: 'Chefs, kitchens, production and every role behind the pass.',
    accent: 'mint',
  },
  {
    id: 'events-and-management',
    label: 'Events and Management',
    description: 'Venues, leadership, launches and commercial hospitality.',
    accent: 'flame',
  },
  {
    id: 'hr-and-finance',
    label: 'HR & Finance',
    description: 'People, culture, operations and hospitality finance.',
    accent: 'blush',
  },
];

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
    division: 'Events and Management',
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
    division: 'Front of House',
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
    division: 'Back of House',
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
    division: 'Events and Management',
  },
];

export const getTeamMemberById = (id: string) =>
  teamMembers.find((member) => member._id === id);

export const teamPassSteps = [
  { label: '01 / Listen', copy: 'The brief is heard properly before anyone is moved.' },
  { label: '02 / Read', copy: 'Culture, pace and pressure are matched to the person.' },
  { label: '03 / Place', copy: 'The introduction lands cleanly, with context on both sides.' },
];

export const teamGalleryItems = [
  { image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=85', text: 'The brief arrives' },
  { image: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=85', text: 'People first' },
  { image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=85', text: 'The room matters' },
  { image: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=1200&q=85', text: 'Kitchen pace' },
  { image: 'https://images.unsplash.com/photo-1559329007-40df8a9345d8?auto=format&fit=crop&w=1200&q=85', text: 'Every detail lands' },
  { image: 'https://images.unsplash.com/photo-1566554273541-37a9ca77b91f?auto=format&fit=crop&w=1200&q=85', text: 'Service feels easy' },
];