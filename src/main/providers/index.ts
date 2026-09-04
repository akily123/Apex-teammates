import type { PlayerStats, Platform, ProviderId } from '@shared/types'
import { fetchTrn } from './trn'
import { fetchMozambique } from './mozambique'
import { ApiError, splitKeys, withRetry } from './utils'

export async function fetchStats(
  provider: ProviderId,
  username: string,
  platform: Platform,
  apiKey: string
): Promise<PlayerStats> {
  const keys = splitKeys(apiKey)
  if (keys.length === 0) {
    throw new Error('请先在「设置」里填写对应数据源的 API Key')
  }

  const fetcher = provider === 'trn' ? fetchTrn : fetchMozambique

  let lastError: unknown
  for (const key of keys) {
    try {
      return await withRetry(() => fetcher(username, platform, key))
    } catch (err) {
      lastError = err
      // key 无效 / 无权限 / 限流 → 自动切换到下一个 key；其他错误（404 已返回、网络等）直接抛出
      if (err instanceof ApiError && (err.status === 401 || err.status === 403 || err.status === 429)) {
        continue
      }
      throw err
    }
  }
  throw lastError ?? new Error('所有 API Key 均失败')
}
