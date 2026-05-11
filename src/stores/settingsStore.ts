import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

type StoredSettings = {
  soundEnabled?: boolean
  nickname?: string
}

const STORAGE_KEY = 'bigTwoSettings'

function readStored(): StoredSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed as StoredSettings
    return {}
  } catch {
    return {}
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const stored = readStored()
  const soundEnabled = ref<boolean>(stored.soundEnabled ?? true)
  const nickname = ref<string>(stored.nickname ?? '')

  watch([soundEnabled, nickname], () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ soundEnabled: soundEnabled.value, nickname: nickname.value }),
      )
    } catch {
      // best-effort; ignore quota or private-mode errors
    }
  })

  return { soundEnabled, nickname }
})
