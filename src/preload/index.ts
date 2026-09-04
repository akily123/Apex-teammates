import { contextBridge, ipcRenderer } from 'electron'
import type { FetchResult, Platform, ProviderId, Settings } from '@shared/types'

const api = {
  getSettings: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
  setSettings: (settings: Settings): Promise<Settings> =>
    ipcRenderer.invoke('settings:set', settings),
  fetchStats: (
    provider: ProviderId,
    platform: Platform,
    username: string
  ): Promise<FetchResult> => ipcRenderer.invoke('stats:fetch', { provider, platform, username })
}

contextBridge.exposeInMainWorld('api', api)
