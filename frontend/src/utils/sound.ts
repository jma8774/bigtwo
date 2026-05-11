import cardPlayUrl from '@/assets/sounds/card-play.wav'
import yourTurnUrl from '@/assets/sounds/your-turn.wav'
import { useSettingsStore } from '@/stores/settingsStore'

export type SoundName = 'cardPlay' | 'yourTurn'

const URLS: Record<SoundName, string> = {
  cardPlay: cardPlayUrl,
  yourTurn: yourTurnUrl,
}

const cache = new Map<SoundName, HTMLAudioElement>()

function getAudio(name: SoundName): HTMLAudioElement {
  let audio = cache.get(name)
  if (!audio) {
    audio = new Audio(URLS[name])
    audio.preload = 'auto'
    cache.set(name, audio)
  }
  return audio
}

export function playSound(name: SoundName): void {
  const settings = useSettingsStore()
  if (!settings.soundEnabled) return
  const audio = getAudio(name)
  audio.currentTime = 0
  void audio.play().catch(() => {
    // Browsers may block autoplay before user gesture — silent failure is fine.
  })
}
