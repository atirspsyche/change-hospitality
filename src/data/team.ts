export interface TeamMember {
  name: string;
  title: string;
  handle: string;
  status: string;
  contactText: string;
  avatarUrl?: string;
  miniAvatarUrl?: string;
  accent: 'pink' | 'blue' | 'lime' | 'pale';
  note: string;
  signal: string;
  division: string;
}

export const teamMembers: TeamMember[] = [
  {
    name: 'Sarah Hamilton',
    title: 'Founder & Managing Director',
    handle: 'change-leadership',
    status: 'Twenty years of hospitality relationships',
    contactText: 'Meet Sarah',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=85',
    miniAvatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=180&q=85',
    accent: 'pink',
    note: 'Keeps the agency close to the people, not just the roles.',
    signal: 'Founder energy / calm brief control',
    division: 'Leadership',
  },
  {
    name: 'Amelia Grant',
    title: 'Front of House Consultant',
    handle: 'front-of-house',
    status: 'Restaurants, clubs and guest experience teams',
    contactText: 'Meet Amelia',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=85',
    miniAvatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=180&q=85',
    accent: 'blue',
    note: 'Looks for the small service instincts that make a room feel calm.',
    signal: 'Guest experience / polished pace',
    division: 'Front of House',
  },
  {
    name: 'Marcus Reed',
    title: 'Back of House Consultant',
    handle: 'kitchen-desk',
    status: 'Chefs, kitchen teams and production roles',
    contactText: 'Meet Marcus',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=85',
    miniAvatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=180&q=85',
    accent: 'lime',
    note: 'Understands pressure, pace and the craft behind the pass.',
    signal: 'Kitchen pressure / sharp read',
    division: 'Back of House',
  },
  {
    name: 'Priya Shah',
    title: 'Events & Commercial Consultant',
    handle: 'events-commercial',
    status: 'Venues, launches and commercial hospitality',
    contactText: 'Meet Priya',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85',
    miniAvatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=180&q=85',
    accent: 'pale',
    note: 'Matches high-energy briefs with people who keep the moment composed.',
    signal: 'Event tempo / commercial instinct',
    division: 'Events & Commercial',
  },
];

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