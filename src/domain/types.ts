export type AreaId = string
export type PersonId = string
export type ThreadId = string

export type ThreadType = 'topic' | 'open-loop' | 'commitment'
export type ThreadState = 'active' | 'snoozed' | 'resolved'
export type CommitmentOwner = 'you' | 'them'

/** ISO date string, e.g. "2026-05-31" */
export type ISODate = string

export interface Touch {
  date: ISODate
  note?: string
}

export interface Thread {
  id: ThreadId
  personId: PersonId
  area: AreaId
  type: ThreadType
  title: string
  notes?: string
  owner?: CommitmentOwner // only for type === 'commitment'
  state: ThreadState
  snoozedUntil?: ISODate // only for state === 'snoozed'
  createdAt: ISODate
  touches: Touch[]
}

export interface PicturePoint {
  text: string
  area?: AreaId
}

export interface Person {
  id: PersonId
  name: string
  cadenceDays: number // expected gap between 1:1s
  picture: PicturePoint[]
}

export interface Area {
  id: AreaId
  name: string
  cadenceDays: number // healthy frequency for this kind of conversation
}

export interface AppData {
  people: Person[]
  areas: Area[]
  threads: Thread[]
}
