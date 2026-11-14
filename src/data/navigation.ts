interface SiteLink {
  label: string;
  href: string;
  meta: string;
  footerLabel?: string;
}

export const siteLinks: readonly SiteLink[] = [
  { label: 'Home', href: '/', meta: 'Back to the start' },
  { label: 'Jobs', href: '/jobs/', meta: 'Find your next role' },
  { label: 'Recruit', href: '/recruit-talent/', meta: 'Build your team' },
  { label: 'Team', href: '/team/', meta: 'Meet the team' },
  { label: 'Our Story', footerLabel: 'Our story', href: '/our-story/', meta: 'How it all started' },
  { label: 'Franchising', href: '/franchising/', meta: 'Build your own future' },
  { label: 'Sustainability', href: '/environmental-policy/', meta: 'People & planet' },
];
