// Hero Voice — OpenAI TTS (nova) via /api/hero-voice with browser fallback.
// Two guards prevent overlap:
//   isCurrentlySpeaking — audio is currently playing
//   isFetchingTTS      — we've called the proxy and are awaiting its response
// While either is true, a new heroSpeak() only enqueues; processQueue() will
// pick it up after the current utterance finishes.
let currentAudio = null
let messageQueue = []
let isCurrentlySpeaking = false
let isFetchingTTS = false

export function heroSpeak(text, onStart, onEnd) {
  if (typeof window === 'undefined') return
  messageQueue.push({ text, onStart, onEnd })
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

  const { text, onStart, onEnd } = messageQueue.shift()

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
      body: JSON.stringify({ text: cleanText }),
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
        // Autoplay blocked or playback error — fall through to browser TTS.
        URL.revokeObjectURL(url)
        currentAudio = null
        isCurrentlySpeaking = false
        await fallbackToBrowserTTS(cleanText, onEnd)
        return
      }
      return // success — onended will advance the queue.
    }
    // res.ok === false (e.g. 503 no key) — fall through to browser TTS below.
  } catch {
    // Network error / abort — fall through to browser TTS below.
  }

  // 2. OpenAI failed or unavailable — use browser TTS.
  isFetchingTTS = false
  await fallbackToBrowserTTS(cleanText, onEnd)
}

async function fallbackToBrowserTTS(cleanText, onEnd) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    isCurrentlySpeaking = false
    onEnd && onEnd()
    setTimeout(() => processQueue(), 200)
    return
  }

  isCurrentlySpeaking = true

  // Cancel any leftover browser speech before starting a new utterance.
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(cleanText)
  utterance.rate = 0.85
  utterance.pitch = 1.1
  utterance.volume = 1.0

  const voices = window.speechSynthesis.getVoices()
  const preferred = voices.find(v =>
    v.name.includes('Samantha') ||
    v.name.includes('Karen') ||
    v.name.includes('Google UK Female') ||
    (v.lang.startsWith('en') && v.localService)
  ) || voices.find(v => v.lang.startsWith('en'))
  if (preferred) utterance.voice = preferred

  utterance.onend = () => {
    isCurrentlySpeaking = false
    onEnd && onEnd()
    setTimeout(() => processQueue(), 300)
  }
  utterance.onerror = () => {
    isCurrentlySpeaking = false
    onEnd && onEnd()
    setTimeout(() => processQueue(), 300)
  }

  window.speechSynthesis.speak(utterance)
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
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}

export function heroClearQueue() {
  messageQueue = []
}

export function heroIsSpeaking() {
  if (typeof window === 'undefined') return false
  return isCurrentlySpeaking || isFetchingTTS
}
