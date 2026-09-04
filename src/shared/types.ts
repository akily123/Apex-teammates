export type Platform = 'steam' | 'origin' | 'psn' | 'xbl'
export type ProviderId = 'trn' | 'mozambique'

export interface RankInfo {
  tier: string
  division: string
  score: number
}

export interface OverviewStats {
  kills: number
  deaths: number
  kd: number
  damage: number
  matches: number
  wins: number
}

export interface LegendStat {
  name: string
  kills: number
  damage: number
}

export interface PlayerStats {
  provider: ProviderId
  platform: Platform
  username: string
  uid: string
  avatarUrl: string
  level: number
  rank: RankInfo | null
  overview: OverviewStats | null
  legends: LegendStat[]
  privateProfile: boolean
}

export interface Settings {
  provider: ProviderId
  keys: {
    trn: string
    mozambique: string
  }
}

export type FetchResult =
  | { ok: true; data: PlayerStats }
  | { ok: false; error: string }
