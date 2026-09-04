import { useCallback, useEffect, useState } from 'react'
import type { PlayerStats, Platform, Settings } from '@shared/types'
import SettingsPanel from './components/SettingsPanel'
import StatsCard from './components/StatsCard'

export interface PlayerEntry {
  id: number
  name: string
  platform: Platform
}

type ResultState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; stats: PlayerStats }
  | { status: 'error'; message: string }

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: 'steam', label: 'Steam' },
  { id: 'origin', label: 'EA / Origin' },
  { id: 'psn', label: 'PlayStation' },
  { id: 'xbl', label: 'Xbox' }
]

const initialPlayers: PlayerEntry[] = [
  { id: 1, name: '', platform: 'steam' },
  { id: 2, name: '', platform: 'steam' },
  { id: 3, name: '', platform: 'steam' }
]

export default function App(): JSX.Element {
  const [tab, setTab] = useState<'query' | 'settings'>('query')
  const [settings, setSettings] = useState<Settings>({
    provider: 'trn',
    keys: { trn: '', mozambique: '' }
  })
  const [players, setPlayers] = useState<PlayerEntry[]>(initialPlayers)
  const [results, setResults] = useState<Record<number, ResultState>>({})

  useEffect(() => {
    window.api.getSettings().then(setSettings).catch(() => undefined)
  }, [])

  const updatePlayer = (id: number, patch: Partial<PlayerEntry>): void => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  const runQuery = useCallback(
    async (p: PlayerEntry) => {
      const set = (r: ResultState): void => setResults((prev) => ({ ...prev, [p.id]: r }))
      set({ status: 'loading' })
      try {
        const res = await window.api.fetchStats(settings.provider, p.platform, p.name.trim())
        set(res.ok ? { status: 'done', stats: res.data } : { status: 'error', message: res.error })
      } catch (err) {
        set({ status: 'error', message: err instanceof Error ? err.message : String(err) })
      }
    },
    [settings.provider]
  )

  const query = useCallback(async () => {
    const targets = players.filter((p) => p.name.trim())
    if (targets.length === 0) return
    await Promise.all(targets.map((p) => runQuery(p)))
  }, [players, runQuery])

  const saveSettings = async (s: Settings): Promise<void> => {
    const saved = await window.api.setSettings(s)
    setSettings(saved)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Apex 队友战绩助手</h1>
        <nav className="tabs">
          <button className={tab === 'query' ? 'tab active' : 'tab'} onClick={() => setTab('query')}>
            查询
          </button>
          <button
            className={tab === 'settings' ? 'tab active' : 'tab'}
            onClick={() => setTab('settings')}
          >
            设置
          </button>
        </nav>
      </header>

      {tab === 'query' ? (
        <main className="query">
          <section className="player-list">
            {players.map((p) => (
              <div className="player-row" key={p.id}>
                <span className="player-index">队友 {p.id}</span>
                <input
                  value={p.name}
                  placeholder="游戏昵称"
                  onChange={(e) => updatePlayer(p.id, { name: e.target.value })}
                />
                <select
                  value={p.platform}
                  onChange={(e) => updatePlayer(p.id, { platform: e.target.value as Platform })}
                >
                  {PLATFORMS.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </section>

          <button className="primary" onClick={query}>
            查询队友战绩
          </button>

          <section className="results">
            {players.map((p) => {
              const r = results[p.id]
              if (!r || r.status === 'idle') return null
              if (r.status === 'loading') {
                return (
                  <div className="card muted" key={p.id}>
                    查询 {p.name} 中…
                  </div>
                )
              }
              if (r.status === 'error') {
                return (
                  <div className="card error" key={p.id}>
                    <div>
                      <b>{p.name}</b>：{r.message}
                    </div>
                    <button className="retry" onClick={() => runQuery(p)}>
                      重试
                    </button>
                  </div>
                )
              }
              return <StatsCard key={p.id} stats={r.stats} />
            })}
          </section>
        </main>
      ) : (
        <SettingsPanel settings={settings} onSave={saveSettings} />
      )}

      <footer className="app-footer">
        仅通过公开 API 读取战绩 · 不注入、不读内存 · 与 EA / Respawn 无关
      </footer>
    </div>
  )
}
