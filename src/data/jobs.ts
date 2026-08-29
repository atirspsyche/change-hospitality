export type JobType = 'Permanent' | 'Temporary' | 'Contract';
export type JobPosition =
  | 'Front of House'
  | 'Back of House'
  | 'Events & Commercial';

export interface JobSalary {
  display: string;
  currency: 'GBP';
  unit: 'year' | 'hour';
  min?: number;
  max?: number;
}

export interface SanityReference {
  _type: 'reference';
  _ref: string;
}

export interface JobPosting {
  _id: string;
  _type: 'job';
  slug: { current: string };
  jobId: string;
  role: string;
  position: JobPosition;
  jobType: JobType;
  location: string;
  salary: JobSalary;
  consultant: SanityReference;
  description: string;
  overview: string;
  roleDetails: string;
  responsibilities: string[];
  idealCandidate: string[];
  offer: string[];
  publishedAt: string;
  isNew: boolean;
}

type JobSeed = Omit<
  JobPosting,
  'overview' | 'roleDetails' | 'responsibilities' | 'idealCandidate' | 'offer'
>;

const jobSeeds: JobSeed[] = [
  {
    _id: 'job-senior-sous-chef-mayfair',
    _type: 'job',
    slug: { current: 'senior-sous-chef-mayfair' },
    jobId: 'CH-BOH-1048',
    role: 'Senior Sous Chef',
    position: 'Back of House',
    jobType: 'Permanent',
    location: 'Mayfair, London',
    salary: { display: '£48k-£55k', currency: 'GBP', unit: 'year', min: 48000, max: 55000 },
    consultant: { _type: 'reference', _ref: 'consultant-marcus-reed' },
    description:
      'Lead a confident brigade in a modern British kitchen where produce, pace and generous hospitality carry equal weight.',
    publishedAt: '2026-08-28',
    isNew: true,
  },
  {
    _id: 'job-members-club-manager-soho',
    _type: 'job',
    slug: { current: 'members-club-manager-soho' },
    jobId: 'CH-FOH-1047',
    role: 'Private Members Club Manager',
    position: 'Front of House',
    jobType: 'Permanent',
    location: 'Soho, London',
    salary: { display: '£42k-£50k', currency: 'GBP', unit: 'year', min: 42000, max: 50000 },
    consultant: { _type: 'reference', _ref: 'consultant-amelia-grant' },
    description:
      'Shape the daily rhythm of a lively private members club, leading a polished team and building genuine relationships with every guest.',
    publishedAt: '2026-08-27',
    isNew: true,
  },
  {
    _id: 'job-events-operations-lead-central-london',
    _type: 'job',
    slug: { current: 'events-operations-lead-central-london' },
    jobId: 'CH-EVT-1046',
    role: 'Events Operations Lead',
    position: 'Events & Commercial',
    jobType: 'Contract',
    location: 'Central London',
    salary: { display: '£45k pro rata', currency: 'GBP', unit: 'year', min: 45000 },
    consultant: { _type: 'reference', _ref: 'consultant-priya-shah' },
    description:
      'Own the operational detail behind a calendar of high-profile dinners, launches and celebrations for a landmark London venue.',
    publishedAt: '2026-08-26',
    isNew: true,
  },
  {
    _id: 'job-head-barista-shoreditch',
    _type: 'job',
    slug: { current: 'head-barista-shoreditch' },
    jobId: 'CH-FOH-1045',
    role: 'Head Barista',
    position: 'Front of House',
    jobType: 'Permanent',
    location: 'Shoreditch, London',
    salary: { display: '£34k', currency: 'GBP', unit: 'year', min: 34000 },
    consultant: { _type: 'reference', _ref: 'consultant-amelia-grant' },
    description:
      'Set the standard for coffee, coaching and warm service in a design-led neighbourhood restaurant with a loyal local crowd.',
    publishedAt: '2026-08-25',
    isNew: false,
  },
  {
    _id: 'job-event-chef-de-partie-wembley',
    _type: 'job',
    slug: { current: 'event-chef-de-partie-wembley' },
    jobId: 'CH-BOH-1044',
    role: 'Event Chef de Partie',
    position: 'Back of House',
    jobType: 'Temporary',
    location: 'Wembley, London',
    salary: { display: '£18-£21 per hour', currency: 'GBP', unit: 'hour', min: 18, max: 21 },
    consultant: { _type: 'reference', _ref: 'consultant-marcus-reed' },
    description:
      'Join an experienced event brigade delivering consistent, beautifully finished plates across premium match days and live events.',
    publishedAt: '2026-08-24',
    isNew: false,
  },
  {
    _id: 'job-commercial-sales-manager-hybrid',
    _type: 'job',
    slug: { current: 'commercial-sales-manager-hybrid' },
    jobId: 'CH-EVT-1043',
    role: 'Commercial Sales Manager',
    position: 'Events & Commercial',
    jobType: 'Permanent',
    location: 'Hybrid, London',
    salary: { display: '£45k + bonus', currency: 'GBP', unit: 'year', min: 45000 },
    consultant: { _type: 'reference', _ref: 'consultant-priya-shah' },
    description:
      'Grow a strong venue portfolio through thoughtful partnerships, commercially sharp proposals and a natural understanding of hospitality.',
    publishedAt: '2026-08-22',
    isNew: false,
  },
  {
    _id: 'job-restaurant-supervisor-kings-cross',
    _type: 'job',
    slug: { current: 'restaurant-supervisor-kings-cross' },
    jobId: 'CH-FOH-1042',
    role: 'Restaurant Supervisor',
    position: 'Front of House',
    jobType: 'Permanent',
    location: "King's Cross, London",
    salary: { display: '£32k-£36k', currency: 'GBP', unit: 'year', min: 32000, max: 36000 },
    consultant: { _type: 'reference', _ref: 'consultant-amelia-grant' },
    description:
      'Bring calm, upbeat leadership to a busy all-day dining room known for attentive service, confident flavours and an easy atmosphere.',
    publishedAt: '2026-08-20',
    isNew: false,
  },
  {
    _id: 'job-pastry-chef-de-partie-marylebone',
    _type: 'job',
    slug: { current: 'pastry-chef-de-partie-marylebone' },
    jobId: 'CH-BOH-1041',
    role: 'Pastry Chef de Partie',
    position: 'Back of House',
    jobType: 'Permanent',
    location: 'Marylebone, London',
    salary: { display: '£38k-£42k', currency: 'GBP', unit: 'year', min: 38000, max: 42000 },
    consultant: { _type: 'reference', _ref: 'consultant-marcus-reed' },
    description:
      'Create precise seasonal desserts with an ambitious pastry team inside one of London’s most admired independent restaurants.',
    publishedAt: '2026-08-19',
    isNew: false,
  },
  {
    _id: 'job-banquet-manager-city-of-london',
    _type: 'job',
    slug: { current: 'banquet-manager-city-of-london' },
    jobId: 'CH-EVT-1040',
    role: 'Banqueting Manager',
    position: 'Events & Commercial',
    jobType: 'Contract',
    location: 'City of London',
    salary: { display: '£42k pro rata', currency: 'GBP', unit: 'year', min: 42000 },
    consultant: { _type: 'reference', _ref: 'consultant-priya-shah' },
    description:
      'Lead service delivery for large-scale corporate events, making complex room turns and exacting guest expectations feel effortless.',
    publishedAt: '2026-08-17',
    isNew: false,
  },
  {
    _id: 'job-relief-chef-greater-london',
    _type: 'job',
    slug: { current: 'relief-chef-greater-london' },
    jobId: 'CH-BOH-1039',
    role: 'Relief Chef',
    position: 'Back of House',
    jobType: 'Temporary',
    location: 'Greater London',
    salary: { display: '£17-£22 per hour', currency: 'GBP', unit: 'hour', min: 17, max: 22 },
    consultant: { _type: 'reference', _ref: 'consultant-marcus-reed' },
    description:
      'Work flexibly across a trusted collection of restaurants, hotels and event kitchens with weekly bookings that fit your availability.',
    publishedAt: '2026-08-15',
    isNew: false,
  },
  {
    _id: 'job-guest-relations-host-knightsbridge',
    _type: 'job',
    slug: { current: 'guest-relations-host-knightsbridge' },
    jobId: 'CH-FOH-1038',
    role: 'Guest Relations Host',
    position: 'Front of House',
    jobType: 'Temporary',
    location: 'Knightsbridge, London',
    salary: { display: '£15-£17 per hour', currency: 'GBP', unit: 'hour', min: 15, max: 17 },
    consultant: { _type: 'reference', _ref: 'consultant-amelia-grant' },
    description:
      'Be the first point of welcome for an international guest list, bringing warmth, discretion and quick judgement to every shift.',
    publishedAt: '2026-08-14',
    isNew: false,
  },
  {
    _id: 'job-event-sales-coordinator-richmond',
    _type: 'job',
    slug: { current: 'event-sales-coordinator-richmond' },
    jobId: 'CH-EVT-1037',
    role: 'Event Sales Coordinator',
    position: 'Events & Commercial',
    jobType: 'Permanent',
    location: 'Richmond, London',
    salary: { display: '£30k-£34k', currency: 'GBP', unit: 'year', min: 30000, max: 34000 },
    consultant: { _type: 'reference', _ref: 'consultant-priya-shah' },
    description:
      'Turn enquiries into memorable occasions by supporting clients from first conversation through to a clear and thoughtful handover.',
    publishedAt: '2026-08-12',
    isNew: false,
  },
];

