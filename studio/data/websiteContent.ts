export const publicContacts = {
  _id: 'public-contacts', _type: 'siteSettings',
  generalEmail: 'hello@changehospitality.co.uk', recruitmentEmail: 'info@changehospitality.co.uk',
  franchisingEmail: 'info@changehospitality.co.uk', timesheetsEmail: 'timesheets@changehospitality.co.uk', phone: '020 8050 6312',
  socialLinks: [
    { _key: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/company/change-hospitality/' },
    { _key: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/changehospitality/' },
  ],
};

export const policies = [
  { label: 'Data Protection', href: 'https://drive.google.com/file/d/1F0XXLU-BIkhUMy5drgsjA6yOwSmNWHju/view?usp=drive_link' },
  { label: 'Environmental', href: 'https://drive.google.com/file/d/1q8Ebm8oPestODG0Wo6NEcT85vzSmzYym/view?usp=drive_link' },
  { label: 'Equality', href: 'https://drive.google.com/file/d/1h2-kKHuK2fpHKKX6FDgTvyOr7zTuDvsi/view?usp=drive_link' },
  { label: 'Modern Day Slavery', href: 'https://drive.google.com/file/d/1EoBwxBNnnQ9nZKmHgmhN93OCIwDQUdvP/view?usp=drive_link' },
].map((policy, index) => ({ ...policy, _id: `policy-${index + 1}`, _type: 'policy', sortOrder: index, visible: true }));

export const namedClients = [
  { name: 'Searcys', key: 'searcys' }, { name: 'Tate', key: 'tate' }, { name: 'Tobacco Dock', key: 'tobacco-dock' },
  { name: 'Royal Bank of Canada', key: 'rbc' }, { name: 'Four Seasons', key: 'four-seasons' },
];
export const clientTestimonials = [
  { name: 'Laura Maddams', role: 'Head of Talent and Development', quote: "The team at Change are a pure joy to work with - responsive, proactive, and genuinely invested in Searcy's success. I can say with confidence: if you're in hospitality and you're not working with Change, you're missing out. Five stars isn't enough." },
  { name: 'Ali Gannage-Stewart', role: 'Director, Events and Corporate Membership', quote: "Change provided a highly professional service, carefully listening to our brief and delivering exactly what we needed by introducing us to Chloe, who's already excelling in our Catering team as a Hospitality Manager." },
  { name: 'Charlotte Smart', role: 'Commercial Director', quote: "Following two successful hires via Change Hospitality in the last 18months, Charley at Change remains our 'go to' for all our new recruitment needs. We've found a recruitment partner in Change who have really taken the time to understand our business and in turn the experience, skills and characteristics that are likely to result in the best pairings." },
  { name: 'Tara Dempsey', role: 'Catering Manager', quote: "You are always so responsive, especially with last minute bookings and special requests. You constantly provide amazing staff even when under pressure. Your reliability and professionalism has made my job be easier, it's been so great to build such a strong relationship and I appreciate all of your hard work." },
  { name: 'Robert Siddu', role: 'Breakfast Manager', quote: "Working with Change Hospitality has been a life saver on countless occasions. They're prompt responses, availability at short notice and most of all, the level of professionalism and care from each individual they've sent us has been unparalleled." },
].map((quote, index) => ({ ...quote, _id: `testimonial-client-${index + 1}`, _type: 'testimonial', audience: 'client', client: { _type: 'reference', _ref: `client-${namedClients[index].key}` }, sortOrder: index, visible: true }));

export const candidateTestimonials = [
  { name: 'C\u00e9line', quote: "I've genuinely loved my time with the agency and have always appreciated how supportive and well-organised everything has been. I've learned a lot through the shifts and it's been a pleasure working with both the team and the venues." },
  { name: 'Victor', quote: 'Change has been excellent in providing me with the exact level of work I require. They have a good spread of clients which means the work assignments can get you into some wonderful places: top London hotels, premiership football clubs, west end theatres, street food pop-ups, festivals, city offices.' },
  { name: 'Sami', quote: 'I had a great experience with Change Hospitality Agency. The team is professional, supportive, and always responsive to any questions or concerns. They provide excellent opportunities and genuinely care about their staff.' },
  { name: 'Jack', quote: "I have been with change for a bit now. A lot of agencies don't look after their chefs. They just send them out to not nice places and make money of our backs and our hard work. BUT NOT change. They check up on us to make sure we are happy, any questions you have for them they reply within minutes." },
  { name: 'Robenpreet', quote: 'Everyone in the agency is very kind and helpful. I would highly recommend Change Hospitality because they provide good shifts at good locations. The team is very supportive - they help you with everything, provide shifts regularly, and are always understanding if you face any problems.' },
].map((quote, index) => ({ ...quote, _id: `testimonial-candidate-${index + 1}`, _type: 'testimonial', audience: 'candidate', sortOrder: index, visible: true }));

export const temporaryGuidance = {
  _id: 'temporary-work', _type: 'temporaryWork',
  benefits: [
    { title: 'Be in charge of your work', text: 'Casual work with us gives you full autonomy over your hours and where you work. Take the shifts that suit you, in the places you want to be.' },
    { title: 'Shifts turn into careers', text: "Casual work can be a foot in the door. Plenty of our candidates are taken on permanently by venues that loved having them, and if that's where you want to go, we'll help you get there." },
    { title: 'A mix of venues', text: "Events, restaurants, luxury venues, stadiums and more. There's genuine variety here, so no two weeks have to look the same." },
    { title: 'Work across the region', text: "Our offices are spread across London, Manchester and Hampshire, so there's work for wherever you are." },
    { title: 'Easy to book, paid on time', text: 'Book your shifts through our app, and get paid every Friday.' },
    { title: 'Extra support when you need it', text: "For our front-of-house team, we run training days in our office to build skills and confidence. Whether you're just starting out or levelling up, you won't be left to figure it out alone." },
  ].map((item, index) => ({ ...item, _key: `benefit-${index + 1}` })),
  faqs: [
    { question: 'How do I join your temp team?', paragraphs: ["Once you apply, our recruitment team will get in touch with you. You'll be invited to meet us in our office or join a quick video call for an assessment. Once you pass, you're part of the team."] },
    { question: 'How soon after applying can I start working?', paragraphs: ['Once you complete the registration process, you can start working straight away.'] },
    { question: "I don't live in the UK. Can I still apply for one of your positions?", paragraphs: ["If you are applying for one of our UK roles, you will need to have a UK address. We will also need to see your Right to Work in the UK before you can join us."] },
    { question: 'Do I need hospitality experience?', paragraphs: ["It depends on the role. For front-of-house work, the right attitude matters most, and we can help with the rest. Back-of-house and kitchen roles usually call for more hands-on experience.", "Some roles also require specific certifications, such as food hygiene or health-and-safety qualifications, depending on where and what you'll be working. Whatever the role needs, your consultant will talk you through it and point you in the right direction."] },
    { question: 'What kind of roles and venues can I work in?', paragraphs: ["On the front-of-house side, our roles include waiting staff, bar staff, baristas, hosts, event staff and supervisors. Behind the scenes, we cover kitchen roles from kitchen porters to chefs of every level.", "Our shifts span events, contract catering, pubs, restaurants, hotels, private venues, schools, hospitals and stadiums. Depending on what you like, there's work here to suit you."] },
    { question: 'If there is an issue with my app, what do I do?', paragraphs: ['Our team will help.'], contact: 'team' },
    { question: "If I can't submit my hours on the app, what do I do?", paragraphs: ['Email our timesheet support team.'], contact: 'timesheets' },
  ].map((item, index) => ({ ...item, _key: `faq-${index + 1}` })),
};

export const indexedClients = Array.from({ length: 42 }, (_, index) => ({
  _id: `client-logo-${String(index + 1).padStart(2, '0')}`, _type: 'client', name: `Client ${String(index + 1).padStart(2, '0')}`,
  sortOrder: index, marquee: true, visible: true, file: `public/client-logos/logo-scroll/${index + 1}.png`,
}));