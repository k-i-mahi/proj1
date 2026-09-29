/* Realistic demo content, set in Khulna, Bangladesh. */

export const CATEGORIES = [
  {
    name: 'Roads & Potholes',
    icon: 'construction',
    color: '#f97316',
    description: 'Damaged roads, potholes, broken footpaths',
  },
  {
    name: 'Streetlights',
    icon: 'lamp',
    color: '#eab308',
    description: 'Broken or missing streetlights',
  },
  {
    name: 'Waste & Sanitation',
    icon: 'trash-2',
    color: '#22c55e',
    description: 'Garbage collection, dumping, public toilets',
  },
  {
    name: 'Water & Drainage',
    icon: 'droplets',
    color: '#0ea5e9',
    description: 'Waterlogging, blocked drains, leaking pipes',
  },
  {
    name: 'Electricity',
    icon: 'zap',
    color: '#a855f7',
    description: 'Exposed wires, damaged poles, transformer issues',
  },
  {
    name: 'Traffic & Transport',
    icon: 'traffic-cone',
    color: '#ef4444',
    description: 'Signals, illegal parking, bus stops',
  },
  {
    name: 'Public Safety',
    icon: 'shield-alert',
    color: '#e11d48',
    description: 'Hazards and unsafe public spaces',
  },
  {
    name: 'Parks & Public Spaces',
    icon: 'trees',
    color: '#14b8a6',
    description: 'Parks, playgrounds and public furniture',
  },
] as const;

export const AREAS = [
  { name: 'KUET Campus, Fulbarigate', lat: 22.8995, lng: 89.5021 },
  { name: 'Fulbarigate', lat: 22.8918, lng: 89.5084 },
  { name: 'Daulatpur', lat: 22.8712, lng: 89.5176 },
  { name: 'Khalishpur', lat: 22.8605, lng: 89.5345 },
  { name: 'Boyra', lat: 22.8321, lng: 89.5412 },
  { name: 'Gollamari', lat: 22.8108, lng: 89.5409 },
  { name: 'Sonadanga', lat: 22.8195, lng: 89.5496 },
  { name: 'Nirala', lat: 22.8108, lng: 89.5566 },
  { name: 'Shib Bari Mor', lat: 22.8198, lng: 89.5566 },
  { name: 'Royal Mor', lat: 22.8163, lng: 89.5634 },
  { name: 'Tootpara', lat: 22.8105, lng: 89.5652 },
  { name: 'Moylapota', lat: 22.8178, lng: 89.5592 },
  { name: 'Rupsha', lat: 22.8079, lng: 89.5789 },
  { name: 'Labonchora', lat: 22.7905, lng: 89.5617 },
  { name: 'Banargati', lat: 22.8228, lng: 89.5391 },
  { name: 'Khan Jahan Ali Road', lat: 22.8142, lng: 89.5541 },
] as const;

type Template = { title: string; description: string };

