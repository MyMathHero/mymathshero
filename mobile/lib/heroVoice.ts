// Shared Hero voice (OpenAI TTS via /api/hero-voice) for any mobile screen that
// needs Hero to speak — Junior Mode narration, etc. Mirrors the proven path in
// AskHeroSheet: fetch audio via expo/fetch .bytes() (NOT axios — see
// ask-hero-voice-rn-fetch memory), play with expo-audio. One utterance at a time;
// speak() stops any prior playback. NO expo-speech fallback — if OpenAI TTS is
// unavailable or plan-gated, Hero is simply silent (never the robotic device voice).

import * as SecureStore from 'expo-secure-store'
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio'
import { File, Paths } from 'expo-file-system'
import { fetch as expoFetch } from 'expo/fetch'
import { API_URL } from './api'

let player: AudioPlayer | null = null

export async function stopSpeaking(): Promise<void> {
  if (player) {
    try { player.pause() } catch {}
    try { player.release() } catch {}
    player = null
  }
}

// Speak `text` aloud. Resolves when playback finishes (or fails). Strips emoji.
export async function speak(text: string): Promise<void> {
  const clean = String(text || '')
    .replace(/[✦🤖🎯💪🎉😅🔥⚡🏆👋🍎🍌⭐🐶🐱🎈🚗🐟🌸🦋🪙⛰️🚜🏰📏🚀🍕🐵🐠❓✅❌]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!clean) return

  try {
    await stopSpeaking()
    try { await setAudioModeAsync({ playsInSilentMode: true }) } catch {}

    const token = await SecureStore.getItemAsync('auth_token')
    const res = await expoFetch(`${API_URL}/api/hero-voice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Cookie: `mymathshero_token=${token}`, Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ text: clean }),
    })
    if (!res.ok) throw new Error(`hero-voice ${res.status}`)
    const bytes = await res.bytes()
    if (!bytes || bytes.byteLength === 0) throw new Error('empty audio')

    const file = new File(Paths.cache, `hero-${Date.now()}.mp3`)
    try { file.create() } catch {}
    file.write(bytes)

    const p = createAudioPlayer({ uri: file.uri })
    player = p
    p.play()
    await new Promise<void>((resolve) => {
      const sub = p.addListener('playbackStatusUpdate', (status) => {
        if (status?.didJustFinish) { try { sub.remove() } catch {}; resolve() }
      })
    })
    try { p.release() } catch {}
    player = null
    try { file.delete() } catch {}
    return
  } catch {
    // OpenAI TTS unavailable or plan-gated — stay silent (no device-voice fallback).
  }
}
