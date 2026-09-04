import type { FetchResult, Platform, ProviderId, Settings } from '@shared/types'

declare global {
  interface Window {
    api: {
      getSettings: () => Promise<Settings>
      setSettings: (settings: Settings) => Promise<Settings>
      fetchStats: (
        provider: ProviderId,
        platform: Platform,
        username: string
      ) => Promise<FetchResult>
    }
  }
}

export {}
