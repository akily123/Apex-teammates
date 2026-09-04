import { writeFileSync } from 'fs'
import { join } from 'path'
import type { PlayerStats, Platform } from '@shared/types'
import { ApiError, num } from './utils'

// 当前官方基地址（Apex API Portal，apexlegendsapi.com）
const BASE = 'https://api.apexlegendsstatus.com/bridge'

const platformMap: Record<Platform, string> = {
  steam: 'PC',
  origin: 'PC',
  psn: 'PS4',
  xbl: 'X1'
}

// 对局数的多种可能字段名
const MATCH_KEYS = ['games_played', 'matches', 'matches_played', 'matchcount', 'gamesPlayed']

export async function fetchMozambique(
  username: string,
  platform: Platform,
  apiKey: string
): Promise<PlayerStats> {
  const url =
    `${BASE}?auth=${encodeURIComponent(apiKey)}` +
    `&player=${encodeURIComponent(username)}&platform=${platformMap[platform]}`

  // 注意：此 API 用 Apache 内容协商，Accept 必须是 */*（或省略），
  // 写成 application/json 会被服务器回 406 Not Acceptable。
  const res = await fetch(url, { headers: { Accept: '*/*' } })

  if (res.status === 404) {
    return notFound(platform, username)
  }
  if (res.status === 403) {
    throw new ApiError('Apex API Key 无效或无权限（HTTP 403，请检查 key）', 403)
  }
  if (res.status === 429) {
    throw new ApiError('Apex API 请求过于频繁（429）', 429)
  }
  if (!res.ok) {
    throw new ApiError('Apex API 请求失败（HTTP ' + res.status + '）', res.status)
  }

  const json = (await res.json()) as any

  if (process.env.APEX_DEBUG === '1') {
    try {
      writeFileSync(join(process.cwd(), 'apex-debug.json'), JSON.stringify(json, null, 2), 'utf-8')
    } catch {
      // 调试文件写入失败时忽略
    }
  }

  if (json.Error) {
    if (/not found|does not exist|no player|couldn/i.test(String(json.Error))) {
      return notFound(platform, username)
    }
    throw new ApiError('Apex API: ' + json.Error)
  }
  return parseMozambique(json, platform, username)
}

function parseMozambique(json: any, platform: Platform, username: string): PlayerStats {
  const global = json.global ?? {}
  const legendMap = getLegendDataMap(json)

  const level = num(global.level)
  const kills = pickStat(json, legendMap, ['kills'])
  const deaths = pickStat(json, legendMap, ['deaths'])
  const damage = pickStat(json, legendMap, ['damage'])
  const wins = pickStat(json, legendMap, ['wins'])
  const matches = pickStat(json, legendMap, MATCH_KEYS)

  const kd = kills != null && deaths != null && deaths > 0 ? kills / deaths : undefined

  const rank =
    global.rank && global.rank.rankName
      ? {
          tier: String(global.rank.rankName),
          division: String(global.rank.rankDiv ?? ''),
          score: num(global.rank.rankScore) ?? 0
        }
      : null

  // 常用英雄：过滤掉 "Global"（它是聚合占位，不是可玩英雄），按击杀排序
  const legends = Object.entries(legendMap)
    .filter(([name]) => name.trim().toLowerCase() !== 'global')
    .map(([name, data]) => ({
      name,
      kills: statFromData(data, ['kills']) ?? 0,
      damage: statFromData(data, ['damage']) ?? 0
    }))
    .sort((a, b) => b.kills - a.kills)
    .slice(0, 8)

  const hasAnyData = kills != null || level != null || Object.keys(legendMap).length > 0

  return {
    provider: 'mozambique',
    platform,
    username,
    uid: global.uid ?? '',
    avatarUrl: global.avatar ?? '',
    level: level ?? 0,
    rank,
    overview:
      kills != null
        ? {
            kills,
            deaths: deaths ?? 0,
            kd: kd ?? 0,
            damage: damage ?? 0,
            matches: matches ?? 0,
            wins: wins ?? 0
          }
        : null,
    legends,
    privateProfile: !hasAnyData
  }
}

/** 提取 { 英雄名: data数组 } 映射（兼容 legends.all 为对象或数组） */
function getLegendDataMap(json: any): Record<string, any[]> {
  const out: Record<string, any[]> = {}
  const all = json?.legends?.all
  if (Array.isArray(all)) {
    for (const entry of all) {
      const name = String(entry?.LegendName ?? entry?.name ?? '未知')
      out[name] = entry?.data ?? []
    }
  } else if (all && typeof all === 'object') {
    for (const [name, obj] of Object.entries(all)) {
      out[name] = (obj as any)?.data ?? []
    }
  }
  return out
}

/** 从某个 data 数组里找第一个匹配候选键的统计值（名称或 key，均不区分大小写） */
function statFromData(data: any[], candidates: string[]): number | undefined {
  for (const item of data ?? []) {
    const n = String(item?.name ?? item?.key ?? '')
    for (const cand of candidates) {
      if (n.toLowerCase() === cand.toLowerCase()) {
        const v = num(item?.value)
        if (v != null) return v
      }
    }
  }
  return undefined
}

/** 依次尝试：total → global → "Global" 聚合英雄 → 汇总各英雄，尽可能拿到某项统计 */
function pickStat(
  json: any,
  legendMap: Record<string, any[]>,
  candidates: string[]
): number | undefined {
  const norm = (s: string): string => s.toLowerCase()

  const total = json?.total ?? {}
  for (const cand of candidates) {
    for (const k of Object.keys(total)) {
      if (norm(k) === norm(cand)) {
        const v = num(total[k]?.value ?? total[k])
        if (v != null) return v
      }
    }
  }

  const g = json?.global ?? {}
  for (const cand of candidates) {
    for (const k of Object.keys(g)) {
      if (norm(k) === norm(cand)) {
        const v = num(g[k]?.value ?? g[k])
        if (v != null) return v
      }
    }
  }

  // "Global"（聚合）英雄的 data
  for (const [name, data] of Object.entries(legendMap)) {
    if (norm(name) === 'global') {
      const v = statFromData(data, candidates)
      if (v != null) return v
    }
  }

  // 兜底：汇总各英雄（排除 Global，避免重复计数）
  let sum = 0
  let found = false
  for (const [name, data] of Object.entries(legendMap)) {
    if (norm(name) === 'global') continue
    const v = statFromData(data, candidates)
    if (v != null) {
      sum += v
      found = true
    }
  }
  return found ? sum : undefined
}

function notFound(platform: Platform, username: string): PlayerStats {
  return {
    provider: 'mozambique',
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
