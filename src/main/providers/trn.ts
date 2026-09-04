import type { PlayerStats, Platform, RankInfo } from '@shared/types'
import { ApiError, num } from './utils'

const BASE = 'https://public-api.tracker.gg/v2/apex/standard/profile'

const platformMap: Record<Platform, string> = {
  steam: 'steam',
  origin: 'origin',
  psn: 'psn',
  xbl: 'xbl'
}

// 按 RP 估算段位（阈值随赛季调整，仅供参考）
function rankFromScore(rp: number): RankInfo {
  const tiers: [number, string][] = [
    [0, 'Rookie'],
    [1000, 'Bronze'],
    [3000, 'Silver'],
    [5400, 'Gold'],
    [8200, 'Platinum'],
    [11400, 'Diamond'],
    [15000, 'Master']
  ]
  let tier = 'Rookie'
  for (const [threshold, name] of tiers) {
    if (rp >= threshold) tier = name
  }
  return { tier, division: '', score: rp }
}

export async function fetchTrn(
  username: string,
  platform: Platform,
  apiKey: string
): Promise<PlayerStats> {
  const url = `${BASE}/${platformMap[platform]}/${encodeURIComponent(username)}`
  const res = await fetch(url, {
    headers: { 'TRN-Api-Key': apiKey, Accept: 'application/json' }
  })

  if (res.status === 404) {
    return notFound('trn', platform, username)
  }
  if (res.status === 401 || res.status === 403) {
    throw new ApiError('TRN API Key 无效或无权限（HTTP ' + res.status + '）', res.status)
  }
  if (res.status === 429) {
    throw new ApiError('TRN 请求过于频繁（429）', res.status)
  }
  if (!res.ok) {
    throw new ApiError('TRN 请求失败（HTTP ' + res.status + '）', res.status)
  }

  const json = (await res.json()) as any
  if (json.errors && json.errors.length > 0) {
    throw new ApiError('TRN: ' + (json.errors[0].message || '查询失败'))
  }
  return parseTrn(json.data, platform, username)
}

function parseTrn(data: any, platform: Platform, username: string): PlayerStats {
  const segments: any[] = data?.segments ?? []
  const overview = segments.find((s) => s.type === 'overview')
  const legendSegs = segments.filter((s) => s.type === 'legend')

  const stat = (seg: any, key: string): number | undefined => num(seg?.stats?.[key])

  const level = stat(overview, 'level')
  const kills = stat(overview, 'kills')
  const deaths = stat(overview, 'deaths')
  const damage = stat(overview, 'damage')
  const matches = stat(overview, 'matchesPlayed') ?? stat(overview, 'gamesPlayed')
  const wins = stat(overview, 'wins')
  const kdStat = stat(overview, 'kd')

  let rankScore = stat(overview, 'rankScore')
  if (rankScore == null) {
    for (const seg of segments) {
      const s = stat(seg, 'rankScore')
      if (s != null) {
        rankScore = s
        break
      }
    }
  }

  const kd =
    kdStat ?? (kills != null && deaths != null && deaths > 0 ? kills / deaths : 0)

  const legends = legendSegs
    .map((seg) => ({
      name: seg?.metadata?.name ?? '未知',
      kills: stat(seg, 'kills') ?? 0,
      damage: stat(seg, 'damage') ?? 0
    }))
    .sort((a, b) => b.kills - a.kills)
    .slice(0, 8)

  const privateProfile = segments.length === 0

  return {
    provider: 'trn',
    platform,
    username,
    uid: data?.platformInfo?.platformUserId ?? '',
    avatarUrl: data?.platformInfo?.avatarUrl ?? '',
    level: level ?? 0,
    rank: rankScore != null ? rankFromScore(rankScore) : null,
    overview:
      kills != null
        ? {
            kills,
            deaths: deaths ?? 0,
            kd,
            damage: damage ?? 0,
            matches: matches ?? 0,
            wins: wins ?? 0
          }
        : null,
    legends,
    privateProfile
  }
}

function notFound(provider: 'trn', platform: Platform, username: string): PlayerStats {
  return {
    provider,
    platform,
    username,
    uid: '',
    avatarUrl: '',
    level: 0,
    rank: null,
    overview: null,
    legends: [],
    privateProfile: true
  }
}