export const ISSUE_TEMPLATES: Record<(typeof CATEGORIES)[number]['name'], Template[]> = {
  'Roads & Potholes': [
    {
      title: 'Deep pothole in the middle of the road near {area}',
      description:
        'A pothole about half a metre wide has opened up in the main lane. Rickshaws swerve into oncoming traffic to avoid it, and after rain it fills with water so it is impossible to see. Two motorbikes have already fallen here this week.',
    },
    {
      title: 'Road surface completely broken after drain work at {area}',
      description:
        'The road was dug up for drain work a month ago and never properly repaired. Loose bricks and gravel cover the whole stretch, and it turns into mud whenever it rains.',
    },
    {
      title: 'Footpath slabs missing outside the market in {area}',
      description:
        'Several concrete slabs are missing from the footpath, leaving open gaps over the drain below. It is dangerous for children and elderly people, especially at night.',
    },
    {
      title: 'Speed breaker with no paint or warning sign at {area}',
      description:
        'A new speed breaker was built but it is not painted and there is no sign. Vehicles hit it at full speed; there have been several near-accidents.',
    },
  ],
  Streetlights: [
    {
      title: 'Streetlights out along the whole road at {area}',
      description:
        'None of the streetlights on this stretch have worked for about two weeks. The road is completely dark after 7pm and people, especially students, feel unsafe walking home.',
    },
    {
      title: 'Streetlight flickering all night near {area}',
      description:
        'One streetlight keeps flickering on and off all night. It is distracting for drivers and looks like it may have a wiring fault.',
    },
    {
      title: 'Streetlight pole leaning dangerously at {area}',
      description:
        'A streetlight pole is leaning at an angle after the last storm. It looks like it could fall onto the road or a passing rickshaw.',
    },
  ],
  'Waste & Sanitation': [
    {
      title: 'Garbage not collected for a week at {area}',
      description:
        'The garbage van has not come for over a week. Waste is piling up by the roadside, the smell is terrible and dogs are spreading it across the road.',
    },
    {
      title: 'Illegal dumping on empty plot behind {area}',
      description:
        'People are dumping household and construction waste on the empty plot. It is attracting rats and mosquitoes and some of it is being burned at night.',
    },
    {
      title: 'Public toilet locked and unusable near {area}',
      description:
        'The public toilet near the bus stand has been locked for days. When it is open, there is no water. Shopkeepers and commuters have nowhere to go.',
    },
    {
      title: 'Overflowing waste bin at the bus stop in {area}',
      description:
        'The only bin at the bus stop is overflowing and waste is blowing onto the road. It needs emptying more often or a larger bin.',
    },
  ],
  'Water & Drainage': [
    {
      title: 'Severe waterlogging after every rain at {area}',
      description:
        'Even 30 minutes of rain leaves knee-deep water on this road for hours. The drains seem to be completely blocked. Shops are flooding and people cannot get to work.',
    },
    {
      title: 'Blocked drain overflowing onto the street at {area}',
      description:
        'The roadside drain is blocked with plastic and silt, and dirty water is overflowing onto the street. The smell is very bad and it is a health risk.',
    },
    {
      title: 'Burst water pipe wasting supply water at {area}',
      description:
        'A WASA supply pipe has burst and clean water has been gushing out for two days. Meanwhile, houses nearby have very low water pressure.',
    },
    {
      title: 'Open manhole without cover near {area}',
      description:
        'A manhole cover is missing and the hole is completely open. Someone has put a branch in it as a warning, but it is very dangerous at night.',
    },
  ],
  Electricity: [
    {
      title: 'Exposed live wires hanging low at {area}',
      description:
        'Electric wires are hanging very low over the lane, almost at head height. During rain they spark. This is extremely dangerous for pedestrians.',
    },
    {
      title: 'Transformer making loud noise and sparking at {area}',
      description:
        'The transformer on the corner has been buzzing loudly and sparked twice last night. Residents are worried it could catch fire.',
    },
    {
      title: 'Tangled cable mess on electric pole at {area}',
      description:
        'Internet and TV cables are tangled around the electric pole and some have fallen onto the footpath. It is a tripping hazard and looks unsafe.',
    },
  ],
  'Traffic & Transport': [
    {
      title: 'Traffic signal not working at the {area} intersection',
      description:
        'The traffic signal has been off for days. During rush hour there is a complete jam and it is dangerous for pedestrians crossing.',
    },
    {
      title: 'Illegal parking blocking the road at {area}',
      description:
        'Trucks and easy-bikes park on both sides of the road all day, leaving room for only one vehicle. Ambulances get stuck here.',
    },
    {
      title: 'No zebra crossing near the school at {area}',
      description:
        'Hundreds of students cross this busy road every morning and afternoon, but there is no zebra crossing or traffic warden.',
    },
  ],
  'Public Safety': [
    {
      title: 'Collapsed boundary wall next to the footpath at {area}',
      description:
        'Part of an old boundary wall has collapsed onto the footpath and the rest is leaning outward. People are forced to walk on the road.',
    },
    {
      title: 'Stray dog pack chasing people at night in {area}',
      description:
        'A large group of stray dogs gathers here at night and chases people on bikes and on foot. Several people have been bitten.',
    },
    {
      title: 'Unfenced pond beside the road at {area}',
      description:
        'There is a deep pond right beside the road with no fence or barrier. Children play near it and a vehicle could easily slide in during rain.',
    },
  ],
  'Parks & Public Spaces': [
    {
      title: 'Broken swings and slides in the park at {area}',
      description:
        'Most of the playground equipment is broken, with sharp rusted edges. Children still use it and could be badly hurt.',
    },
    {
      title: 'Park benches damaged and walkway overgrown at {area}',
      description:
        'The benches are broken and the walkway is covered in overgrown grass and weeds. Elderly people who walk here every morning are struggling.',
    },
    {
      title: 'Park lights not working, area unsafe after dark at {area}',
      description:
        'None of the lights inside the park work, so it becomes completely dark after sunset and people avoid it.',
    },
  ],
};

export const COMMENTS = [
  'I pass by here every day, this is getting worse.',
  'Same problem on the next street too.',
  'Thank you for reporting this! My father almost fell here last week.',
  'Any update from the authorities?',
  'I called the ward office about this, they said they will send someone.',
  'Still not fixed as of this morning.',
  'This has been a problem for months, glad someone finally reported it.',
  'Adding a +1, this affects all the students living nearby.',
  'Can confirm, the situation is really bad after rain.',
  'Thanks for the quick response!',
  'Please prioritise this, it is dangerous at night.',
  'Took a look today, it is exactly as described.',
];

export const STAFF_NOTES = [
  'Assigned to the ward engineering team for inspection.',
  'Contractor scheduled for Thursday.',
  'Materials ordered, work will start once they arrive.',
  'Coordinating with WASA since this involves their pipeline.',
  'Site inspected; repair estimate submitted for approval.',
];

export const RESOLUTION_NOTES = [
  'Repair completed by the city engineering team.',
  'Fixed. Thank you to everyone who reported and upvoted.',
  'Crew cleared the area and the issue is resolved.',
  'Replaced the damaged parts; working normally now.',
];

export const RESIDENT_NAMES = [
  'Tanvir Ahmed',
  'Nusrat Jahan',
  'Rafiul Islam',
  'Sadia Rahman',
  'Mehedi Hasan',
  'Farhana Akter',
  'Arif Hossain',
  'Tasnim Chowdhury',
  'Shakil Mahmud',
  'Jannatul Ferdous',
  'Imran Kabir',
  'Mim Sultana',
  'Rakib Hasan',
  'Lamia Siddika',
  'Nafis Iqbal',
  'Sumaiya Islam',
];
