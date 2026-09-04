import { useState } from 'react'
import type { ProviderId, Settings } from '@shared/types'

interface Props {
  settings: Settings
  onSave: (s: Settings) => Promise<void>
}

export default function SettingsPanel({ settings, onSave }: Props): JSX.Element {
  const [provider, setProvider] = useState<ProviderId>(settings.provider)
  const [trn, setTrn] = useState(settings.keys.trn)
  const [moz, setMoz] = useState(settings.keys.mozambique)
  const [saved, setSaved] = useState(false)

  async function save(): Promise<void> {
    await onSave({ provider, keys: { trn, mozambique: moz } })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  return (
    <main className="settings">
      <section className="card">
        <div className="section-title">数据源</div>
        <label className="radio-row">
          <input
            type="radio"
            name="provider"
            checked={provider === 'trn'}
            onChange={() => setProvider('trn')}
          />
          <div>
            <b>Tracker Network（推荐）</b>
            <div className="hint">官方文档、免费稳定。Key 申请：tracker.gg/developers</div>
          </div>
        </label>
        <label className="radio-row">
          <input
            type="radio"
            name="provider"
            checked={provider === 'mozambique'}
            onChange={() => setProvider('mozambique')}
          />
          <div>
            <b>Apex Legends Status API</b>
            <div className="hint">数据更全（战绩/比赛/地图）。Key 申请：apexlegendsapi.com 的 My API Access</div>
          </div>
        </label>
      </section>

      <section className="card">
        <div className="section-title">API Key</div>
        <label className="field">
          <span>Tracker Network Key</span>
          <input
            type="password"
            value={trn}
            placeholder="TRN-Api-Key"
            onChange={(e) => setTrn(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Apex Legends Status Key</span>
          <input
            type="password"
            value={moz}
            placeholder="auth key"
            onChange={(e) => setMoz(e.target.value)}
          />
        </label>
        <p className="hint field-hint">支持多个 Key：用逗号、换行或分号分隔；某个 Key 失效 / 限流时自动切换下一个。</p>
        <button className="primary" onClick={save}>
          {saved ? '已保存 ✓' : '保存设置'}
        </button>
      </section>

      <p className="hint note">API Key 仅保存在本机，只发送给对应的数据源官网。</p>
    </main>
  )
}
