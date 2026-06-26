// Hero Voice — OpenAI TTS (gpt-4o-mini-tts, Australian-accented) via
// /api/hero-voice. NO browser-TTS fallback: if OpenAI is unavailable, plan-gated,
// or playback fails, Hero is simply silent (we never use the robotic on-device
// Web Speech voice).
// Two guards prevent overlap:
//   isCurrentlySpeaking — audio is currently playing
//   isFetchingTTS      — we've called the proxy and are awaiting its response
// While either is true, a new heroSpeak() only enqueues; processQueue() will
// pick it up after the current utterance finishes.
let currentAudio = null
let messageQueue = []
let isCurrentlySpeaking = false
let isFetchingTTS = false

export function heroSpeak(text, onStart, onEnd, studentId = null) {
  if (typeof window === 'undefined') return
  messageQueue.push({ text, onStart, onEnd, studentId })
  if (!isCurrentlySpeaking && !isFetchingTTS) {
    processQueue()
  }
}

async function processQueue() {
  if (messageQueue.length === 0) {
    isCurrentlySpeaking = false
    isFetchingTTS = false
    return
  }

  const { text, onStart, onEnd, studentId } = messageQueue.shift()

  const cleanText = text
    .replace(/[✦🤖🎯💪🎉😅🔥⚡🏆👋]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleanText) {
    onEnd && onEnd()
    setTimeout(() => processQueue(), 0)
    return
  }

  onStart && onStart()

  // 1. Try OpenAI TTS through the proxy. The fetching flag blocks any other
  // heroSpeak call from kicking off browser TTS in parallel.
  isFetchingTTS = true

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const res = await fetch('/api/hero-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText, studentId }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (res.ok) {
      // Hand off from "fetching" to "speaking" before play() so neither flag
      // is false during the transition.
      isCurrentlySpeaking = true
      isFetchingTTS = false

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      currentAudio = new Audio(url)
      currentAudio.onended = () => {
        URL.revokeObjectURL(url)
        currentAudio = null
        isCurrentlySpeaking = false
        onEnd && onEnd()
        setTimeout(() => processQueue(), 300)
      }
      currentAudio.onerror = () => {
        URL.revokeObjectURL(url)
        currentAudio = null
        isCurrentlySpeaking = false
        onEnd && onEnd()
        setTimeout(() => processQueue(), 300)
      }
      try {
        await currentAudio.play()
      } catch {
        // Autoplay blocked or playback error — stay silent, advance the queue.
        URL.revokeObjectURL(url)
        currentAudio = null
        isCurrentlySpeaking = false
        onEnd && onEnd()
        setTimeout(() => processQueue(), 200)
      }
      return // success — onended will advance the queue.
    }
    // Any non-OK (403 plan-gated, 503 no key, etc.) — stay silent.
  } catch {
    // Network error / abort — stay silent.
  }

  // OpenAI failed or unavailable — no fallback; advance the queue silently.
  isFetchingTTS = false
  isCurrentlySpeaking = false
  onEnd && onEnd()
  setTimeout(() => processQueue(), 0)
}

export function heroStop() {
  messageQueue = []
  isCurrentlySpeaking = false
  isFetchingTTS = false
  if (currentAudio) {
    try { currentAudio.pause() } catch {}
    try { currentAudio.src = '' } catch {}
    currentAudio = null
  }
}

export function heroClearQueue() {
  messageQueue = []
}

export function heroIsSpeaking() {
  if (typeof window === 'undefined') return false
  return isCurrentlySpeaking || isFetchingTTS
}
