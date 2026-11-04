export const englishCities = [
  'Bath',
  'Birmingham',
  'Bradford',
  'Brighton & Hove',
  'Bristol',
  'Cambridge',
  'Canterbury',
  'Carlisle',
  'Chelmsford',
  'Chester',
  'Chichester',
  'Colchester',
  'Coventry',
  'Derby',
  'Doncaster',
  'Durham',
  'Ely',
  'Exeter',
  'Gloucester',
  'Hereford',
  'Kingston-upon-Hull',
  'Lancaster',
  'Leeds',
  'Leicester',
  'Lichfield',
  'Lincoln',
  'Liverpool',
  'London',
  'Manchester',
  'Milton Keynes',
  'Newcastle-upon-Tyne',
  'Norwich',
  'Nottingham',
  'Oxford',
  'Peterborough',
  'Plymouth',
  'Portsmouth',
  'Preston',
  'Ripon',
  'Salford',
  'Salisbury',
  'Sheffield',
  'Southampton',
  'Southend-on-Sea',
  'St Albans',
  'Stoke on Trent',
  'Sunderland',
  'Truro',
  'Wakefield',
  'Wells',
  'Westminster',
  'Winchester',
  'Wolverhampton',
  'Worcester',
  'York',
];

const initialOffices = ['London', 'Manchester', 'Hampshire'];

const officeDetails: Record<string, { name: string; address: string; phone: string }> = {
  London: {
    name: 'London',
    address: 'Arch 4, 1 Crucifix Lane, SE1 3JW',
    phone: '020 8050 6312',
  },
  Manchester: {
    name: 'Greater Manchester',
    address: 'Neo Building, 9 Charlotte Street, M1 4ET',
    phone: '0161 399 8575',
  },
  Hampshire: {
    name: 'Hampshire & Isle of Wight',
    address: 'Cell 4, 194 Victory Gate Lodge, The Hard, Charles Dickens, Portsmouth, PO1 3PU',
    phone: '02393 553506',
  },
};

export const seedLocations = [...englishCities, 'Hampshire'].map((name) => {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const officeIndex = initialOffices.indexOf(name);
  const details = officeDetails[name];
  return {
    _id: `location-${slug}`,
    _type: 'location',
    ...(details || { name }),
    slug: { _type: 'slug', current: slug },
    active: officeIndex !== -1,
    isHeadOffice: name === 'London',
    sortOrder: officeIndex === -1 ? 1000 : officeIndex,
  };
});