const detailsByPosition: Record<
  JobPosition,
  Pick<JobPosting, 'responsibilities' | 'idealCandidate'>
> = {
  'Front of House': {
    responsibilities: [
      'Set a warm, confident tone for guests from arrival to departure.',
      'Keep service moving smoothly while protecting the detail that makes it feel personal.',
      'Support the wider team with clear communication before, during and after service.',
    ],
    idealCandidate: [
      'Recent experience in a quality-led hospitality environment.',
      'A natural eye for detail and calm judgement during busy services.',
      'Clear communication and a genuinely people-first approach.',
    ],
  },
  'Back of House': {
    responsibilities: [
      'Deliver consistent preparation and presentation throughout every service.',
      'Work cleanly and collaboratively while maintaining excellent kitchen standards.',
      'Contribute ideas, organisation and positive energy to the wider brigade.',
    ],
    idealCandidate: [
      'Strong experience in a quality-led professional kitchen.',
      'Excellent organisation, technical foundations and attention to detail.',
      'A composed, team-minded approach when the pace increases.',
    ],
  },
  'Events & Commercial': {
    responsibilities: [
      'Own the detail from initial brief through to a confident delivery.',
      'Build clear relationships with clients, suppliers and operational teams.',
      'Keep commercial priorities and the guest experience moving together.',
    ],
    idealCandidate: [
      'Relevant experience in events, venues or commercial hospitality.',
      'Confident planning skills and a practical response to changing priorities.',
      'Strong written communication and an instinct for lasting relationships.',
    ],
  },
};

const offerByType: Record<JobType, string[]> = {
  Permanent: [
    'A permanent position with clear scope to develop and take ownership.',
    'A supportive team that values good judgement and hospitality experience.',
    'Competitive pay and benefits appropriate to the role.',
  ],
  Temporary: [
    'Flexible bookings shaped around your availability.',
    'Weekly pay and support from a consultant who knows your working preferences.',
    'Access to a varied network of respected hospitality businesses.',
  ],
  Contract: [
    'A defined brief with clear ownership and measurable goals.',
    'Direct support from the hiring team throughout the assignment.',
    'Competitive contract terms appropriate to the role.',
  ],
};

export const jobs: JobPosting[] = jobSeeds.map((job) => ({
  ...job,
  overview: job.description,
  roleDetails: `As ${job.role}, you will join a hospitality team that cares about standards without losing the human side of service. This is a hands-on role with room to make a visible contribution from the start.`,
  ...detailsByPosition[job.position],
  offer: offerByType[job.jobType],
}));

export const getJobBySlug = (slug: string) =>
  jobs.find((job) => job.slug.current === slug);