import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import type { Settings } from '@shared/types'

const defaultSettings: Settings = {
  provider: 'trn',
  keys: { trn: '', mozambique: '' }
}

function configPath(): string {
  return join(app.getPath('userData'), 'config.json')
}

export function loadSettings(): Settings {
  try {
    if (existsSync(configPath())) {
      const raw = JSON.parse(readFileSync(configPath(), 'utf-8'))
      return {
        provider: raw.provider ?? defaultSettings.provider,
        keys: { ...defaultSettings.keys, ...(raw.keys ?? {}) }
      }
    }
  } catch {
    // 配置损坏时回退到默认值
  }
  return defaultSettings
}

export function saveSettings(settings: Settings): void {
  mkdirSync(app.getPath('userData'), { recursive: true })
  writeFileSync(configPath(), JSON.stringify(settings, null, 2), 'utf-8')
}
