import type { AppData } from '../domain/types'

export const DEFAULT_AREAS = [
  { id: 'career', name: 'Career & growth', cadenceDays: 28 },
  { id: 'wellbeing', name: 'Wellbeing & workload', cadenceDays: 7 },
  { id: 'feedback', name: 'Performance & feedback', cadenceDays: 21 },
  { id: 'goals', name: 'Goals & priorities', cadenceDays: 14 },
  { id: 'team', name: 'Team & relationships', cadenceDays: 21 },
  { id: 'recognition', name: 'Recognition', cadenceDays: 28 },
]

export function seedData(): AppData {
  return {
    areas: DEFAULT_AREAS,
    people: [
      {
        id: 'alex', name: 'Alex', cadenceDays: 7,
        picture: [
          { text: 'Aiming for the staff engineer path', area: 'career' },
          { text: 'Wants to mentor a junior', area: 'career' },
          { text: 'History of overloading on infra work', area: 'wellbeing' },
        ],
      },
      { id: 'priya', name: 'Priya', cadenceDays: 7, picture: [
        { text: 'New to the team, ramping up', area: 'goals' },
      ] },
      { id: 'sam', name: 'Sam', cadenceDays: 14, picture: [] },
    ],
    threads: [
      {
        id: 'alex-promo', personId: 'alex', area: 'career', type: 'open-loop',
        title: 'Promo timeline check-in', state: 'active',
        createdAt: '2026-03-01', touches: [{ date: '2026-04-10' }],
      },
      {
        id: 'alex-infra', personId: 'alex', area: 'wellbeing', type: 'open-loop',
        title: 'Still feeling stretched on infra?', state: 'active',
        createdAt: '2026-05-01', touches: [{ date: '2026-05-17' }],
      },
      {
        id: 'alex-rubric', personId: 'alex', area: 'career', type: 'commitment',
        owner: 'you', title: 'Share the promo rubric', state: 'active',
        createdAt: '2026-05-17', touches: [],
      },
      {
        id: 'alex-oncall', personId: 'alex', area: 'wellbeing', type: 'topic',
        title: 'Offload on-call rotation', state: 'resolved',
        createdAt: '2026-04-01', touches: [{ date: '2026-04-10' }, { date: '2026-04-24' }],
      },
      {
        id: 'priya-ramp', personId: 'priya', area: 'goals', type: 'topic',
        title: 'First 90 days goals', state: 'active',
        createdAt: '2026-05-20', touches: [{ date: '2026-05-25' }],
      },
    ],
  }
}
