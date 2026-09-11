import { DemoScenario } from './types';

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'flood_response',
    tag: 'HERO DEMO',
    title: 'FLOOD RESPONSE',
    subtitle: 'Stranded resident during flash flooding',
    badgeColor: 'cyan',
    prompt:
      'My elderly neighbor is stuck near the flooded underpass. The water is rising and their phone is almost dead. I don\'t know exactly how bad the flooding is but someone needs to help them.',
    simulatedContext: 'Heavy precipitation radar (45mm/hr). Urban underpass prone to sudden 2-meter inundation.',
  },
  {
    id: 'medication_conflict',
    tag: 'HEALTHCARE TRIAGE',
    title: 'MEDICATION CONFLICT',
    subtitle: 'Potential medication interaction',
    badgeColor: 'amber',
    prompt:
      'My dad was prescribed Ciprofloxacin for an infection, but he is already on daily Theophylline for severe asthma. He took both this morning and now has severe tremors, heart palpitations (heart rate 118 bpm), and nausea. What should we do?',
    simulatedContext: 'Known CYP1A2 drug interaction alert between fluoroquinolones and methylxanthines.',
  },
  {
    id: 'logistics_disruption',
    tag: 'SUPPLY CHAIN',
    title: 'LOGISTICS DISRUPTION',
    subtitle: 'Critical delivery blocked by disruption',
    badgeColor: 'blue',
    prompt:
      'Critical cold-chain transport truck #402 carrying 400 vials of pediatric insulin is blocked on Highway 9 by a mudslide. Reefer unit battery is down to 3.5 hours of reserve cooling. Need immediate detour and priority reception depot.',
    simulatedContext: 'Mudslide blocking Northbound corridor at Mile Marker 42. Active detour routes available via County Rd 4.',
  },
  {
    id: 'community_food',
    tag: 'HUMANITARIAN AID',
    title: 'COMMUNITY FOOD',
    subtitle: 'Coordinating emergency food distribution',
    badgeColor: 'emerald',
    prompt:
      'The temporary evacuation center at Oak Grove High School just took in 120 displaced storm survivors. We are completely out of infant formula and only have 25 allergen-safe meal packs left for tonight. Volunteer driver ready to pick up supplies.',
    simulatedContext: 'Oak Grove Shelter capacity: 350. Current occupancy: 295. Regional emergency depot located 6km away.',
  },
];
